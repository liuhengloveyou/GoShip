import type { ImageMetadata } from "astro";
import type { CollectionEntry } from "astro:content";
import type { PostStatus, SeoMeta } from "./domain";

export interface BlogPostData {
  author: string;
  pubDatetime: Date;
  modDatetime?: Date | null;
  title: string;
  featured?: boolean;
  draft?: boolean;
  tags: string[];
  ogImage?: ImageMetadata | string;
  description: string;
  canonicalURL?: string;
  hideEditPost?: boolean;
  timezone?: string;
  status?: PostStatus;
  seo?: SeoMeta;
}

interface BlogPostBase {
  id: string;
  slug: string;
  permalink: string;
  source: "local" | "cms";
  data: BlogPostData;
  editPath?: string;
}

export interface LocalBlogPost extends BlogPostBase {
  source: "local";
  filePath?: string;
  entry: CollectionEntry<"blog">;
}

export interface CmsBlogPost extends BlogPostBase {
  source: "cms";
  contentHtml: string;
  contentJson?: unknown;
  status: PostStatus;
  scheduledAt?: Date | null;
  seo: SeoMeta;
}

export type BlogPost = LocalBlogPost | CmsBlogPost;

