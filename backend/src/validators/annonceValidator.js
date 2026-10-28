import { invalidInput } from '../errors/AppError.js';
import { CATEGORIES, ETATS, STATUTS, PRIX_MAX } from '../models/Annonce.js';
import { assertBodyObject, assertAllowedKeys, cleanString, cleanEnum, cleanInteger } from './common.js';

const WRITABLE_FIELDS = ['titre', 'description', 'prix', 'categorie', 'etat', 'statut', 'photo', 'ville', 'codePostal'];
const REQUIRED_ON_CREATE = ['titre', 'prix', 'categorie', 'ville'];
const CODE_POSTAL = /^\d{5}$/;

function cleanPhoto(value) {
    if (value === null) return null;
    const url = cleanString(value, 'photo', { max: 500 });
    let parsed;
    try {
        parsed = new URL(url);
    } catch {
        throw invalidInput('photo doit être une URL valide');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw invalidInput('photo doit être une URL http ou https');
    return url;
}

function cleanCodePostal(value) {
    if (value === null) return null;
    if (typeof value !== 'string' || !CODE_POSTAL.test(value)) throw invalidInput('codePostal doit contenir 5 chiffres');
    return value;
}

// Un validateur par champ : le même est utilisé pour POST (complet) et PATCH (partiel).
const FIELD_VALIDATORS = {
    titre: (value) => cleanString(value, 'titre', { max: 120 }),
    description: (value) => cleanString(value, 'description', { min: 0, max: 2000 }),
    prix: (value) => cleanInteger(value, 'prix', { min: 0, max: PRIX_MAX }),
    categorie: (value) => cleanEnum(value, 'categorie', CATEGORIES),
    etat: (value) => cleanEnum(value, 'etat', ETATS),
    statut: (value) => cleanEnum(value, 'statut', STATUTS),
    photo: cleanPhoto,
    ville: (value) => cleanString(value, 'ville', { max: 80 }),
    codePostal: cleanCodePostal,
};

function cleanFields(body) {
    assertBodyObject(body);
    assertAllowedKeys(body, WRITABLE_FIELDS);
    const clean = {};
    for (const [field, value] of Object.entries(body)) {
        clean[field] = FIELD_VALIDATORS[field](value);
    }
    return clean;
}

export function validateCreate(body) {
    const clean = cleanFields(body);
    const missing = REQUIRED_ON_CREATE.filter((field) => !(field in clean));
    if (missing.length > 0) throw invalidInput(`Champ(s) obligatoire(s) manquant(s) : ${missing.join(', ')}`);
    return clean;
}

// PATCH partiel et non vide : seuls les champs fournis sont modifiés.
export function validatePatch(body) {
    const clean = cleanFields(body);
    if (Object.keys(clean).length === 0) throw invalidInput('Le corps du PATCH ne doit pas être vide');
    return clean;
}

const QUERY_KEYS = ['q', 'categorie', 'prixMax', 'disponibles', 'mine', 'favoris', 'page', 'limit'];
export const LIMIT_DEFAULT = 50;
export const LIMIT_MAX = 100;

function queryString(value, label) {
    if (typeof value !== 'string') throw invalidInput(`${label} invalide`);
    return value;
}

function queryBoolean(value, label) {
    if (value !== 'true' && value !== 'false') throw invalidInput(`${label} doit valoir true ou false`);
    return value === 'true';
}

function queryInteger(value, label, { min, max }) {
    if (typeof value !== 'string' || !/^\d{1,9}$/.test(value)) throw invalidInput(`${label} doit être un entier`);
    return cleanInteger(Number(value), label, { min, max });
}

// Paramètres de GET /api/annonces. Toute valeur invalide ou clé inconnue est refusée en 400.
export function validateListQuery(query) {
    assertAllowedKeys(query, QUERY_KEYS);
    const clean = { page: 1, limit: LIMIT_DEFAULT };
    if ('q' in query) clean.q = cleanString(queryString(query.q, 'q'), 'q', { min: 1, max: 100 });
    if ('categorie' in query) clean.categorie = cleanEnum(query.categorie, 'categorie', CATEGORIES);
    if ('prixMax' in query) clean.prixMax = queryInteger(query.prixMax, 'prixMax', { min: 0, max: PRIX_MAX });
    if ('disponibles' in query) clean.disponibles = queryBoolean(query.disponibles, 'disponibles');
    if ('mine' in query) clean.mine = queryBoolean(query.mine, 'mine');
    if ('favoris' in query) clean.favoris = queryBoolean(query.favoris, 'favoris');
    if ('page' in query) clean.page = queryInteger(query.page, 'page', { min: 1, max: 100000 });
    if ('limit' in query) clean.limit = queryInteger(query.limit, 'limit', { min: 1, max: LIMIT_MAX });
    return clean;
}
