import { useEffect, useState } from 'react';
import Home from './pages/Home.jsx';
import Auth from './pages/Auth.jsx';

export default function App() {
  const [session, setSession] = useState(null);
  const [verificationEnCours, setVerificationEnCours] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lebondeal_token');
    if (!token) {
      setVerificationEnCours(false);
      return;
    }

    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session expirée');
        const user = await response.json();
        setSession({ token, user });
      })
      .catch(() => localStorage.removeItem('lebondeal_token'))
      .finally(() => setVerificationEnCours(false));
  }, []);

  function handleAuthenticated(result) {
    localStorage.setItem('lebondeal_token', result.token);
    setSession({ token: result.token, user: result.user });
  }

  function logout() {
    localStorage.removeItem('lebondeal_token');
    setSession(null);
  }

  if (verificationEnCours) {
    return <main className="auth-page"><p className="auth-loading">Vérification de ta session…</p></main>;
  }

  if (!session) return <Auth onAuthenticated={handleAuthenticated} />;
  return <Home user={session.user} onLogout={logout} />;
}
