import { app } from '../dist/server.cjs';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default app;
