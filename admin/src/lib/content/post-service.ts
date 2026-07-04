import type { JSONContent } from '@tiptap/core'
import { type Post, type PostDraftInput, emptyDoc } from './domain'
import { localPostRepository } from './local-post-repository'

function nowIso() {
  return new Date().toISOString()
}

function slugifyFallback(id: string) {
  return `draft-${id.slice(0, 8)}`
}

function shouldUseRemoteContentApi() {
  return (import.meta.env.VITE_GOPRESS_CONTENT_SOURCE?.trim() || 'api') !== 'local'
}

function getContentApiBase() {
  return import.meta.env.VITE_GOPRESS_API_BASE?.trim() || ''
}

function buildApiUrl(path: string) {
  const base = getContentApiBase()
  return base ? `${base.replace(/\/+$/, '')}${path}` : path
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  if (!res.ok) {
    let message = `请求失败（${res.status} ${res.statusText}）`
    try {
      const data = (await res.json()) as { message?: string }
      if (data?.message) message = data.message
    } catch {
      // ignore parse error
    }
    throw new Error(message)
  }

  return res.json() as Promise<T>
}

function getBuildTriggerConfig() {
  const base = import.meta.env.VITE_GOPRESS_API_BASE?.trim() || ''
  const url =
    import.meta.env.VITE_GOPRESS_SITE_BUILD_TRIGGER_URL?.trim() ||
    (base ? `${base.replace(/\/+$/, '')}/api/v1/site/build` : '/api/v1/site/build')
  const token =
    import.meta.env.VITE_GOPRESS_SITE_BUILD_TOKEN?.trim() || ''
  return { url, token }
}

async function triggerSiteBuild(post: Post) {
  const { url, token } = getBuildTriggerConfig()
  if (!url) return

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['X-Site-Build-Token'] = token
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      postId: post.id,
      slug: post.slug,
      triggeredAt: new Date().toISOString(),
      trigger: 'publish_post',
    }),
  })

  if (!res.ok) {
    let details = ''
    try {
      details = await res.text()
    } catch {
      details = ''
    }
    throw new Error(
      `触发站点构建失败（${res.status} ${res.statusText}）${details ? `: ${details}` : ''}`
    )
  }
}

function createEmptyPost(): Post {
  const t = nowIso()
  const id = crypto.randomUUID()
  return {
    id,
    title: '未命名文章',
    slug: slugifyFallback(id),
    excerpt: '',
    content_json: emptyDoc,
    content_html: '<p></p>',
    status: 'draft',
    tags: [],
    category: '',
    cover_asset_id: null,
    author_id: null,
    published_at: null,
    scheduled_at: null,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    seo_image_asset_id: null,
    canonical_url: '',
    robots_noindex: false,
    robots_nofollow: false,
    last_release_id: null,
    last_release_at: null,
    last_release_content_hash: null,
    release_note: null,
    content_hash: null,
    created: t,
    updated: t,
  }
}

export async function listPosts(): Promise<Post[]> {
  if (shouldUseRemoteContentApi()) {
    return apiRequest<Post[]>('/api/v1/posts')
  }
  return localPostRepository.list()
}

export async function getPostById(id: string): Promise<Post | null> {
  if (shouldUseRemoteContentApi()) {
    try {
      return await apiRequest<Post>(`/api/v1/posts/${encodeURIComponent(id)}`)
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return null
      }
      throw error
    }
  }
  return localPostRepository.getById(id)
}

export async function createDraft(): Promise<Post> {
  if (shouldUseRemoteContentApi()) {
    return apiRequest<Post>('/api/v1/posts', {
      method: 'POST',
    })
  }
  const post = createEmptyPost()
  await localPostRepository.save(post)
  return post
}

export async function saveDraft(
  postId: string,
  input: PostDraftInput
): Promise<Post> {
  if (shouldUseRemoteContentApi()) {
    return apiRequest<Post>(`/api/v1/posts/${encodeURIComponent(postId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  }
  const existing = await localPostRepository.getById(postId)
  if (!existing) {
    throw new Error('文章不存在')
  }
  if (existing.status === 'archived') {
    throw new Error('已归档的文章不可编辑')
  }

  const next: Post = {
    ...existing,
    title: input.title ?? existing.title,
    slug: (input.slug ?? existing.slug).trim() || existing.slug,
    excerpt: input.excerpt ?? existing.excerpt,
    content_json: (input.content_json ??
      existing.content_json) as JSONContent,
    content_html: input.content_html ?? existing.content_html,
    tags: input.tags ?? existing.tags,
    category: input.category ?? existing.category,
    seo_title: input.seo_title ?? existing.seo_title,
    seo_description: input.seo_description ?? existing.seo_description,
    seo_keywords: input.seo_keywords ?? existing.seo_keywords,
    canonical_url: input.canonical_url ?? existing.canonical_url,
    robots_noindex: input.robots_noindex ?? existing.robots_noindex,
    robots_nofollow: input.robots_nofollow ?? existing.robots_nofollow,
    updated: nowIso(),
  }

  await localPostRepository.save(next)
  return next
}

export type PublishCheckInput = {
  title: string
  slug: string
  excerpt: string
  seo_title: string
  seo_description: string
  content_html: string
}

export function getPublishValidationErrors(input: PublishCheckInput): string[] {
  const errors: string[] = []
  if (!input.title.trim()) errors.push('标题不能为空')
  if (!input.slug.trim()) errors.push('slug 不能为空')
  if (!input.excerpt.trim()) errors.push('摘要不能为空')
  if (!input.seo_title.trim()) errors.push('SEO 标题不能为空')
  if (input.seo_description.trim().length < 10) {
    errors.push('SEO 描述至少 10 个字符')
  }
  if (input.seo_description.length > 320) {
    errors.push('SEO 描述不能超过 320 个字符')
  }
  if (input.seo_title.length > 120) {
    errors.push('SEO 标题不能超过 120 个字符')
  }
  const textLen = input.content_html.replace(/<[^>]+>/g, '').trim().length
  if (textLen < 20) {
    errors.push('正文过短（至少约 20 个字符）')
  }
  return errors
}

function validatePublish(post: Post): string[] {
  return getPublishValidationErrors({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    seo_title: post.seo_title,
    seo_description: post.seo_description,
    content_html: post.content_html,
  })
}

export async function requestReview(postId: string): Promise<Post> {
  if (shouldUseRemoteContentApi()) {
    return apiRequest<Post>(
      `/api/v1/posts/${encodeURIComponent(postId)}/request-review`,
      { method: 'POST' }
    )
  }
  const post = await localPostRepository.getById(postId)
  if (!post) throw new Error('文章不存在')
  if (post.status !== 'draft') {
    throw new Error('只有草稿可提交审核')
  }
  const next = { ...post, status: 'in_review' as const, updated: nowIso() }
  await localPostRepository.save(next)
  return next
}

export async function publishPost(postId: string): Promise<Post> {
  if (shouldUseRemoteContentApi()) {
    const post = await apiRequest<Post>(
      `/api/v1/posts/${encodeURIComponent(postId)}/publish`,
      { method: 'POST' }
    )
    await triggerSiteBuild(post)
    return post
  }

  const post = await localPostRepository.getById(postId)
  if (!post) throw new Error('文章不存在')
  if (post.status === 'archived') {
    throw new Error('已归档的文章不可发布')
  }
  if (
    !['draft', 'in_review', 'scheduled', 'published'].includes(post.status)
  ) {
    throw new Error('当前状态不可执行发布')
  }

  const errs = validatePublish(post)
  if (errs.length) {
    throw new Error(errs.join('；'))
  }

  const t = nowIso()
  const next: Post = {
    ...post,
    status: 'published',
    published_at: post.published_at ?? t,
    updated: t,
  }
  await localPostRepository.save(next)

  await triggerSiteBuild(next)

  return next
}

export async function archivePost(postId: string): Promise<Post> {
  if (shouldUseRemoteContentApi()) {
    return apiRequest<Post>(`/api/v1/posts/${encodeURIComponent(postId)}/archive`, {
      method: 'POST',
    })
  }
  const post = await localPostRepository.getById(postId)
  if (!post) throw new Error('文章不存在')
  if (post.status === 'archived') return post
  const next = { ...post, status: 'archived' as const, updated: nowIso() }
  await localPostRepository.save(next)
  return next
}
