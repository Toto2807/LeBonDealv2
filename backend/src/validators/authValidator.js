import { invalidInput } from '../errors/AppError.js';
import { assertBodyObject, assertAllowedKeys } from './common.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 8;
// bcrypt ignore tout ce qui dépasse 72 octets : on refuse plutôt que de tronquer silencieusement.
export const PASSWORD_MAX_BYTES = 72;

function cleanEmail(value) {
    if (typeof value !== 'string') throw invalidInput('email doit être une chaîne de caractères');
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !EMAIL.test(email)) throw invalidInput('email invalide');
    return email;
}

function cleanPassword(value, { checkLength }) {
    if (typeof value !== 'string' || value.length === 0) throw invalidInput('password est obligatoire');
    if (checkLength && value.length < PASSWORD_MIN) {
        throw invalidInput(`password doit contenir au moins ${PASSWORD_MIN} caractères`);
    }
    if (checkLength && Buffer.byteLength(value) > PASSWORD_MAX_BYTES) {
        throw invalidInput(`password ne doit pas dépasser ${PASSWORD_MAX_BYTES} octets`);
    }
    return value;
}

// register : politique de mot de passe complète.
export function validateRegister(body) {
    assertBodyObject(body);
    assertAllowedKeys(body, ['email', 'password']);
    return { email: cleanEmail(body.email), password: cleanPassword(body.password, { checkLength: true }) };
}

// login : on n'indique jamais pourquoi la connexion échoue, donc pas de contrôle de longueur ici.
export function validateLogin(body) {
    assertBodyObject(body);
    assertAllowedKeys(body, ['email', 'password']);
    return { email: cleanEmail(body.email), password: cleanPassword(body.password, { checkLength: false }) };
}
