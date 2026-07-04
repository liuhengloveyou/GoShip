import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Circle,
  Eye,
  Loader2,
  Rocket,
  Send,
  Settings2,
  Shield,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  archivePost,
  emptyDoc,
  getPostById,
  getPublishValidationErrors,
  publishPost,
  requestReview,
  saveDraft,
  type Post,
  type PostStatus,
  type PublishCheckInput,
} from '@/lib/content'
import type { JSONContent } from '@tiptap/core'
import { cn } from '@/lib/utils'
import { TiptapEditor } from './tiptap-editor'

const statusLabel: Record<PostStatus, string> = {
  draft: '草稿',
  in_review: '审核中',
  scheduled: '定时',
  published: '已发布',
  archived: '已归档',
}

const statusBadgeVariant: Record<
  PostStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'secondary',
  in_review: 'outline',
  scheduled: 'outline',
  published: 'default',
  archived: 'destructive',
}

function tagsToString(tags: string[]) {
  return tags.join(', ')
}

function parseTags(s: string) {
  return s
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

type PostEditorPageProps = {
  postId: string
}

export function PostEditorPage({ postId }: PostEditorPageProps) {
  const qc = useQueryClient()
  const formHydrated = useRef(false)

  const { data: post, isLoading } = useQuery({
    queryKey: ['posts', postId],
    queryFn: () => getPostById(postId),
  })

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [category, setCategory] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [seoKeywords, setSeoKeywords] = useState('')
  const [canonicalUrl, setCanonicalUrl] = useState('')
  const [robotsNoindex, setRobotsNoindex] = useState(false)
  const [robotsNofollow, setRobotsNofollow] = useState(false)
  const [contentJson, setContentJson] = useState<JSONContent>(emptyDoc)
  const [contentHtml, setContentHtml] = useState('')

  const [publishOpen, setPublishOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [seoAdvancedOpen, setSeoAdvancedOpen] = useState(false)

  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)

  useEffect(() => {
    formHydrated.current = false
  }, [postId])

  useEffect(() => {
    if (!post || post.id !== postId || formHydrated.current) return
    formHydrated.current = true
    setTitle(post.title)
    setSlug(post.slug)
    setExcerpt(post.excerpt)
    setCategory(post.category)
    setTagsStr(tagsToString(post.tags))
    setSeoTitle(post.seo_title)
    setSeoDescription(post.seo_description)
    setSeoKeywords(post.seo_keywords)
    setCanonicalUrl(post.canonical_url)
    setRobotsNoindex(post.robots_noindex)
    setRobotsNofollow(post.robots_nofollow)
    setContentJson(post.content_json)
    setContentHtml(post.content_html)
  }, [post, postId])

  const buildPayload = useCallback(() => {
    if (!post || !contentJson) return null
    return {
      title,
      slug,
      excerpt,
      content_json: contentJson,
      content_html: contentHtml,
      tags: parseTags(tagsStr),
      category,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: seoKeywords,
      canonical_url: canonicalUrl,
      robots_noindex: robotsNoindex,
      robots_nofollow: robotsNofollow,
    }
  }, [
    post,
    title,
    slug,
    excerpt,
    contentJson,
    contentHtml,
    tagsStr,
    category,
    seoTitle,
    seoDescription,
    seoKeywords,
    canonicalUrl,
    robotsNoindex,
    robotsNofollow,
  ])

  const publishCheckInput: PublishCheckInput = useMemo(
    () => ({
      title,
      slug,
      excerpt,
      seo_title: seoTitle,
      seo_description: seoDescription,
      content_html: contentHtml,
    }),
    [title, slug, excerpt, seoTitle, seoDescription, contentHtml]
  )

  const publishBlockers = useMemo(
    () => getPublishValidationErrors(publishCheckInput),
    [publishCheckInput]
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload()
      if (!payload) throw new Error('无效内容')
      return saveDraft(postId, payload)
    },
    onMutate: () => setSyncState('saving'),
    onSuccess: (saved: Post) => {
      qc.setQueryData(['posts', postId], saved)
      setSyncState('saved')
      setLastSyncedAt(Date.now())
      toast.success('已保存')
    },
    onError: (e: Error) => {
      setSyncState('idle')
      toast.error(e.message)
    },
  })

  const debouncedPayloadKey = useMemo(
    () =>
      JSON.stringify({
        title,
        slug,
        excerpt,
        contentHtml,
        tagsStr,
        category,
        seoTitle,
        seoDescription,
        seoKeywords,
        canonicalUrl,
        robotsNoindex,
        robotsNofollow,
      }),
    [
      title,
      slug,
      excerpt,
      contentHtml,
      tagsStr,
      category,
      seoTitle,
      seoDescription,
      seoKeywords,
      canonicalUrl,
      robotsNoindex,
      robotsNofollow,
    ]
  )

  const autosaveJsonKey = useMemo(
    () => JSON.stringify(contentJson),
    [contentJson]
  )

  useEffect(() => {
    if (!post || post.status === 'archived' || !formHydrated.current) return
    const payload = buildPayload()
    if (!payload) return

    const timer = window.setTimeout(() => {
      void (async () => {
        setSyncState('saving')
        try {
          const saved = await saveDraft(postId, payload)
          qc.setQueryData(['posts', postId], saved)
          setSyncState('saved')
          setLastSyncedAt(Date.now())
        } catch (e) {
          setSyncState('idle')
          const msg = e instanceof Error ? e.message : '保存失败，请重试'
          toast.error(msg)
        }
      })()
    }, 2200)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- buildPayload 已聚合字段
  }, [
    debouncedPayloadKey,
    autosaveJsonKey,
    post?.id,
    post?.status,
    postId,
    buildPayload,
    qc,
  ])

  const reviewMutation = useMutation({
    mutationFn: () => requestReview(postId),
    onSuccess: async (saved: Post) => {
      qc.setQueryData(['posts', postId], saved)
      await qc.invalidateQueries({ queryKey: ['posts'] })
      toast.success('已提交审核')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const publishMutation = useMutation({
    mutationFn: () => publishPost(postId),
    onSuccess: async (saved: Post) => {
      qc.setQueryData(['posts', postId], saved)
      await qc.invalidateQueries({ queryKey: ['posts'] })
      setPublishOpen(false)
      toast.success('发布成功')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const archiveMutation = useMutation({
    mutationFn: () => archivePost(postId),
    onSuccess: async (saved: Post) => {
      qc.setQueryData(['posts', postId], saved)
      await qc.invalidateQueries({ queryKey: ['posts'] })
      setArchiveOpen(false)
      toast.success('已归档')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const editable = post && post.status !== 'archived'

  const onEditorUpdate = useCallback(
    (json: JSONContent, html: string) => {
      setContentJson(json)
      setContentHtml(html)
    },
    []
  )

  const syncLabel = useMemo(() => {
    if (syncState === 'saving') return '正在保存…'
    if (syncState === 'saved' && lastSyncedAt) {
      return `最近保存 ${formatDistanceToNow(lastSyncedAt, { addSuffix: true, locale: zhCN })}`
    }
    return '就绪'
  }, [syncState, lastSyncedAt])

  if (isLoading) {
    return (
      <>
        <Header fixed>
          <Search />
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
        <Main fixed className='flex flex-1 items-center justify-center'>
          <Loader2 className='text-muted-foreground size-8 animate-spin' />
        </Main>
      </>
    )
  }

  if (post == null) {
    return (
      <>
        <Header fixed>
          <Search />
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
        <Main fixed className='flex flex-1 flex-col items-center justify-center gap-4'>
          <p className='text-muted-foreground'>未找到该文章。</p>
          <Button asChild variant='outline'>
            <Link to='/posts'>返回列表</Link>
          </Button>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main
        fixed
        fluid
        className='flex min-h-0 flex-1 flex-col gap-0 overflow-hidden p-0'
      >
        {/* 粘性操作栏 */}
        <div className='bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b backdrop-blur-md'>
          <div className='mx-auto flex h-14 w-full max-w-[1600px] items-center gap-3 px-4 lg:gap-4 lg:px-8'>
            <Button variant='ghost' size='icon' className='shrink-0' asChild>
              <Link to='/posts' aria-label='返回文章列表'>
                <ArrowLeft className='size-4' />
              </Link>
            </Button>
            <Badge
              variant={statusBadgeVariant[post.status]}
              className='shrink-0 sm:hidden'
            >
              {statusLabel[post.status]}
            </Badge>
            <Separator orientation='vertical' className='hidden h-6 sm:block' />
            <Input
              aria-label='文章标题'
              id='post-title-mobile'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!editable}
              placeholder='未命名'
              className='placeholder:text-muted-foreground/70 h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-1 sm:hidden'
            />
            <div className='hidden min-w-0 flex-1 flex-col justify-center gap-0.5 py-0.5 sm:flex'>
              <div className='text-muted-foreground flex min-w-0 items-center gap-2 text-xs'>
                <span className='shrink-0'>内容</span>
                <span className='shrink-0 opacity-50'>/</span>
                <Input
                  id='post-title'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!editable}
                  placeholder='未命名'
                  aria-label='文章标题'
                  className='text-foreground placeholder:text-muted-foreground/60 h-6 min-w-0 flex-1 border-0 bg-transparent px-0 text-xs font-medium shadow-none focus-visible:ring-1 focus-visible:ring-ring'
                />
              </div>
              <div className='text-muted-foreground truncate font-mono text-[11px] leading-tight'>
                /{slug || '—'}
              </div>
            </div>
            <Badge
              variant={statusBadgeVariant[post.status]}
              className='hidden shrink-0 sm:inline-flex'
            >
              {statusLabel[post.status]}
            </Badge>
            <div className='text-muted-foreground hidden max-w-[220px] shrink-0 items-center gap-2 truncate text-xs lg:flex'>
              {saveMutation.isPending || syncState === 'saving' ? (
                <Loader2 className='size-3.5 shrink-0 animate-spin' />
              ) : (
                <Circle className='size-2 shrink-0 fill-emerald-500 text-emerald-500' />
              )}
              <span className='truncate'>{syncLabel}</span>
            </div>
            <div className='ms-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2'>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='sm:hidden'
                aria-label='文章设置'
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className='size-4' />
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='hidden sm:inline-flex'
                onClick={() => setSettingsOpen(true)}
              >
                <Settings2 className='size-4' />
                文章设置
              </Button>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='sm:hidden'
                aria-label='预览正文'
                onClick={() => setPreviewOpen(true)}
              >
                <Eye />
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='hidden sm:inline-flex'
                onClick={() => setPreviewOpen(true)}
              >
                <Eye />
                预览
              </Button>
              <Button
                variant='outline'
                size='sm'
                disabled={!editable || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <Loader2 className='size-4 animate-spin' />
                ) : null}
                保存
              </Button>
              {post.status === 'draft' ? (
                <Button
                  variant='secondary'
                  size='sm'
                  disabled={!editable || reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate()}
                >
                  <Send className='size-4' />
                  <span className='hidden sm:inline'>提交审核</span>
                </Button>
              ) : null}
              {post.status !== 'archived' ? (
                <Button
                  size='sm'
                  disabled={publishMutation.isPending}
                  onClick={() => setPublishOpen(true)}
                >
                  <Rocket className='size-4' />
                  <span className='hidden sm:inline'>
                    {post.status === 'published' ? '再次发布' : '发布'}
                  </span>
                </Button>
              ) : null}
              {post.status !== 'archived' ? (
                <Button
                  variant='destructive'
                  size='sm'
                  disabled={archiveMutation.isPending}
                  onClick={() => setArchiveOpen(true)}
                >
                  <span className='hidden sm:inline'>归档</span>
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
          <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
            <TiptapEditor
              key={post.id}
              postId={post.id}
              initialContent={contentJson}
              editable={!!editable}
              onUpdate={onEditorUpdate}
            />
          </div>
        </div>

        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent
            side='right'
            className='flex w-full flex-col gap-0 p-0 sm:max-w-lg'
          >
            <SheetHeader className='border-b px-6 py-5 pe-14'>
              <SheetTitle className='text-lg'>文章设置</SheetTitle>
              <SheetDescription>
                分类、摘要与 SEO 等元数据；正文编辑区保持专注写作。
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className='min-h-0 flex-1'>
              <div className='space-y-8 px-6 py-6'>
                <section className='space-y-4' aria-labelledby='settings-meta-heading'>
                  <h2
                    id='settings-meta-heading'
                    className='text-foreground text-sm font-semibold tracking-tight'
                  >
                    属性与摘要
                  </h2>
                  <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='grid gap-2 sm:col-span-2'>
                      <Label htmlFor='post-slug-sheet'>Slug</Label>
                      <Input
                        id='post-slug-sheet'
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        disabled={!editable}
                        className='font-mono text-sm'
                      />
                    </div>
                    <div className='grid gap-2'>
                      <Label htmlFor='post-category-sheet'>分类</Label>
                      <Input
                        id='post-category-sheet'
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        disabled={!editable}
                        placeholder='如：产品更新'
                      />
                    </div>
                    <div className='grid gap-2'>
                      <Label htmlFor='post-tags-sheet'>标签</Label>
                      <Input
                        id='post-tags-sheet'
                        value={tagsStr}
                        onChange={(e) => setTagsStr(e.target.value)}
                        disabled={!editable}
                        placeholder='逗号分隔'
                      />
                    </div>
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor='post-excerpt-sheet'>摘要</Label>
                    <Textarea
                      id='post-excerpt-sheet'
                      rows={4}
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      disabled={!editable}
                      placeholder='用于列表卡片与搜索结果，建议 1–3 句概括全文。'
                      className='resize-y text-sm leading-relaxed'
                    />
                  </div>
                </section>

                <Separator />

                <section className='space-y-4' aria-labelledby='settings-seo-heading'>
                  <h2
                    id='settings-seo-heading'
                    className='text-foreground flex items-center gap-2 text-sm font-semibold tracking-tight'
                  >
                    <Shield className='text-muted-foreground size-4' />
                    SEO
                  </h2>
                  <p className='text-muted-foreground text-xs leading-relaxed'>
                    搜索引擎摘要与索引策略
                  </p>
                  <div className='grid gap-2'>
                    <div className='flex items-center justify-between gap-2'>
                      <Label htmlFor='seo-title-sheet'>SEO 标题</Label>
                      <span className='text-muted-foreground text-xs tabular-nums'>
                        {seoTitle.length}/120
                      </span>
                    </div>
                    <Input
                      id='seo-title-sheet'
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      disabled={!editable}
                    />
                    <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          seoTitle.length > 120
                            ? 'bg-destructive'
                            : 'bg-primary/80'
                        )}
                        style={{
                          width: `${Math.min(100, (seoTitle.length / 120) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className='grid gap-2'>
                    <div className='flex items-center justify-between gap-2'>
                      <Label htmlFor='seo-desc-sheet'>SEO 描述</Label>
                      <span className='text-muted-foreground text-xs tabular-nums'>
                        {seoDescription.trim().length} 字 · 上限 320
                      </span>
                    </div>
                    <Textarea
                      id='seo-desc-sheet'
                      rows={5}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      disabled={!editable}
                      className='resize-y text-sm leading-relaxed'
                    />
                    <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          seoDescription.trim().length < 10 ||
                            seoDescription.length > 320
                            ? 'bg-amber-500/90'
                            : 'bg-emerald-600/80 dark:bg-emerald-500/80'
                        )}
                        style={{
                          width: `${Math.min(100, (seoDescription.trim().length / 160) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className='grid gap-2'>
                    <Label htmlFor='seo-kw-sheet'>关键词</Label>
                    <Input
                      id='seo-kw-sheet'
                      value={seoKeywords}
                      onChange={(e) => setSeoKeywords(e.target.value)}
                      disabled={!editable}
                      placeholder='逗号分隔，可选'
                    />
                  </div>

                  <Collapsible
                    open={seoAdvancedOpen}
                    onOpenChange={setSeoAdvancedOpen}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='text-muted-foreground -ms-2 h-8 px-2'
                      >
                        <ChevronDown
                          className={cn(
                            'size-4 transition-transform',
                            seoAdvancedOpen && 'rotate-180'
                          )}
                        />
                        高级选项
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className='space-y-4 pt-2'>
                      <div className='grid gap-2'>
                        <Label htmlFor='canonical-sheet'>规范 URL</Label>
                        <Input
                          id='canonical-sheet'
                          value={canonicalUrl}
                          onChange={(e) => setCanonicalUrl(e.target.value)}
                          disabled={!editable}
                          placeholder='https://…'
                          className='font-mono text-xs'
                        />
                      </div>
                      <div className='flex flex-wrap gap-6'>
                        <div className='flex items-center gap-2'>
                          <Switch
                            id='noindex-sheet'
                            checked={robotsNoindex}
                            onCheckedChange={setRobotsNoindex}
                            disabled={!editable}
                          />
                          <Label htmlFor='noindex-sheet' className='font-normal'>
                            noindex
                          </Label>
                        </div>
                        <div className='flex items-center gap-2'>
                          <Switch
                            id='nofollow-sheet'
                            checked={robotsNofollow}
                            onCheckedChange={setRobotsNofollow}
                            disabled={!editable}
                          />
                          <Label htmlFor='nofollow-sheet' className='font-normal'>
                            nofollow
                          </Label>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </section>
              </div>
            </ScrollArea>
            <SheetFooter className='border-t px-6 py-4'>
              <Button type='button' onClick={() => setSettingsOpen(false)}>
                完成
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Main>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className='max-w-3xl gap-0 p-0'>
          <DialogHeader className='border-b px-6 py-4'>
            <DialogTitle>正文预览</DialogTitle>
            <DialogDescription>
              以下为当前 HTML 渲染效果，与前台站点样式可能略有差异。
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className='max-h-[70vh]'>
            <article
              className='cms-preview-article px-6 py-6'
              dangerouslySetInnerHTML={{ __html: contentHtml || '<p></p>' }}
            />
          </ScrollArea>
          <DialogFooter className='border-t px-6 py-3'>
            <Button type='button' variant='secondary' onClick={() => setPreviewOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认发布</DialogTitle>
            <DialogDescription>
              将执行与线上一致的校验规则；通过后内容将标记为已发布。
            </DialogDescription>
          </DialogHeader>
          {publishBlockers.length > 0 ? (
            <div className='border-destructive/30 bg-destructive/5 text-destructive flex gap-2 rounded-lg border px-3 py-2 text-sm'>
              <AlertCircle className='mt-0.5 size-4 shrink-0' />
              <span>{publishBlockers.join('；')}</span>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant='outline' onClick={() => setPublishOpen(false)}>
              取消
            </Button>
            <Button
              disabled={publishMutation.isPending || publishBlockers.length > 0}
              onClick={() => publishMutation.mutate()}
            >
              {publishMutation.isPending ? (
                <Loader2 className='animate-spin' />
              ) : null}
              确认发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>归档这篇文章？</AlertDialogTitle>
            <AlertDialogDescription>
              归档后不可再编辑或发布，仅可查看。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              variant='destructive'
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
            >
              {archiveMutation.isPending ? (
                <Loader2 className='animate-spin' />
              ) : null}
              确认归档
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
