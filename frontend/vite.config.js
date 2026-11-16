import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The sample API responses live in docs/api-samples, outside this folder.
const samples = fileURLToPath(new URL('../docs/api-samples', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@samples': samples } },
  server: { fs: { allow: ['..'] } },
})
