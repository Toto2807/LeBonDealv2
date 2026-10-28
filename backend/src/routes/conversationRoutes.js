import { Router } from 'express';
import * as messageController from '../controllers/messageController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

// Messagerie : une conversation = une annonce + l'autre participant.
// Le premier message d'un acheteur passe par POST /api/annonces/:id/messages ; ensuite, tout le monde répond ici.
export const conversationRouter = Router();
conversationRouter.use(requireAuth);

conversationRouter.get('/', messageController.conversations);
conversationRouter.get('/:annonceId/:interlocuteurId', messageController.conversation);
conversationRouter.post('/:annonceId/:interlocuteurId/messages', messageController.reply);
