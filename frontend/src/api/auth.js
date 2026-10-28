import { request } from './http.js';

// POST /api/auth/register et /api/auth/login : { user: { id, email }, token }
export const register = (credentials) => request('/auth/register', { method: 'POST', body: credentials, auth: false });
export const login = (credentials) => request('/auth/login', { method: 'POST', body: credentials, auth: false });

// GET /api/users/me : { id, email } — sert à valider un jeton conservé au rechargement.
export const fetchMe = () => request('/users/me');
