import type { Editor } from '@tiptap/core'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
import {
  Heading2,
  Heading3,
  ImageIcon,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Table2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type EditorOverlaysProps = {
  editor: Editor
  disabled?: boolean
}

const menuSurface =
  'flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-md'

function insertImage(editor: Editor) {
  const url = window.prompt('图片 URL（需可公网访问）', 'https://')
  if (!url?.trim()) return
  editor.chain().focus().setImage({ src: url.trim() }).run()
}

export function EditorOverlays({ editor, disabled }: EditorOverlaysProps) {
  if (disabled) return null

  return (
    <>
      <BubbleMenu
        editor={editor}
        options={{ placement: 'top-start' }}
        className={cn(menuSurface, 'z-[100]')}
      >
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={cn(
            'h-8 px-2',
            editor.isActive('bold') && 'bg-accent'
          )}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={cn(
            'h-8 px-2 italic',
            editor.isActive('italic') && 'bg-accent'
          )}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={cn(
            'h-8 px-2 underline',
            editor.isActive('underline') && 'bg-accent'
          )}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={cn(
            'h-8 px-2',
            editor.isActive('highlight') && 'bg-accent'
          )}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          高亮
        </Button>
        <Separator orientation='vertical' className='mx-0.5 h-6' />
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 px-2'
          onClick={() => {
            const prev = editor.getAttributes('link').href as string | undefined
            const url = window.prompt('链接', prev ?? 'https://')
            if (url === null) return
            if (url === '') {
              editor.chain().focus().extendMarkRange('link').unsetLink().run()
              return
            }
            editor
              .chain()
              .focus()
              .extendMarkRange('link')
              .setLink({ href: url })
              .run()
          }}
        >
          链接
        </Button>
      </BubbleMenu>

      <FloatingMenu
        editor={editor}
        options={{ placement: 'bottom-start', offset: 8 }}
        className={cn(menuSurface, 'z-[100] max-w-[min(100vw-2rem,28rem)]')}
      >
        <span className='text-muted-foreground px-1.5 text-[10px] font-medium tracking-wide'>
          快捷插入
        </span>
        <Separator orientation='vertical' className='mx-0.5 h-6' />
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1 px-2'
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className='size-3.5' />
          H2
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1 px-2'
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className='size-3.5' />
          H3
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1 px-2'
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className='size-3.5' />
          列表
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1 px-2'
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className='size-3.5' />
          有序
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1 px-2'
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListTodo className='size-3.5' />
          任务
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1 px-2'
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className='size-3.5' />
          引用
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1 px-2'
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <Table2 className='size-3.5' />
          表格
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className='h-8 gap-1 px-2'
          onClick={() => insertImage(editor)}
        >
          <ImageIcon className='size-3.5' />
          图片
        </Button>
      </FloatingMenu>
    </>
  )
}
