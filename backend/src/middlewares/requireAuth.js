import { unauthorized } from '../errors/AppError.js';
import { isObjectId } from '../validators/common.js';
import { verifyToken } from '../services/tokenService.js';

// Vérifie le JWT Bearer et expose req.userId. Le propriétaire des ressources vient
// toujours d'ici, jamais du corps de la requête.
export function requireAuth(req, _res, next) {
    const [scheme, token, ...extra] = (req.get('Authorization') ?? '').split(' ');
    if (!/^Bearer$/i.test(scheme) || !token || extra.length > 0) {
        throw unauthorized('Jeton d’authentification manquant');
    }

    let payload;
    try {
        payload = verifyToken(token);
    } catch {
        throw unauthorized('Jeton invalide ou expiré');
    }
    if (!isObjectId(payload.sub)) throw unauthorized('Jeton invalide ou expiré');

    req.userId = payload.sub;
    next();
}
