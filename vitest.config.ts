import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ロジック層のユニットテスト（Node 環境で十分。DOM は不要）
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
