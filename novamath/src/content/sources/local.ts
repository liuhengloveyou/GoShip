import { getCollection } from "astro:content";
import { getPath } from "@/utils/getPath";
import type { BlogPost, LocalBlogPost } from "../types";

function normalizeSlug(slug: string) {
  return slug.replace(/^\/+|\/+$/g, "");
}

function mapLocalEntryToPost(entry: LocalBlogPost["entry"]): BlogPost {
  const slug = normalizeSlug(getPath(entry.id, entry.filePath, false));

  return {
    id: entry.id,
    slug,
    permalink: getPath(entry.id, entry.filePath),
    source: "local",
    data: entry.data,
    filePath: entry.filePath,
    editPath: entry.filePath,
    entry,
  };
}

export async function getLocalPosts() {
  const entries = await getCollection("blog");
  return entries.map(mapLocalEntryToPost);
}

