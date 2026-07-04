import { type Post } from './domain'

const STORAGE_KEY = 'gopress.admin.posts.v1'

let cache: Post[] | null = null

function read(): Post[] {
  if (cache) return cache
  if (typeof localStorage === 'undefined') {
    cache = []
    return cache
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    cache = raw ? (JSON.parse(raw) as Post[]) : []
  } catch {
    cache = []
  }
  return cache
}

function write(data: Post[]): void {
  cache = data
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }
}

export const localPostRepository = {
  async list(): Promise<Post[]> {
    return [...read()].sort(
      (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
    )
  },

  async getById(id: string): Promise<Post | null> {
    return read().find((p) => p.id === id) ?? null
  },

  async save(post: Post): Promise<void> {
    const rows = read()
    const i = rows.findIndex((p) => p.id === post.id)
    if (i === -1) rows.push(post)
    else rows[i] = post
    write(rows)
  },
}
