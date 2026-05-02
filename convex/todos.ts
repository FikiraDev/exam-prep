import { v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

import { mutation, query } from './_generated/server'

async function requireTodo(ctx: MutationCtx, id: Id<'todos'>) {
  const todo = await ctx.db.get(id)
  if (!todo) {
    throw new Error('Todo not found')
  }
  return todo
}

function normalizeTodoText(text: string) {
  const trimmedText = text.trim()
  if (trimmedText.length === 0) {
    throw new Error('Todo text cannot be empty')
  }
  return trimmedText
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('todos').order('desc').collect()
  },
})

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const text = normalizeTodoText(args.text)

    return await ctx.db.insert('todos', {
      text,
      completed: false,
    })
  },
})

export const toggle = mutation({
  args: { id: v.id('todos') },
  handler: async (ctx, args) => {
    const todo = await requireTodo(ctx, args.id)
    return await ctx.db.patch(args.id, {
      completed: !todo.completed,
    })
  },
})

export const update = mutation({
  args: {
    id: v.id('todos'),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTodo(ctx, args.id)
    const text = normalizeTodoText(args.text)

    return await ctx.db.patch(args.id, {
      text,
    })
  },
})

export const remove = mutation({
  args: { id: v.id('todos') },
  handler: async (ctx, args) => {
    await requireTodo(ctx, args.id)

    return await ctx.db.delete(args.id)
  },
})
