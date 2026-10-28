import { AppError, notFoundError } from '../errors/AppError.js';
import { config } from '../config/env.js';

export function notFound(_req, _res, next) {
    next(notFoundError('Route introuvable'));
}

function toPayload(code, message) {
    return { error: { code, message } };
}

// Dernier middleware : aucune trace serveur ni détail interne n'est renvoyé au client.
// Express 5 transmet ici les erreurs levées dans les handlers async.
export function errorHandler(err, _req, res, next) {
    if (res.headersSent) return next(err);

    if (err instanceof AppError) {
        return res.status(err.status).json(toPayload(err.code, err.message));
    }
    // Erreurs du parseur JSON : corps mal formé, trop gros, encodage inconnu.
    if (typeof err.type === 'string' && /^(entity|encoding|charset)\./.test(err.type)) {
        return res.status(400).json(toPayload('INVALID_INPUT', 'Corps de requête invalide'));
    }
    // Filet de sécurité : les validateurs doivent déjà avoir rejeté ces cas.
    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json(toPayload('INVALID_INPUT', 'Données invalides'));
    }

    if (config.env !== 'test') console.error(err);
    return res.status(500).json(toPayload('INTERNAL_ERROR', 'Erreur interne du serveur'));
}
