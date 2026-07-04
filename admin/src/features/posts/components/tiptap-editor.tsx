import CharacterCount from '@tiptap/extension-character-count'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { TableKit } from '@tiptap/extension-table'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import type { Editor, JSONContent } from '@tiptap/core'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'
import { EditorOverlays } from './editor-overlays'
import { EditorToolbar } from './editor-toolbar'

type TiptapEditorProps = {
  postId: string
  initialContent: JSONContent
  editable?: boolean
  onUpdate: (json: JSONContent, html: string) => void
}

const editorBodyClass =
  'prose-tiptap min-h-full max-w-none px-4 py-4 text-[15px] leading-relaxed outline-none ' +
  '[&_p]:my-2 [&_p:first-child]:mt-0 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:scroll-mt-20 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight ' +
  '[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:tracking-tight ' +
  '[&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold ' +
  '[&_ul]:my-3 [&_ul]:ps-6 [&_ol]:my-3 [&_ol]:ps-6 [&_li]:my-0.5 ' +
  '[&_ul[data-type=taskList]]:list-none [&_ul[data-type=taskList]]:ps-4 ' +
  '[&_ul[data-type=taskList]_li]:flex [&_ul[data-type=taskList]_li]:gap-2 ' +
  '[&_ul[data-type=taskList]_label]:flex [&_ul[data-type=taskList]_label]:cursor-pointer ' +
  '[&_ul[data-type=taskList]_input]:mt-1 [&_ul[data-type=taskList]_input]:size-4 ' +
  '[&_blockquote]:border-s-2 [&_blockquote]:border-primary/30 [&_blockquote]:bg-muted/40 [&_blockquote]:py-2 [&_blockquote]:pe-4 [&_blockquote]:ps-4 [&_blockquote]:italic ' +
  '[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-950 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-zinc-50 ' +
  '[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] ' +
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit ' +
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 ' +
  '[&_mark]:rounded-sm [&_mark]:bg-yellow-200 [&_mark]:px-0.5 dark:[&_mark]:bg-yellow-700/80 ' +
  '[&_img]:my-4 [&_img]:max-h-[480px] [&_img]:w-auto [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:object-contain ' +
  '[&_.tableWrapper]:my-4 [&_.tableWrapper]:overflow-x-auto ' +
  '[&_table]:w-full [&_table]:min-w-[280px] [&_table]:border-collapse [&_table]:text-sm ' +
  '[&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-2 [&_td]:align-top ' +
  '[&_th]:border [&_th]:border-border [&_th]:bg-muted/80 [&_th]:px-2.5 [&_th]:py-2 [&_th]:text-start [&_th]:font-semibold ' +
  '[&_.column-resize-handle]:bg-primary/60 [&_.column-resize-handle]:absolute [&_.column-resize-handle]:top-0 [&_.column-resize-handle]:-right-1 [&_.column-resize-handle]:bottom-0 [&_.column-resize-handle]:w-1'

function CharacterCountFooter({ editor }: { editor: Editor }) {
  const count = useEditorState({
    editor,
    selector: (s) => {
      const st = s.editor?.storage.characterCount as
        | { characters: () => number; words: () => number }
        | undefined
      if (!st) return { chars: 0, words: 0 }
      return { chars: st.characters(), words: st.words() }
    },
  })

  return (
    <div className='text-muted-foreground flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-4 py-2 text-xs'>
      <span>
        字符 <strong className='text-foreground tabular-nums'>{count?.chars ?? 0}</strong>
        <span className='mx-2 opacity-40'>|</span>
        词块 <strong className='text-foreground tabular-nums'>{count?.words ?? 0}</strong>
      </span>
      <span className='opacity-80'>字数与词数统计</span>
    </div>
  )
}

export function TiptapEditor({
  postId,
  initialContent,
  editable = true,
  onUpdate,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg border max-w-full',
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({
        table: { resizable: true },
      }),
      CharacterCount.configure({
        limit: null,
      }),
      Placeholder.configure({
        placeholder: '在此撰写正文…',
      }),
    ],
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        class: editorBodyClass,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onUpdate(ed.getJSON(), ed.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(editable)
  }, [editor, editable])

  useEffect(() => {
    if (!editor) return
    const cur = JSON.stringify(editor.getJSON())
    const incoming = JSON.stringify(initialContent)
    if (cur !== incoming) {
      editor.commands.setContent(initialContent, { emitUpdate: false })
    }
  }, [editor, postId, initialContent])

  return (
    <div className='bg-card flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border shadow-sm'>
      {!editor ? (
        <>
          <div className='bg-muted/30 flex h-11 shrink-0 items-center border-b px-2'>
            <div className='bg-muted-foreground/20 h-6 w-48 max-w-full animate-pulse rounded' />
          </div>
          <div className='text-muted-foreground flex min-h-0 flex-1 items-center justify-center px-4 py-12 text-sm'>
            加载编辑器…
          </div>
        </>
      ) : (
        <>
          <EditorToolbar editor={editor} disabled={!editable} />
          <div className='relative min-h-0 flex-1 overflow-y-auto'>
            <div className='min-h-full'>
              <EditorContent editor={editor} />
            </div>
            <EditorOverlays editor={editor} disabled={!editable} />
          </div>
          <CharacterCountFooter editor={editor} />
        </>
      )}
    </div>
  )
}
