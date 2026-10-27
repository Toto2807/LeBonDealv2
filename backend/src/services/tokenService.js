import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Algorithme figé : refuse "none" et toute confusion d'algorithme à la vérification.
const ALGORITHM = 'HS256';

// Le jeton ne contient que l'identifiant utilisateur (claim standard "sub") et sa date d'expiration.
export function signToken(userId) {
    return jwt.sign({}, config.jwtSecret, {
        algorithm: ALGORITHM,
        subject: String(userId),
        expiresIn: config.jwtExpiresIn,
    });
}

// Lève une erreur si le jeton est falsifié, mal formé ou expiré.
export function verifyToken(token) {
    return jwt.verify(token, config.jwtSecret, { algorithms: [ALGORITHM] });
}
