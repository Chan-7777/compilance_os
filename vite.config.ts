/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Refuse to build a bundle with no database client in it.
//
// src/lib/supabase.ts falls back to a `null` stub when VITE_SUPABASE_URL or
// VITE_SUPABASE_ANON_KEY are absent, and App.tsx turns SUPABASE_ENABLED off to
// match. At build time that makes the branch statically dead, so Rollup drops
// all ~197 kB of @supabase/supabase-js: the bundle goes from 957 kB to 759 kB
// and the build still exits 0. The result looks healthy, ships, and cannot talk
// to the database. A clean checkout has no .env, so this is the default
// outcome of building one.
//
// Building without Supabase on purpose is still allowed - say so explicitly
// with VITE_ALLOW_NO_SUPABASE=true.
function assertSupabaseConfigured(mode: string) {
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const read = (key: string) => process.env[key] || fileEnv[key]

  if (read('VITE_ALLOW_NO_SUPABASE') === 'true') return

  const missing = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].filter((k) => !read(k))
  if (missing.length === 0) return

  throw new Error(
    [
      '',
      `Refusing to build: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set.`,
      '',
      'Without these the Supabase client is tree-shaken out of the bundle and the',
      'app ships unable to reach the database - but the build still succeeds, so',
      'nothing tells you. That is why this fails here instead.',
      '',
      'Fix it by putting the values in .env.local (see .env.example), or, if a',
      'database-less bundle is genuinely what you want, build with:',
      '',
      '    VITE_ALLOW_NO_SUPABASE=true npm run build',
      '',
    ].join('\n')
  )
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') assertSupabaseConfigured(mode)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
        '@components': resolve(__dirname, './src/components'),
        '@data': resolve(__dirname, './src/data'),
        '@utils': resolve(__dirname, './src/utils'),
        '@hooks': resolve(__dirname, './src/hooks'),
        '@types': resolve(__dirname, './src/types'),
        '@theme': resolve(__dirname, './src/theme'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
      exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*', '**/index.ts'],
      },
    },
  }
})
