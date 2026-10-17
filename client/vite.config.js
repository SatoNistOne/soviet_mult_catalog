import os from 'node:os';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

function lanAddress() {
    const candidates = Object.values(os.networkInterfaces())
        .flat()
        .filter((a) => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'));
    const preferred = candidates.find((a) => /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))\./.test(a.address));
    return (preferred || candidates[0])?.address || '127.0.0.1';
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const port = env.API_PORT || '8000';
    const apiBase = (env.API_BASE || `http://${lanAddress()}:${port}/api`).replace(/\/+$/, '');
    console.log(`API: ${apiBase}`);
    return {
        root: 'src',
        base: './',
        plugins: [react()],
        define: { __API_BASE__: JSON.stringify(apiBase) },
        build: { outDir: '../dist', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 900 },
    };
});
