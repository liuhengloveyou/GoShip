import { createFileRoute } from '@tanstack/react-router'
import { PostsListPage } from '@/features/posts/components/posts-list-page'

export const Route = createFileRoute('/_authenticated/posts/')({
  component: PostsListPage,
})
