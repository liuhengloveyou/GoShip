import { SITE } from "@/config";
import { isPostStatus, type PostStatus, type ReleaseTask } from "../domain";
import { CmsError } from "../errors";
import type { BlogPost } from "../types";

type GoPressPostRecord = Record<string, unknown> & {
  id: string;
  title?: string;
  slug?: string;
  created?: string;
  updated?: string;
};

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function normalizeSlug(slug: string) {
  return slug.replace(/^\/+|\/+$/g, "");
}

function getField<T>(
  record: Record<string, unknown>,
  ...keys: string[]
): T | undefined {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }
  return undefined;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toDate(value: unknown, fallback: Date) {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function getGoPressConfig() {
  const baseUrl = import.meta.env.GOPRESS_API_BASE ?? import.meta.env.CMS_API_URL;
  const token = import.meta.env.GOPRESS_API_TOKEN;
  if (!baseUrl) {
    throw new CmsError(
      "CMS_CONFIG_MISSING",
      "GOPRESS_API_BASE is required when CONTENT_SOURCE=gopress.",
      { env: "GOPRESS_API_BASE" }
    );
  }
  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    token,
  };
}

async function goPressRequest(path: string, init?: RequestInit) {
  const config = getGoPressConfig();
  const url = new URL(path, `${config.baseUrl}/`);
  const headers = new Headers(init?.headers);
  if (config.token && !headers.has("Authorization")) {
    headers.set("Authorization", config.token);
  }
  const response = await fetch(url, {
    ...init,
    headers,
  });
  if (!response.ok) {
    throw new CmsError(
      "CMS_REQUEST_FAILED",
      `GoPress request failed (${response.status} ${response.statusText}).`,
      { url: url.toString(), status: response.status }
    );
  }
  return response.json();
}

function mapGoPressRecordToPost(record: GoPressPostRecord): BlogPost {
  const createdAt = toDate(record.created, new Date());
  const updatedAt = toDate(record.updated, createdAt);
  const publishedAt = toDate(
    getField<string>(record, "published_at", "publishedAt"),
    createdAt
  );
  const slug = normalizeSlug(
    getField<string>(record, "slug") ?? record.id ?? record.title ?? ""
  );
  const contentHtml =
    getField<string>(record, "content_html", "contentHtml") ?? "";
  const excerpt =
    getField<string>(record, "excerpt", "description") ??
    stripHtml(contentHtml).slice(0, 180);
  const rawStatus = getField<string>(record, "status") ?? "draft";
  const status: PostStatus = isPostStatus(rawStatus) ? rawStatus : "draft";
  const seo = {
    title: getField<string>(record, "seo_title", "seoTitle"),
    description: getField<string>(record, "seo_description", "seoDescription"),
    keywords: asStringArray(getField(record, "seo_keywords", "seoKeywords")),
    image: getField<string>(record, "seo_image", "seoImage"),
    canonicalUrl: getField<string>(record, "canonical_url", "canonicalURL"),
    noindex: Boolean(getField(record, "robots_noindex", "robotsNoindex")),
    nofollow: Boolean(getField(record, "robots_nofollow", "robotsNofollow")),
  };

  return {
    id: record.id,
    slug,
    permalink: `/posts/${slug}`,
    source: "cms",
    contentHtml,
    contentJson: getField(record, "content_json", "contentJson"),
    status,
    scheduledAt: toDate(getField<string>(record, "scheduled_at", "scheduledAt"), updatedAt),
    seo,
    data: {
      author: getField<string>(record, "author") ?? SITE.author,
      pubDatetime: publishedAt,
      modDatetime: updatedAt,
      title: getField<string>(record, "title") ?? "Untitled",
      featured: Boolean(getField(record, "featured")),
      draft: status !== "published",
      status,
      tags: asStringArray(getField(record, "tags")),
      ogImage: getField<string>(record, "og_image", "ogImage"),
      description: excerpt || "Untitled post",
      canonicalURL: seo.canonicalUrl,
      hideEditPost: Boolean(
        getField(record, "hide_edit_post", "hideEditPost")
      ),
      timezone:
        getField<string>(record, "timezone") ?? SITE.timezone,
      seo,
    },
  };
}

export async function getGoPressHttpPosts() {
  const records = (await goPressRequest("/api/v1/posts")) as GoPressPostRecord[];
  return records.map(mapGoPressRecordToPost);
}

export async function getGoPressHttpPostBySlug(slug: string) {
  const posts = await getGoPressHttpPosts();
  return posts.find(post => post.slug === normalizeSlug(slug));
}

export async function getGoPressHttpPostById(postId: string) {
  const record = (await goPressRequest(
    `/api/v1/posts/${encodeURIComponent(postId)}`
  )) as GoPressPostRecord;
  return mapGoPressRecordToPost(record);
}

export async function updateGoPressHttpPostStatus(
  postId: string,
  status: PostStatus,
  extraFields?: Record<string, unknown>
) {
  const id = encodeURIComponent(postId);
  if (status === "in_review") {
    return goPressRequest(`/api/v1/posts/${id}/request-review`, {
      method: "POST",
    });
  }
  if (status === "scheduled") {
    return goPressRequest(`/api/v1/posts/${id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt:
          (extraFields?.scheduled_at as string | undefined) ??
          new Date().toISOString(),
      }),
    });
  }
  if (status === "published") {
    return goPressRequest(`/api/v1/posts/${id}/publish`, {
      method: "POST",
    });
  }
  if (status === "archived") {
    return goPressRequest(`/api/v1/posts/${id}/archive`, {
      method: "POST",
    });
  }

  return goPressRequest(`/api/v1/posts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(extraFields ?? {}),
  });
}

function mapReleaseRecord(record: Record<string, unknown>): ReleaseTask {
  const get = <T>(...keys: string[]): T | undefined => getField<T>(record, ...keys);
  return {
    id: String(get<string>("id") ?? ""),
    postId: String(get<string>("postId", "post_id") ?? ""),
    status: (get<string>("status") as ReleaseTask["status"]) ?? "queued",
    note: get<string>("note"),
    operator: get<string>("operator"),
    rollbackOfReleaseId: get<string>("rollbackOfReleaseId", "rollback_of_release_id"),
    stage: get<ReleaseTask["stage"]>("stage"),
    durationMs: get<number>("durationMs", "duration_ms"),
    errorCode: get<string>("errorCode", "error_code"),
    errorMessage: get<string>("errorMessage", "error_message"),
    triggeredAt: get<string>("triggeredAt", "triggered_at"),
    createdAt: get<string>("createdAt", "created_at"),
    updatedAt: get<string>("updatedAt", "updated_at"),
  };
}

export async function createGoPressHttpReleaseTask(
  postId: string,
  status: "queued" | "running" | "success" | "failed",
  note?: string,
  fields?: Partial<ReleaseTask>
) {
  const record = (await goPressRequest("/api/v1/releases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      postId,
      status,
      note: note ?? "",
      operator: fields?.operator ?? "",
      rollbackOfReleaseId: fields?.rollbackOfReleaseId ?? "",
      stage: fields?.stage ?? "validate",
      triggeredAt: new Date().toISOString(),
    }),
  })) as Record<string, unknown>;
  return mapReleaseRecord(record);
}

export async function triggerGoPressHttpRelease(releaseId: string) {
  return goPressRequest(`/api/v1/releases/${encodeURIComponent(releaseId)}/trigger`, {
    method: "POST",
  });
}

export async function listGoPressHttpReleaseTasks(limit = 20) {
  const records = (await goPressRequest(
    `/api/v1/releases?limit=${Math.max(1, limit)}`
  )) as Array<Record<string, unknown>>;
  return records.map(mapReleaseRecord);
}

export async function getGoPressHttpReleaseTaskById(releaseId: string) {
  const record = (await goPressRequest(
    `/api/v1/releases/${encodeURIComponent(releaseId)}`
  )) as Record<string, unknown>;
  return mapReleaseRecord(record);
}

export async function updateGoPressHttpReleaseTaskStatus(
  releaseId: string,
  status: ReleaseTask["status"],
  fields?: Partial<ReleaseTask>
) {
  const record = (await goPressRequest(
    `/api/v1/releases/${encodeURIComponent(releaseId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        ...fields,
      }),
    }
  )) as Record<string, unknown>;
  return mapReleaseRecord(record);
}

