import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/*.spec.ts',
      'src/**/*.spec.tsx',
    ],
    exclude: [
      'node_modules',
      '.next',
      'supabase',
      'e2e',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/lib/**', 'src/hooks/**', 'src/components/**'],
      exclude: [
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'src/__tests__/**',
        'src/types/**',
      ],
      thresholds: {
        lines: 5,
        branches: 5,
        functions: 5,
        statements: 5,
      },
    },
    testTimeout: 10000,
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
