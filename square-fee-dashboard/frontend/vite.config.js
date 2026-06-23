import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// The frontend NEVER calls Square directly. It calls the local backend.
// In dev we proxy /api -> http://localhost:8080 so there are no CORS issues.
export default defineConfig({
    plugins: [react()],
    server: {
        host: true,
        port: 5173,
        proxy: {
            '/api': {
                target: process.env.VITE_API_TARGET || 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
});
