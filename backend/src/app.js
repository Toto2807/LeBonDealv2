import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import { authRouter } from './routes/authRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { annonceRouter } from './routes/annonceRoutes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

// --- Routes métier : chaque feature monte son routeur ici ---
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/annonces', annonceRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
