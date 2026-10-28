import { useCallback, useEffect, useState } from 'react';
import Home from './pages/Home.jsx';
import Auth from './pages/Auth.jsx';
import { ApiError, onUnauthorized, tokenStorage } from './api/http.js';
import { fetchMe } from './api/auth.js';

export default function App() {
  const [session, setSession] = useState(null);
  const [verificationEnCours, setVerificationEnCours] = useState(true);
  const [erreurReseau, setErreurReseau] = useState(false);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setSession(null);
  }, []);

  // Un 401 sur n'importe quelle requête (jeton expiré ou falsifié) ramène à l'écran de connexion.
  useEffect(() => {
    onUnauthorized(logout);
    return () => onUnauthorized(null);
  }, [logout]);

  // Au chargement : le jeton conservé n'est valable que si l'API le confirme.
  const verifierSession = useCallback(() => {
    const token = tokenStorage.get();
    if (!token) {
      setVerificationEnCours(false);
      return;
    }

    setVerificationEnCours(true);
    setErreurReseau(false);
    fetchMe()
      .then((user) => setSession({ token, user }))
      .catch((error) => {
        // Seul un refus d'authentification (401) invalide le jeton : une panne réseau ne déconnecte pas.
        if (error instanceof ApiError && error.status === 0) setErreurReseau(true);
        else tokenStorage.clear();
      })
      .finally(() => setVerificationEnCours(false));
  }, []);

  useEffect(() => {
    verifierSession();
  }, [verifierSession]);

  function handleAuthenticated({ token, user }) {
    tokenStorage.set(token);
    setSession({ token, user });
  }

  if (verificationEnCours) {
    return <main className="auth-page"><p className="auth-loading" role="status">Vérification de ta session…</p></main>;
  }

  if (erreurReseau) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="auth-error" role="alert">Le serveur est inaccessible pour le moment.</p>
          <button className="primary-button auth-submit" type="button" onClick={verifierSession}>Réessayer</button>
        </section>
      </main>
    );
  }

  if (!session) return <Auth onAuthenticated={handleAuthenticated} />;
  return <Home user={session.user} onLogout={logout} />;
}
