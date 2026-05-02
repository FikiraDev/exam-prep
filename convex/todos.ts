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

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('todos').order('desc').collect()
  },
})

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert('todos', {
      text: args.text,
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

    return await ctx.db.patch(args.id, {
      text: args.text,
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
