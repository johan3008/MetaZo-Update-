import { app } from '../server.ts';

export default async function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (error: any) {
    console.error('Vercel API error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Vercel API Error',
        message: error.message,
        stack: error.stack
      });
    }
  }
}
