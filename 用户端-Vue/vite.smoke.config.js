/* 冒烟测试专用：单文件 IIFE 构建（jsdom 不支持 ES module script） */
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist-smoke',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'smoke-bundle.js',
        assetFileNames: 'smoke-assets[extname]'
      }
    }
  }
});
