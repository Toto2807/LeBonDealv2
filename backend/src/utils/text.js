const VARIANTES = {
    a: 'aàâäáãå',
    c: 'cç',
    e: 'eéèêë',
    i: 'iîïíì',
    n: 'nñ',
    o: 'oôöóòõ',
    u: 'uùûüú',
    y: 'yÿý',
};

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function stripAccents(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Motif d'expression régulière insensible aux accents (à utiliser avec l'option "i") :
// "velo" trouve "Vélo", "chene" trouve "chêne" et inversement. Les caractères spéciaux sont échappés.
export function accentInsensitivePattern(text) {
    return [...stripAccents(text).toLowerCase()]
        .map((lettre) => (VARIANTES[lettre] ? `[${VARIANTES[lettre]}${VARIANTES[lettre].toUpperCase()}]` : escapeRegex(lettre)))
        .join('');
}