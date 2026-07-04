import {
  assertPostStatusTransition,
  type ReleaseTask,
  type PostStatus,
  validateSeoMeta,
} from "./domain";
import { CmsError } from "./errors";
import type { BlogPost } from "./types";
import { CONTENT_SOURCE } from "./source";
import {
  createGoPressReleaseTask,
  getGoPressPostById,
  getGoPressPostBySlug,
  getGoPressPosts,
  getGoPressReleaseTaskById,
  listGoPressReleaseTasks,
  triggerGoPressRelease,
  updateGoPressPostStatus,
  updateGoPressReleaseTaskStatus,
} from "./sources/gopress";
import { getLocalPosts } from "./sources/local";
import {
  createCmsReleaseTask,
  getCmsReleaseTaskById,
  getCmsPostById,
  getCmsPostBySlug,
  getCmsPosts,
  listCmsReleaseTasks,
  triggerCmsRelease,
  updateCmsPostStatus,
  updateCmsReleaseTaskStatus,
} from "./sources/cms";

export interface PostQuery {
  status?: PostStatus[];
  includeDraft?: boolean;
}

function matchesQuery(post: BlogPost, query: PostQuery) {
  const status = post.data.status ?? (post.data.draft ? "draft" : "published");
  const includeDraft = query.includeDraft ?? false;

  if (!includeDraft && status !== "published") {
    return false;
  }

  if (query.status && query.status.length > 0) {
    return query.status.includes(status);
  }

  return true;
}

async function loadPosts() {
  if (CONTENT_SOURCE === "cms") return getCmsPosts();
  if (CONTENT_SOURCE === "gopress") return getGoPressPosts();
  return getLocalPosts();
}

export async function getPosts(query: PostQuery = {}) {
  const posts = await loadPosts();
  return posts.filter(post => matchesQuery(post, query));
}

export async function getPostBySlug(slug: string) {
  if (CONTENT_SOURCE === "cms") {
    return getCmsPostBySlug(slug);
  }
  if (CONTENT_SOURCE === "gopress") {
    return getGoPressPostBySlug(slug);
  }

  const posts = await getLocalPosts();
  return posts.find(post => post.slug === slug);
}

export async function publishPost(postId: string, releaseNote?: string) {
  ensureRemoteSource();

  const post = await getRemotePostById(postId);
  if (!post) {
    throw new CmsError("CMS_NOT_FOUND", `Post not found: ${postId}`, { postId });
  }

  validatePrePublish(post);

  await updateRemotePostStatus(post.id, "published", {
    release_note: releaseNote ?? "",
  });

  const release = (await createRemoteReleaseTask(
    post.id,
    "queued",
    releaseNote,
    { operator: "manual" }
  )) as ReleaseTask;

  await updateReleaseStatus(release.id, "running", { stage: "build" });

  try {
    await triggerRemoteRelease(release.id);
    return updateReleaseStatus(release.id, "success", { stage: "completed" });
  } catch (error) {
    await updateReleaseStatus(release.id, "failed", {
      stage: "failed",
      errorCode: "WEBHOOK_TRIGGER_FAILED",
      errorMessage: error instanceof Error ? error.message : "Release trigger failed.",
    });
    throw error;
  }
}

export async function requestRollback(
  targetReleaseId: string,
  note = "manual rollback request"
) {
  ensureRemoteSource();
  const target = await getReleaseTask(targetReleaseId);
  if (!target) {
    throw new CmsError("CMS_NOT_FOUND", `Release not found: ${targetReleaseId}`, {
      targetReleaseId,
    });
  }

  if (!target.postId) {
    throw new CmsError("CMS_VALIDATION_FAILED", "Target release missing postId.", {
      targetReleaseId,
    });
  }

  const rollback = (await createRemoteReleaseTask(
    target.postId,
    "queued",
    note,
    {
      operator: "manual",
      rollbackOfReleaseId: target.id,
    }
  )) as ReleaseTask;

  await updateReleaseStatus(rollback.id, "running", { stage: "deploy" });

  try {
    await triggerRemoteRelease(rollback.id);
    return updateReleaseStatus(rollback.id, "success", { stage: "completed" });
  } catch (error) {
    await updateReleaseStatus(rollback.id, "failed", {
      stage: "failed",
      errorCode: "ROLLBACK_TRIGGER_FAILED",
      errorMessage: error instanceof Error ? error.message : "Rollback trigger failed.",
    });
    throw error;
  }
}

export async function requestReview(postId: string) {
  return updatePostStatus(postId, "in_review");
}

export async function schedulePost(postId: string, scheduledAt: string) {
  return updatePostStatus(postId, "scheduled", {
    scheduled_at: scheduledAt,
  });
}

export async function archivePost(postId: string) {
  return updatePostStatus(postId, "archived");
}

async function updatePostStatus(
  postId: string,
  toStatus: PostStatus,
  extraFields?: Record<string, unknown>
) {
  ensureRemoteSource();

  const post = await getRemotePostById(postId);
  if (!post) {
    throw new CmsError("CMS_NOT_FOUND", `Post not found: ${postId}`, { postId });
  }

  const fromStatus = post.data.status ?? (post.data.draft ? "draft" : "published");
  try {
    assertPostStatusTransition(fromStatus, toStatus);
  } catch (error) {
    throw new CmsError(
      "CMS_INVALID_STATUS_TRANSITION",
      error instanceof Error ? error.message : "Invalid post status transition.",
      { postId, fromStatus, toStatus }
    );
  }

  return updateRemotePostStatus(post.id, toStatus, extraFields);
}

export function validatePrePublish(post: BlogPost) {
  const fromStatus = post.data.status ?? (post.data.draft ? "draft" : "published");
  try {
    assertPostStatusTransition(fromStatus, "published");
  } catch (error) {
    throw new CmsError(
      "CMS_INVALID_STATUS_TRANSITION",
      error instanceof Error ? error.message : "Invalid post status transition.",
      { postId: post.id, fromStatus, toStatus: "published" }
    );
  }

  try {
    validateSeoMeta(post.data.seo ?? {});
  } catch (error) {
    throw new CmsError(
      "CMS_VALIDATION_FAILED",
      error instanceof Error ? error.message : "SEO validation failed.",
      { postId: post.id }
    );
  }

  if (!post.data.title?.trim()) {
    throw new CmsError("CMS_VALIDATION_FAILED", "Post title is required.", {
      postId: post.id,
      field: "title",
    });
  }

  if (!post.data.description?.trim()) {
    throw new CmsError("CMS_VALIDATION_FAILED", "Post description is required.", {
      postId: post.id,
      field: "description",
    });
  }
}

function ensureRemoteSource() {
  if (CONTENT_SOURCE !== "cms" && CONTENT_SOURCE !== "gopress") {
    throw new CmsError(
      "CMS_SOURCE_UNAVAILABLE",
      "This action is only available with CONTENT_SOURCE=cms/gopress.",
      { source: CONTENT_SOURCE }
    );
  }
}

export async function getReleaseTask(releaseId: string) {
  ensureRemoteSource();
  if (CONTENT_SOURCE === "gopress") {
    return getGoPressReleaseTaskById(releaseId);
  }
  return getCmsReleaseTaskById(releaseId);
}

export async function getLatestReleaseTasks(limit = 20) {
  ensureRemoteSource();
  if (CONTENT_SOURCE === "gopress") {
    return listGoPressReleaseTasks(limit);
  }
  return listCmsReleaseTasks(limit);
}

export async function updateReleaseStatus(
  releaseId: string,
  status: "queued" | "running" | "success" | "failed",
  fields?: Partial<ReleaseTask>
) {
  ensureRemoteSource();
  if (CONTENT_SOURCE === "gopress") {
    return updateGoPressReleaseTaskStatus(releaseId, status, fields);
  }
  return updateCmsReleaseTaskStatus(releaseId, status, fields);
}

async function getRemotePostById(postId: string) {
  if (CONTENT_SOURCE === "gopress") {
    return getGoPressPostById(postId);
  }
  return getCmsPostById(postId);
}

async function updateRemotePostStatus(
  postId: string,
  status: PostStatus,
  extraFields?: Record<string, unknown>
) {
  if (CONTENT_SOURCE === "gopress") {
    return updateGoPressPostStatus(postId, status, extraFields);
  }
  return updateCmsPostStatus(postId, status, extraFields);
}

async function createRemoteReleaseTask(
  postId: string,
  status: "queued" | "running" | "success" | "failed",
  note?: string,
  fields?: Partial<ReleaseTask>
) {
  if (CONTENT_SOURCE === "gopress") {
    return createGoPressReleaseTask(postId, status, note, fields);
  }
  return createCmsReleaseTask(postId, status, note, fields);
}

async function triggerRemoteRelease(releaseId: string) {
  if (CONTENT_SOURCE === "gopress") {
    return triggerGoPressRelease(releaseId);
  }
  return triggerCmsRelease(releaseId);
}
