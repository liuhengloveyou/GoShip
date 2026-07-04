import { getLocalPosts } from "./sources/local";
import { getCmsPosts } from "./sources/cms";
import type { BlogPost, LocalBlogPost } from "./types";
import postFilter from "@/utils/postFilter";
import { CONTENT_SOURCE } from "./source";

export type { BlogPost } from "./types";
export { CONTENT_SOURCE } from "./source";
export * from "./domain";
export * from "./service";

export function isLocalBlogPost(post: BlogPost): post is LocalBlogPost {
  return post.source === "local";
}

export async function getAllPosts() {
  if (CONTENT_SOURCE === "cms") {
    return getCmsPosts();
  }

  return getLocalPosts();
}

export async function getPublishedPosts() {
  const posts = await getAllPosts();
  return posts.filter(postFilter);
}
