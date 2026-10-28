import { authRouter } from './authRoutes.js';
import { userRouter } from './userRoutes.js';
import { annonceRouter } from './annonceRoutes.js';
import { favoriRouter } from './favoriRoutes.js';
import { conversationRouter } from './conversationRoutes.js';

// Source unique des routes métier : app.js les monte, les tests les comparent à la documentation OpenAPI.
export const apiRouters = [
    ['/api/auth', authRouter],
    ['/api/users', userRouter],
    ['/api/annonces', annonceRouter],
    ['/api/favoris', favoriRouter],
    ['/api/conversation', conversationRouter],
];
