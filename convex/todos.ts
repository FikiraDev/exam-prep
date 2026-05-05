import { v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

import { mutation, query } from './_generated/server'
import { authComponent } from './auth'

type AuthCtx = MutationCtx | QueryCtx
const EMPTY_TODO_MESSAGE = 'Please add a task before submitting.'

// Intentional: kept as generic `throw new Error('Unauthorized')` rather than
// Convex typed errors. The project currently does not need client-side
// differentiation between "no auth" and "wrong owner." If UX differentiation
// becomes required, switch to `ConvexError` with a typed code.
async function requireAuthUserId(ctx: AuthCtx) {
  const user = await authComponent.safeGetAuthUser(ctx)
  const userId = user?.['_id'] ?? null
  if (!userId) {
    throw new Error('Unauthorized')
  }
  return userId
}

async function requireTodo(ctx: MutationCtx, id: Id<'todos'>, userId: string) {
  const todo = await ctx.db.get(id)
  if (!todo) {
    throw new Error('Todo not found')
  }
  if (todo.userId !== userId) {
    throw new Error('Unauthorized')
  }
  return todo
}

function normalizeTodoText(text: string, emptyMessage = EMPTY_TODO_MESSAGE) {
  const trimmedText = text.trim()
  if (trimmedText.length === 0) {
    throw new Error(emptyMessage)
  }
  return trimmedText
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)
    return await ctx.db
      .query('todos')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const text = normalizeTodoText(args.text)

    return await ctx.db.insert('todos', {
      text,
      completed: false,
      userId,
    })
  },
})

export const toggle = mutation({
  args: { id: v.id('todos') },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    const todo = await requireTodo(ctx, args.id, userId)
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
    const userId = await requireAuthUserId(ctx)
    await requireTodo(ctx, args.id, userId)
    const text = normalizeTodoText(args.text, 'Task cannot be empty.')

    return await ctx.db.patch(args.id, {
      text,
    })
  },
})

export const remove = mutation({
  args: { id: v.id('todos') },
  handler: async (ctx, args) => {
    const userId = await requireAuthUserId(ctx)
    await requireTodo(ctx, args.id, userId)

    return await ctx.db.delete(args.id)
  },
})
