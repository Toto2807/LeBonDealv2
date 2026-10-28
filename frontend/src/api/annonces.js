import { request } from './http.js';

// filters : { q, categorie, prixMax, disponibles, mine, favoris, page, limit }
export async function listAnnonces(filters = {}, { signal } = {}) {
  const { items } = await request('/annonces', { query: filters, signal });
  return items;
}

export const getAnnonce = (id) => request(`/annonces/${id}`);
export const createAnnonce = (data) => request('/annonces', { method: 'POST', body: data });
export const updateAnnonce = (id, patch) => request(`/annonces/${id}`, { method: 'PATCH', body: patch });
export const deleteAnnonce = (id) => request(`/annonces/${id}`, { method: 'DELETE' });

// Propositions de recherche : [{ type: 'categorie' | 'etat' | 'ville' | 'annonce', value, id? }]
export async function fetchSuggestions(q, { signal } = {}) {
  const { items } = await request('/annonces/suggestions', { query: { q }, signal });
  return items;
}
