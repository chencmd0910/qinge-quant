import { createFileRoute } from '@tanstack/react-router'
import { Blog } from '@/features/blog'

export const Route = createFileRoute('/blog/')({
  component: Blog,
})
