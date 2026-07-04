import { createFileRoute } from '@tanstack/react-router'
import { PostEditorPage } from '@/features/posts/components/post-editor-page'

export const Route = createFileRoute('/_authenticated/posts/$postId/edit')({
  component: PostEditorRoute,
})

function PostEditorRoute() {
  const { postId } = Route.useParams()
  return <PostEditorPage postId={postId} />
}
