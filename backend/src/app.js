import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { apiRouters } from './routes/index.js';
import { docsRouter } from './docs/swagger.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

// --- Routes métier (liste dans routes/index.js) et documentation OpenAPI ---
for (const [path, router] of apiRouters) {
  app.use(path, router);
}
app.use('/api', docsRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
