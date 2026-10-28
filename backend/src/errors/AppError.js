// Erreur applicative : transformée en JSON {"error":{"code","message"}} par errorHandler.
export class AppError extends Error {
    constructor(status, code, message) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
    }
}

export const invalidInput = (message = 'Données invalides') => new AppError(400, 'INVALID_INPUT', message);
export const unauthorized = (message = 'Authentification requise') => new AppError(401, 'UNAUTHORIZED', message);
export const notFoundError = (message = 'Ressource introuvable') => new AppError(404, 'NOT_FOUND', message);
export const emailAlreadyUsed = () => new AppError(409, 'EMAIL_ALREADY_USED', 'Cet email est déjà utilisé');
