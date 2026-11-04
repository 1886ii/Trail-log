import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],

  /* 相对路径：构建产物直接扔进 Spring Boot 的 static/ 也能跑 */
  base: './',

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },

  server: {
    host: '127.0.0.1',
    port: 5178,
    strictPort: true
  },

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    /* 目标是「单端口同源托管」，产物别做无谓的兼容降级 */
    target: 'es2019'
  }
});
