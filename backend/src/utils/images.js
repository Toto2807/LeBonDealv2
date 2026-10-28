// Les photos téléversées sont servies sous /api/images/<id> ; une annonce y fait référence dans son champ `photo`.
export const IMAGE_URL = /^\/api\/images\/([0-9a-f]{24})$/;

export const imageUrl = (id) => `/api/images/${id}`;

// Identifiant de l'image si `photo` est une photo téléversée, sinon null (URL externe, absence de photo).
export function imageIdFromUrl(photo) {
    return typeof photo === 'string' ? (IMAGE_URL.exec(photo)?.[1] ?? null) : null;
}
