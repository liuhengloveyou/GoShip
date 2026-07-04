import {
  createGoPressHttpReleaseTask,
  getGoPressHttpPostById,
  getGoPressHttpPostBySlug,
  getGoPressHttpPosts,
  getGoPressHttpReleaseTaskById,
  listGoPressHttpReleaseTasks,
  triggerGoPressHttpRelease,
  updateGoPressHttpPostStatus,
  updateGoPressHttpReleaseTaskStatus,
} from "./gopress-http";
import type { PostStatus, ReleaseStatus, ReleaseTask } from "../domain";

export async function getGoPressPosts() {
  return getGoPressHttpPosts();
}

export async function getGoPressPostBySlug(slug: string) {
  return getGoPressHttpPostBySlug(slug);
}

export async function getGoPressPostById(postId: string) {
  return getGoPressHttpPostById(postId);
}

export async function updateGoPressPostStatus(
  postId: string,
  status: PostStatus,
  extraFields?: Record<string, unknown>
) {
  return updateGoPressHttpPostStatus(postId, status, extraFields);
}

export async function createGoPressReleaseTask(
  postId: string,
  status: "queued" | "running" | "success" | "failed",
  note?: string,
  fields?: Partial<ReleaseTask>
) {
  return createGoPressHttpReleaseTask(postId, status, note, fields);
}

export async function triggerGoPressRelease(releaseId: string) {
  return triggerGoPressHttpRelease(releaseId);
}

export async function listGoPressReleaseTasks(limit?: number) {
  return listGoPressHttpReleaseTasks(limit);
}

export async function getGoPressReleaseTaskById(releaseId: string) {
  return getGoPressHttpReleaseTaskById(releaseId);
}

export async function updateGoPressReleaseTaskStatus(
  releaseId: string,
  status: ReleaseStatus,
  fields?: Partial<ReleaseTask>
) {
  return updateGoPressHttpReleaseTaskStatus(releaseId, status, fields);
}

