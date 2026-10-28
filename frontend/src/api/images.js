import { request } from './http.js';

// Envoie une photo (Blob JPEG/PNG/WebP). Retourne { id, url, contentType, size } ; `url` se place dans le champ photo d'une annonce.
export const uploadImage = (fichier) => request('/images', { method: 'POST', body: fichier });
