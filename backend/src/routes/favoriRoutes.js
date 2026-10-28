import { Router } from 'express';
import * as favoriController from '../controllers/favoriController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

export const favoriRouter = Router();
favoriRouter.use(requireAuth);

favoriRouter.put('/:annonceId', favoriController.add);
favoriRouter.delete('/:annonceId', favoriController.remove);
