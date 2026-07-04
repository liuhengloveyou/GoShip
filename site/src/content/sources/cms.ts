import {
  getCmsHttpReleaseTaskById,
  listCmsHttpReleaseTasks,
  getCmsHttpPostById,
  getCmsHttpPostBySlug,
  getCmsHttpPosts,
  createCmsHttpReleaseTask,
  triggerCmsHttpReleaseWebhook,
  updateCmsHttpPostStatus,
  updateCmsHttpReleaseTaskStatus,
} from "./cms-http";
import type { PostStatus, ReleaseStatus, ReleaseTask } from "../domain";

export async function getCmsPosts() {
  return getCmsHttpPosts();
}

export async function getCmsPostBySlug(slug: string) {
  return getCmsHttpPostBySlug(slug);
}

export async function getCmsPostById(postId: string) {
  return getCmsHttpPostById(postId);
}

export async function updateCmsPostStatus(
  postId: string,
  status: PostStatus,
  extraFields?: Record<string, unknown>
) {
  return updateCmsHttpPostStatus(postId, status, extraFields);
}

export async function createCmsReleaseTask(
  postId: string,
  status: "queued" | "running" | "success" | "failed",
  note?: string,
  fields?: Partial<ReleaseTask>
) {
  return createCmsHttpReleaseTask(postId, status, note, fields);
}

export async function triggerCmsRelease(releaseId: string) {
  return triggerCmsHttpReleaseWebhook(releaseId);
}

export async function listCmsReleaseTasks(limit?: number) {
  return listCmsHttpReleaseTasks(limit);
}

export async function getCmsReleaseTaskById(releaseId: string) {
  return getCmsHttpReleaseTaskById(releaseId);
}

export async function updateCmsReleaseTaskStatus(
  releaseId: string,
  status: ReleaseStatus,
  fields?: Partial<ReleaseTask>
) {
  return updateCmsHttpReleaseTaskStatus(releaseId, status, fields);
}
