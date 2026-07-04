export const POST_STATUSES = [
  "draft",
  "in_review",
  "scheduled",
  "published",
  "archived",
] as const;

export type PostStatus = (typeof POST_STATUSES)[number];

export interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
}

export interface PublishRequest {
  postId: string;
  releaseNote?: string;
}

export type ReleaseStatus = "queued" | "running" | "success" | "failed";

export type ReleaseStage =
  | "validate"
  | "build"
  | "deploy"
  | "completed"
  | "failed";

export interface ReleaseTask {
  id: string;
  postId: string;
  status: ReleaseStatus;
  note?: string;
  operator?: string;
  rollbackOfReleaseId?: string;
  stage?: ReleaseStage;
  durationMs?: number;
  errorCode?: string;
  errorMessage?: string;
  triggeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const STATUS_TRANSITIONS: Record<PostStatus, PostStatus[]> = {
  draft: ["in_review", "scheduled", "published", "archived"],
  in_review: ["draft", "scheduled", "published", "archived"],
  scheduled: ["draft", "in_review", "published", "archived"],
  published: ["draft", "archived"],
  archived: ["draft"],
};

export function isPostStatus(value: string): value is PostStatus {
  return POST_STATUSES.includes(value as PostStatus);
}

export function canTransitionPostStatus(
  from: PostStatus,
  to: PostStatus
): boolean {
  return from === to || STATUS_TRANSITIONS[from].includes(to);
}

export function assertPostStatusTransition(from: PostStatus, to: PostStatus) {
  if (!canTransitionPostStatus(from, to)) {
    throw new Error(`Invalid post status transition: ${from} -> ${to}`);
  }
}

export function validateSeoMeta(seo: SeoMeta) {
  if (seo.title && seo.title.length > 70) {
    throw new Error("SEO title must be 70 characters or fewer.");
  }

  if (seo.description && seo.description.length > 160) {
    throw new Error("SEO description must be 160 characters or fewer.");
  }
}
