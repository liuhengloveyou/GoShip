import type { JSONContent } from '@tiptap/core'

export const postStatuses = [
  'draft',
  'in_review',
  'scheduled',
  'published',
  'archived',
] as const

export type PostStatus = (typeof postStatuses)[number]

export const emptyDoc: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
}

export type Post = {
  id: string
  title: string
  slug: string
  excerpt: string
  content_json: JSONContent
  content_html: string
  status: PostStatus
  tags: string[]
  category: string
  cover_asset_id: string | null
  author_id: string | null
  published_at: string | null
  scheduled_at: string | null
  seo_title: string
  seo_description: string
  seo_keywords: string
  seo_image_asset_id: string | null
  canonical_url: string
  robots_noindex: boolean
  robots_nofollow: boolean
  last_release_id: string | null
  last_release_at: string | null
  last_release_content_hash: string | null
  release_note: string | null
  content_hash: string | null
  created: string
  updated: string
}

export type PostDraftInput = {
  title?: string
  slug?: string
  excerpt?: string
  content_json?: JSONContent
  content_html?: string
  tags?: string[]
  category?: string
  seo_title?: string
  seo_description?: string
  seo_keywords?: string
  canonical_url?: string
  robots_noindex?: boolean
  robots_nofollow?: boolean
}
