import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { FilePenLine, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createDraft, listPosts, type Post, type PostStatus } from '@/lib/content'

const statusLabel: Record<PostStatus, string> = {
  draft: '草稿',
  in_review: '审核中',
  scheduled: '定时',
  published: '已发布',
  archived: '已归档',
}

const statusVariant: Record<
  PostStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  draft: 'secondary',
  in_review: 'outline',
  scheduled: 'outline',
  published: 'default',
  archived: 'destructive',
}

export function PostsListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: listPosts,
  })

  const create = useMutation({
    mutationFn: createDraft,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['posts'] })
    },
    onError: (e: Error) => {
      toast.error(e.message)
    },
  })

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

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>文章</h2>
            <p className='text-muted-foreground'>
              创建、编辑并发布站点内容。
            </p>
          </div>
          <Button
            disabled={create.isPending}
            onClick={() =>
              create.mutate(undefined, {
                onSuccess: (post: Post) => {
                  void navigate({
                    to: '/posts/$postId/edit',
                    params: { postId: post.id },
                  })
                },
              })
            }
          >
            <Plus />
            新建文章
          </Button>
        </div>

        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标题</TableHead>
                <TableHead className='w-[120px]'>状态</TableHead>
                <TableHead className='w-[160px]'>更新于</TableHead>
                <TableHead className='w-[100px] text-end'>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-muted-foreground'>
                    加载中…
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className='text-muted-foreground'>
                    暂无文章，点击「新建文章」开始。
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className='font-medium'>
                      <div className='flex flex-col gap-0.5'>
                        <span>{row.title || '（无标题）'}</span>
                        <span className='text-muted-foreground text-xs font-normal'>
                          /{row.slug}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[row.status]}>
                        {statusLabel[row.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-muted-foreground text-sm'>
                      {format(new Date(row.updated), 'yyyy-MM-dd HH:mm')}
                    </TableCell>
                    <TableCell className='text-end'>
                      <Button variant='ghost' size='sm' asChild>
                        <Link
                          to='/posts/$postId/edit'
                          params={{ postId: row.id }}
                        >
                          <FilePenLine />
                          编辑
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Main>
    </>
  )
}
