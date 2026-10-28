import { Router } from 'express';
import * as messageController from '../controllers/messageController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

// Boîte de réception : GET /api/messages. L'envoi passe par POST /api/annonces/:id/messages.
export const messageRouter = Router();
messageRouter.use(requireAuth);

messageRouter.get('/', messageController.inbox);
