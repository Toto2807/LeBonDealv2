import { request } from './http.js';

// La liste des favoris se lit avec listAnnonces({ favoris: true }).
export const addFavori = (annonceId) => request(`/favoris/${annonceId}`, { method: 'PUT' });
export const removeFavori = (annonceId) => request(`/favoris/${annonceId}`, { method: 'DELETE' });
