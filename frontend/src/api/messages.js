import { request } from './http.js';

export const sendMessage = (annonceId, message) => request(`/annonces/${annonceId}/messages`, { method: 'POST', body: { message } });

export async function listReceivedMessages({ signal } = {}) {
  const { items } = await request('/messages', { signal });
  return items;
}
