import { convexTest } from 'convex-test'

import schema from './schema'

export function createAuthTestHarness() {
  return convexTest({ schema, modules: {} })
}
