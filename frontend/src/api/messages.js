import { request } from './http.js';

// Premier message (ou suivant) d'un acheteur au vendeur d'une annonce.
export const sendMessage = (annonceId, message) => request(`/annonces/${annonceId}/messages`, { method: 'POST', body: { message } });

export async function listConversations({ signal } = {}) {
  const { items } = await request('/conversations', { signal });
  return items;
}

export const getConversation = (annonceId, interlocuteurId, { signal } = {}) =>
  request(`/conversations/${annonceId}/${interlocuteurId}`, { signal });

// Réponse dans une conversation existante (acheteur ou vendeur).
export const replyToConversation = (annonceId, interlocuteurId, message) =>
  request(`/conversations/${annonceId}/${interlocuteurId}/messages`, { method: 'POST', body: { message } });
