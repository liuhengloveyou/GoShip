import { SITE } from "@/config";
import {
  isPostStatus,
  type PostStatus,
  type ReleaseStatus,
  type ReleaseTask,
} from "../domain";
import { CmsError } from "../errors";
import type { BlogPost } from "../types";

interface CmsListResponse<T> {
  items: T[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

type CmsPostRecord = Record<string, unknown> & {
  id: string;
  title?: string;
  slug?: string;
  created?: string;
  updated?: string;
};

type CmsReleaseRecord = Record<string, unknown> & {
  id: string;
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

function getSingleFileName(value: unknown) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" && value.trim() !== "" ? value : undefined;
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

function buildFileUrl(
  baseUrl: string,
  collection: string,
  recordId: string,
  fileName?: string
) {
  if (!fileName) {
    return undefined;
  }

  return `${baseUrl}/api/files/${collection}/${recordId}/${encodeURIComponent(
    fileName
  )}`;
}

function getCmsConfig() {
  const baseUrl = import.meta.env.CMS_API_URL ?? import.meta.env.POCKETBASE_URL;
  const postsCollection =
    import.meta.env.CMS_POSTS_COLLECTION ??
    import.meta.env.POCKETBASE_POSTS_COLLECTION ??
    "posts";
  const releasesCollection = import.meta.env.CMS_RELEASES_COLLECTION ?? "releases";
  const token = import.meta.env.CMS_API_TOKEN ?? import.meta.env.POCKETBASE_API_TOKEN;

  if (!baseUrl) {
    throw new CmsError(
      "CMS_CONFIG_MISSING",
      "CMS_API_URL is required.",
      { env: "CMS_API_URL" }
    );
  }

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    postsCollection,
    releasesCollection,
    token,
  };
}

async function cmsRequest(path: string, init?: RequestInit) {
  const config = getCmsConfig();
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
      `CMS request failed (${response.status} ${response.statusText}).`,
      { url: url.toString(), status: response.status }
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function fetchCmsPage(
  baseUrl: string,
  collection: string,
  page: number,
  filter: string
) {
  const url = new URL(
    `/api/collections/${collection}/records`,
    `${normalizeBaseUrl(baseUrl)}/`
  );

  url.searchParams.set("page", String(page));
  url.searchParams.set("perPage", "200");
  url.searchParams.set("sort", "-published_at,-updated,-created");
  url.searchParams.set("filter", filter);

  const token = import.meta.env.CMS_API_TOKEN ?? import.meta.env.POCKETBASE_API_TOKEN;
  const response = await fetch(url, {
    headers: token ? { Authorization: token } : undefined,
  });

  if (!response.ok) {
    throw new CmsError(
      "CMS_REQUEST_FAILED",
      `Failed to load CMS posts (${response.status} ${response.statusText}).`,
      { url: url.toString(), status: response.status }
    );
  }

  return response.json() as Promise<CmsListResponse<CmsPostRecord>>;
}

async function fetchCmsPosts(
  baseUrl: string,
  collection: string,
  filter = "status!='archived'"
) {
  const firstPage = await fetchCmsPage(baseUrl, collection, 1, filter);
  const items = [...firstPage.items];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const nextPage = await fetchCmsPage(baseUrl, collection, page, filter);
    items.push(...nextPage.items);
  }

  return items;
}

function mapCmsRecordToPost(
  baseUrl: string,
  collection: string,
  record: CmsPostRecord
): BlogPost {
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
  const cover = buildFileUrl(
    baseUrl,
    collection,
    record.id,
    getSingleFileName(getField(record, "cover"))
  );
  const rawStatus = getField<string>(record, "status") ?? "draft";
  const status: PostStatus = isPostStatus(rawStatus) ? rawStatus : "draft";
  const seo = {
    title: getField<string>(record, "seo_title", "seoTitle"),
    description: getField<string>(record, "seo_description", "seoDescription"),
    keywords: asStringArray(getField(record, "seo_keywords", "seoKeywords")),
    image:
      getField<string>(record, "seo_image", "seoImage") ??
      cover,
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
      ogImage:
        getField<string>(record, "og_image", "ogImage") ??
        cover,
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

export async function getCmsHttpPosts() {
  const config = getCmsConfig();
  const records = await fetchCmsPosts(config.baseUrl, config.postsCollection);
  return records.map(record =>
    mapCmsRecordToPost(config.baseUrl, config.postsCollection, record)
  );
}

export async function getCmsHttpPostBySlug(slug: string) {
  const posts = await getCmsHttpPosts();
  return posts.find(post => post.slug === normalizeSlug(slug));
}

export async function getCmsHttpPostById(postId: string) {
  const config = getCmsConfig();
  const record = (await cmsRequest(
    `/api/collections/${config.postsCollection}/records/${postId}`
  )) as CmsPostRecord;

  return mapCmsRecordToPost(config.baseUrl, config.postsCollection, record);
}

export async function updateCmsHttpPostStatus(
  postId: string,
  status: PostStatus,
  extraFields?: Record<string, unknown>
) {
  const config = getCmsConfig();
  const now = new Date().toISOString();

  return cmsRequest(`/api/collections/${config.postsCollection}/records/${postId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
      ...(status === "published" ? { published_at: now } : {}),
      ...extraFields,
    }),
  });
}

export async function createCmsHttpReleaseTask(
  postId: string,
  status: "queued" | "running" | "success" | "failed",
  note?: string,
  fields?: Partial<ReleaseTask>
) {
  const config = getCmsConfig();
  return cmsRequest(`/api/collections/${config.releasesCollection}/records`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_id: postId,
      status,
      note: note ?? "",
      operator: fields?.operator ?? "",
      rollback_of_release_id: fields?.rollbackOfReleaseId ?? "",
      stage: "validate",
      triggered_at: new Date().toISOString(),
    }),
  });
}

export async function triggerCmsHttpReleaseWebhook(releaseId: string) {
  const webhookUrl = import.meta.env.CMS_RELEASE_WEBHOOK_URL;
  if (!webhookUrl) {
    return { skipped: true };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      releaseId,
      trigger: "manual_publish",
      triggeredAt: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new CmsError(
      "CMS_REQUEST_FAILED",
      `Failed to trigger release webhook (${response.status} ${response.statusText}).`,
      { url: webhookUrl, status: response.status }
    );
  }

  return { skipped: false };
}

function mapReleaseRecord(record: CmsReleaseRecord): ReleaseTask {
  return {
    id: record.id,
    postId: getField<string>(record, "post_id", "postId") ?? "",
    status: (getField<string>(record, "status") as ReleaseStatus) ?? "queued",
    note: getField<string>(record, "note"),
    operator: getField<string>(record, "operator"),
    rollbackOfReleaseId: getField<string>(
      record,
      "rollback_of_release_id",
      "rollbackOfReleaseId"
    ),
    stage: getField(record, "stage"),
    durationMs: getField<number>(record, "duration_ms", "durationMs"),
    errorCode: getField<string>(record, "error_code", "errorCode"),
    errorMessage: getField<string>(record, "error_message", "errorMessage"),
    triggeredAt: getField<string>(record, "triggered_at", "triggeredAt"),
    createdAt: getField<string>(record, "created"),
    updatedAt: getField<string>(record, "updated"),
  };
}

export async function listCmsHttpReleaseTasks(limit = 20) {
  const config = getCmsConfig();
  const response = (await cmsRequest(
    `/api/collections/${config.releasesCollection}/records?page=1&perPage=${Math.max(
      1,
      limit
    )}&sort=-created`
  )) as CmsListResponse<CmsReleaseRecord>;

  return response.items.map(mapReleaseRecord);
}

export async function getCmsHttpReleaseTaskById(releaseId: string) {
  const config = getCmsConfig();
  const record = (await cmsRequest(
    `/api/collections/${config.releasesCollection}/records/${releaseId}`
  )) as CmsReleaseRecord;
  return mapReleaseRecord(record);
}

export async function updateCmsHttpReleaseTaskStatus(
  releaseId: string,
  status: ReleaseStatus,
  fields?: Partial<ReleaseTask>
) {
  const config = getCmsConfig();
  const payload: Record<string, unknown> = {
    status,
    updated: new Date().toISOString(),
  };

  if (fields?.stage) payload.stage = fields.stage;
  if (fields?.durationMs !== undefined) payload.duration_ms = fields.durationMs;
  if (fields?.errorCode) payload.error_code = fields.errorCode;
  if (fields?.errorMessage) payload.error_message = fields.errorMessage;
  if (fields?.note !== undefined) payload.note = fields.note;

  const record = (await cmsRequest(
    `/api/collections/${config.releasesCollection}/records/${releaseId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  )) as CmsReleaseRecord;

  return mapReleaseRecord(record);
}
