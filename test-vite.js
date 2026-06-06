import express from 'express';
import { createServer as createViteServer } from 'vite';

async function start() {
    const app = express();
    const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
    });
    app.use(vite.middlewares);
    app.listen(3001, () => console.log('listening'));
}
start();
