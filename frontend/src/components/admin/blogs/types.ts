export interface BlogCategory {
  id: number
  name: string
  slug: string
  createdAt?: string
  updatedAt?: string
}

export interface BlogAuthorRef {
  id: number
  name: string
  email?: string
}

export interface BlogSubCategory {
  id: number
  name: string
  slug: string
  categoryId: number
  authorId: number | null
  createdAt?: string
  updatedAt?: string
  category?: { id: number; name: string; slug: string }
  author?: BlogAuthorRef | null
}
