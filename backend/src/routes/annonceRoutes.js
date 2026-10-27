import { Router } from 'express';
import * as annonceController from '../controllers/annonceController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const annonceRouter = Router();
annonceRouter.use(requireAuth);

annonceRouter.get('/', annonceController.list);
annonceRouter.post('/', annonceController.create);
annonceRouter.get('/:id', annonceController.getOne);
annonceRouter.patch('/:id', annonceController.update);
annonceRouter.delete('/:id', annonceController.remove);
