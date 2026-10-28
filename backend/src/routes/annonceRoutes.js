import { Router } from 'express';
import * as annonceController from '../controllers/annonceController.js';
import * as messageController from '../controllers/messageController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const annonceRouter = Router();
annonceRouter.use(requireAuth);

annonceRouter.get('/', annonceController.list);
// Déclarée avant '/:id' pour ne pas être prise pour un identifiant.
annonceRouter.get('/suggestions', annonceController.suggestions);
annonceRouter.post('/', annonceController.create);
annonceRouter.get('/:id', annonceController.getOne);
annonceRouter.patch('/:id', annonceController.update);
annonceRouter.delete('/:id', annonceController.remove);
// Contacter le vendeur d'une annonce.
annonceRouter.post('/:id/messages', messageController.send);