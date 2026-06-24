import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.VERCEL_URL ?
      `https://${process.env.VERCEL_URL}` :
      'http://localhost:5173',
    supportFile: false,
  },
});