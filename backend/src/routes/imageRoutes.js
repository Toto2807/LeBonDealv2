import express, { Router } from 'express';
import * as imageController from '../controllers/imageController.js';
import { requireAuth } from '../middlewares/requireAuth.js';
import { IMAGE_TYPES, IMAGE_MAX_BYTES } from '../models/Image.js';

export const imageRouter = Router();

// L'authentification passe avant la lecture du corps : un anonyme ne peut pas faire envoyer 5 Mo au serveur.
imageRouter.post('/', requireAuth, express.raw({ type: IMAGE_TYPES, limit: IMAGE_MAX_BYTES }), imageController.upload);
imageRouter.get('/:id', imageController.download);
