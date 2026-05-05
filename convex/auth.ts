import { createClient } from '@convex-dev/better-auth'
import type { GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { v } from 'convex/values'

import { betterAuth } from 'better-auth/minimal'

import type { DataModel } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'

import { components } from './_generated/api'
import { mutation, query } from './_generated/server'
import authConfig from './auth.config'

const CLEANUP_BATCH_SIZE = 100
const LEGACY_TEST_EMAIL_PATTERN = /^test-\d+@example\.com$/

export const authComponent = createClient<DataModel>(components.betterAuth)

function requireSiteUrl() {
  const siteUrl = process.env.SITE_URL
  if (!siteUrl) {
    throw new Error('[auth] SITE_URL environment variable is required')
  }
  return siteUrl
}

function isTestUserEmail(email: string) {
  return (
    email.endsWith('@example.test') ||
    email === 'test@example.com' ||
    LEGACY_TEST_EMAIL_PATTERN.test(email)
  )
}

function assertCleanupAuthorized(cleanupSecret: string) {
  const expectedSecret = process.env.E2E_CLEANUP_SECRET
  if (!expectedSecret || cleanupSecret !== expectedSecret) {
    throw new Error('Unauthorized test user cleanup request.')
  }
}

function assertTestUserEmail(email: string) {
  if (!isTestUserEmail(email)) {
    throw new Error('Cleanup is restricted to test user accounts.')
  }
}

async function findUserByEmail(ctx: MutationCtx, email: string) {
  return await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'user',
    where: [{ field: 'email', value: email }],
  })
}

async function deleteAuthRowsForUser(ctx: MutationCtx, userId: string) {
  const deleteAllByUserId = async (
    model:
      | 'session'
      | 'account'
      | 'twoFactor'
      | 'oauthApplication'
      | 'oauthAccessToken'
      | 'oauthConsent',
  ) => {
    const deletePage = async (cursor: string | null): Promise<void> => {
      const result: { continueCursor?: string | null } = await ctx.runMutation(
        components.betterAuth.adapter.deleteMany,
        {
          input: {
            model,
            where: [{ field: 'userId', value: userId }],
          },
          paginationOpts: { cursor, numItems: CLEANUP_BATCH_SIZE },
        },
      )
      const nextCursor = result.continueCursor ?? null
      if (nextCursor !== null) {
        await deletePage(nextCursor)
      }
    }

    await deletePage(null)
  }

  await deleteAllByUserId('session')
  await deleteAllByUserId('account')
  await deleteAllByUserId('twoFactor')
  await deleteAllByUserId('oauthApplication')
  await deleteAllByUserId('oauthAccessToken')
  await deleteAllByUserId('oauthConsent')
  await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
    input: {
      model: 'user',
      where: [{ field: '_id', value: userId }],
    },
  })
}

async function deleteTodosForUser(ctx: MutationCtx, userId: string) {
  const todos = await ctx.db
    .query('todos')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .take(CLEANUP_BATCH_SIZE)

  if (todos.length === 0) {
    return
  }

  await Promise.all(todos.map((todo) => ctx.db.delete(todo['_id'])))

  if (todos.length === CLEANUP_BATCH_SIZE) {
    await deleteTodosForUser(ctx, userId)
  }
}

export function createAuth(ctx: GenericCtx<DataModel>) {
  return betterAuth({
    baseURL: requireSiteUrl(),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    rateLimit: {
      storage: 'database',
    },
    plugins: [convex({ authConfig })],
  })
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx)
  },
})

export const cleanupTestUser = mutation({
  args: {
    cleanupSecret: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    assertCleanupAuthorized(args.cleanupSecret)
    assertTestUserEmail(args.email)

    const user = await findUserByEmail(ctx, args.email)
    if (!user) {
      return { deleted: false }
    }

    const userId = user['_id']

    await deleteTodosForUser(ctx, userId)
    await deleteAuthRowsForUser(ctx, userId)
    return { deleted: true }
  },
})
