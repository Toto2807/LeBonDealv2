const TOKEN_KEY = 'lebondeal_token';

// Le localStorage peut être indisponible (navigation privée, stockage bloqué) : on ne plante jamais.
export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // La session ne survivra pas au rechargement de la page.
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Rien à nettoyer.
    }
  },
};

// Erreur normalisée : status HTTP (0 = serveur injoignable), code contractuel et message lisible.
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

let unauthorizedHandler = null;

// Appelé quand l'API répond 401 à une requête authentifiée (jeton expiré ou invalide).
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

function buildQuery(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export async function request(path, { method = 'GET', body, query, auth = true, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? tokenStorage.get() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}${buildQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError(0, 'NETWORK_ERROR', 'Le serveur est inaccessible. Réessaie dans un instant.');
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && auth && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(response.status, data?.error?.code ?? 'UNKNOWN', data?.error?.message ?? 'Une erreur est survenue.');
  }
  return data;
}
