import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: [
      'd99c10a0-cc99-4b63-81c2-a1dfbfc73ace.lovableproject.com',
      'localhost',
      '127.0.0.1',
    ],
  },
});