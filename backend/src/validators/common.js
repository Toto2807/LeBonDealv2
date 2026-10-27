import { invalidInput } from '../errors/AppError.js';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// mongoose.isValidObjectId accepte aussi n'importe quelle chaîne de 12 caractères : on exige 24 hexa.
export function isObjectId(value) {
    return typeof value === 'string' && OBJECT_ID.test(value);
}

export function assertObjectId(value, label = 'Identifiant') {
    if (!isObjectId(value)) throw invalidInput(`${label} invalide`);
    return value;
}

export function assertBodyObject(body) {
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        throw invalidInput('Le corps de la requête doit être un objet JSON');
    }
    return body;
}

// Refuse toute propriété inconnue (dont id, ownerId, createdAt... jamais modifiables par le client).
export function assertAllowedKeys(body, allowedKeys) {
    const unknown = Object.keys(body).filter((key) => !allowedKeys.includes(key));
    if (unknown.length > 0) throw invalidInput(`Champ(s) non autorisé(s) : ${unknown.join(', ')}`);
}

// Chaîne obligatoire de min à max caractères après trim.
export function cleanString(value, label, { min = 1, max }) {
    if (typeof value !== 'string') throw invalidInput(`${label} doit être une chaîne de caractères`);
    const trimmed = value.trim();
    if (trimmed.length < min || trimmed.length > max) {
        throw invalidInput(`${label} doit contenir entre ${min} et ${max} caractères`);
    }
    return trimmed;
}

export function cleanEnum(value, label, allowedValues) {
    if (!allowedValues.includes(value)) throw invalidInput(`${label} doit valoir : ${allowedValues.join(', ')}`);
    return value;
}

export function cleanInteger(value, label, { min, max }) {
    if (!Number.isSafeInteger(value) || value < min || value > max) {
        throw invalidInput(`${label} doit être un entier entre ${min} et ${max}`);
    }
    return value;
}
