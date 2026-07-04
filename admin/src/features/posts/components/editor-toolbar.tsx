import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  Heading2,
  Heading3,
  Highlighter,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type EditorToolbarProps = {
  editor: Editor
  disabled?: boolean
}

function Tb({
  children,
  label,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-8 shrink-0'
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side='bottom' className='text-xs'>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function insertImage(editor: Editor, disabled?: boolean) {
  if (disabled) return
  const url = window.prompt('图片 URL（需可公网访问）', 'https://')
  if (!url?.trim()) return
  editor.chain().focus().setImage({ src: url.trim() }).run()
}

export function EditorToolbar({ editor, disabled }: EditorToolbarProps) {
  const state = useEditorState({
    editor,
    selector: (s) => {
      const ed = s.editor!
      return {
        bold: ed.isActive('bold'),
        italic: ed.isActive('italic'),
        strike: ed.isActive('strike'),
        underline: ed.isActive('underline'),
        highlight: ed.isActive('highlight'),
        code: ed.isActive('code'),
        h2: ed.isActive('heading', { level: 2 }),
        h3: ed.isActive('heading', { level: 3 }),
        h4: ed.isActive('heading', { level: 4 }),
        bullet: ed.isActive('bulletList'),
        ordered: ed.isActive('orderedList'),
        taskList: ed.isActive('taskList'),
        blockquote: ed.isActive('blockquote'),
        codeBlock: ed.isActive('codeBlock'),
        alignLeft: ed.isActive({ textAlign: 'left' }),
        alignCenter: ed.isActive({ textAlign: 'center' }),
        alignRight: ed.isActive({ textAlign: 'right' }),
        alignJustify: ed.isActive({ textAlign: 'justify' }),
        inTable: ed.isActive('table'),
        canAddRowAfter: ed.can().addRowAfter(),
        canAddColumnAfter: ed.can().addColumnAfter(),
        canDeleteTable: ed.can().deleteTable(),
        canUndo: ed.can().undo(),
        canRedo: ed.can().redo(),
      }
    },
  })

  const run = (fn: () => boolean) => {
    if (disabled) return
    fn()
  }

  const setLink = () => {
    if (disabled) return
    const prev = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('链接地址', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  const headingLabel = state.h2
    ? '标题 2'
    : state.h3
      ? '标题 3'
      : state.h4
        ? '标题 4'
        : '段落 / 标题'

  return (
    <div className='bg-muted/40 flex shrink-0 flex-wrap items-center gap-0.5 border-b px-1.5 py-1'>
      <Tb
        label='撤销'
        disabled={disabled || !state.canUndo}
        onClick={() => run(() => editor.chain().focus().undo().run())}
      >
        <Undo2 className='size-4' />
      </Tb>
      <Tb
        label='重做'
        disabled={disabled || !state.canRedo}
        onClick={() => run(() => editor.chain().focus().redo().run())}
      >
        <Redo2 className='size-4' />
      </Tb>

      <Separator orientation='vertical' className='mx-0.5 h-6' />

      <Tb
        label='加粗'
        disabled={disabled}
        className={cn(state.bold && 'bg-accent text-accent-foreground')}
        onClick={() => run(() => editor.chain().focus().toggleBold().run())}
      >
        <Bold className='size-4' />
      </Tb>
      <Tb
        label='斜体'
        disabled={disabled}
        className={cn(state.italic && 'bg-accent text-accent-foreground')}
        onClick={() => run(() => editor.chain().focus().toggleItalic().run())}
      >
        <Italic className='size-4' />
      </Tb>
      <Tb
        label='删除线'
        disabled={disabled}
        className={cn(state.strike && 'bg-accent text-accent-foreground')}
        onClick={() => run(() => editor.chain().focus().toggleStrike().run())}
      >
        <Strikethrough className='size-4' />
      </Tb>
      <Tb
        label='下划线'
        disabled={disabled}
        className={cn(state.underline && 'bg-accent text-accent-foreground')}
        onClick={() => run(() => editor.chain().focus().toggleUnderline().run())}
      >
        <Underline className='size-4' />
      </Tb>
      <Tb
        label='高亮'
        disabled={disabled}
        className={cn(
          state.highlight && 'bg-accent text-accent-foreground'
        )}
        onClick={() => run(() => editor.chain().focus().toggleHighlight().run())}
      >
        <Highlighter className='size-4' />
      </Tb>
      <Tb
        label='行内代码'
        disabled={disabled}
        className={cn(state.code && 'bg-accent text-accent-foreground')}
        onClick={() => run(() => editor.chain().focus().toggleCode().run())}
      >
        <Code className='size-4' />
      </Tb>

      <Separator orientation='vertical' className='mx-0.5 h-6' />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled={disabled}
            className='text-muted-foreground h-8 gap-1 px-2 font-normal'
          >
            {headingLabel}
            <ChevronDown className='size-3.5 opacity-70' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-48'>
          <DropdownMenuItem
            onClick={() =>
              run(() => editor.chain().focus().setParagraph().run())
            }
          >
            正文段落
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              run(() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              )
            }
          >
            <Heading2 className='me-2 size-4' />
            标题 2
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              run(() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              )
            }
          >
            <Heading3 className='me-2 size-4' />
            标题 3
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              run(() =>
                editor.chain().focus().toggleHeading({ level: 4 }).run()
              )
            }
          >
            标题 4
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation='vertical' className='mx-0.5 h-6' />

      <Tb
        label='左对齐'
        disabled={disabled}
        className={cn(state.alignLeft && 'bg-accent text-accent-foreground')}
        onClick={() =>
          run(() => editor.chain().focus().setTextAlign('left').run())
        }
      >
        <AlignLeft className='size-4' />
      </Tb>
      <Tb
        label='居中'
        disabled={disabled}
        className={cn(state.alignCenter && 'bg-accent text-accent-foreground')}
        onClick={() =>
          run(() => editor.chain().focus().setTextAlign('center').run())
        }
      >
        <AlignCenter className='size-4' />
      </Tb>
      <Tb
        label='右对齐'
        disabled={disabled}
        className={cn(state.alignRight && 'bg-accent text-accent-foreground')}
        onClick={() =>
          run(() => editor.chain().focus().setTextAlign('right').run())
        }
      >
        <AlignRight className='size-4' />
      </Tb>
      <Tb
        label='两端对齐'
        disabled={disabled}
        className={cn(state.alignJustify && 'bg-accent text-accent-foreground')}
        onClick={() =>
          run(() => editor.chain().focus().setTextAlign('justify').run())
        }
      >
        <AlignJustify className='size-4' />
      </Tb>

      <Separator orientation='vertical' className='mx-0.5 h-6' />

      <Tb
        label='无序列表'
        disabled={disabled}
        className={cn(state.bullet && 'bg-accent text-accent-foreground')}
        onClick={() =>
          run(() => editor.chain().focus().toggleBulletList().run())
        }
      >
        <List className='size-4' />
      </Tb>
      <Tb
        label='有序列表'
        disabled={disabled}
        className={cn(state.ordered && 'bg-accent text-accent-foreground')}
        onClick={() =>
          run(() => editor.chain().focus().toggleOrderedList().run())
        }
      >
        <ListOrdered className='size-4' />
      </Tb>
      <Tb
        label='任务列表'
        disabled={disabled}
        className={cn(
          state.taskList && 'bg-accent text-accent-foreground'
        )}
        onClick={() => run(() => editor.chain().focus().toggleTaskList().run())}
      >
        <ListTodo className='size-4' />
      </Tb>
      <Tb
        label='引用'
        disabled={disabled}
        className={cn(state.blockquote && 'bg-accent text-accent-foreground')}
        onClick={() =>
          run(() => editor.chain().focus().toggleBlockquote().run())
        }
      >
        <Quote className='size-4' />
      </Tb>
      <Tb
        label='代码块'
        disabled={disabled}
        className={cn(
          state.codeBlock && 'bg-accent text-accent-foreground'
        )}
        onClick={() =>
          run(() => editor.chain().focus().toggleCodeBlock().run())
        }
      >
        <SquareCode className='size-4' />
      </Tb>
      <Tb
        label='分隔线'
        disabled={disabled}
        onClick={() =>
          run(() => editor.chain().focus().setHorizontalRule().run())
        }
      >
        <Minus className='size-4' />
      </Tb>
      <Tb label='链接' disabled={disabled} onClick={setLink}>
        <Link2 className='size-4' />
      </Tb>
      <Tb
        label='插入图片'
        disabled={disabled}
        onClick={() => insertImage(editor, disabled)}
      >
        <ImageIcon className='size-4' />
      </Tb>

      <Separator orientation='vertical' className='mx-0.5 h-6' />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled={disabled}
            className={cn(
              'h-8 gap-1 px-2',
              state.inTable && 'bg-accent/60 text-accent-foreground'
            )}
          >
            <Table2 className='size-4' />
            表格
            <ChevronDown className='size-3.5 opacity-70' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='start' className='w-52'>
          <DropdownMenuItem
            onClick={() =>
              run(() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              )
            }
          >
            插入 3×3 表格（含表头）
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!state.canAddRowAfter}
            onClick={() =>
              run(() => editor.chain().focus().addRowAfter().run())
            }
          >
            在下方插入一行
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!state.canAddColumnAfter}
            onClick={() =>
              run(() => editor.chain().focus().addColumnAfter().run())
            }
          >
            在右侧插入一列
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!state.canDeleteTable}
            className='text-destructive focus:text-destructive'
            onClick={() =>
              run(() => editor.chain().focus().deleteTable().run())
            }
          >
            删除当前表格
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
