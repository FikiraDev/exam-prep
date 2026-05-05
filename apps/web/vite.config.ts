import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const config = defineConfig(() => {
  const isVitest = process.env.VITEST === 'true'

  return {
    envDir: '../../',
    resolve: { tsconfigPaths: true },
    ssr: {
      noExternal: ['@convex-dev/better-auth'],
    },
    plugins: [
      devtools(),
      // Vitest injects Vite SSR externals that the Cloudflare plugin forbids.
      !isVitest && cloudflare({ viteEnvironment: { name: 'ssr' } }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  }
})

export default config
