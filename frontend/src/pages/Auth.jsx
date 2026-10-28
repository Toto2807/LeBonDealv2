import { useState } from 'react';
import { login, register } from '../api/auth.js';

// Messages lisibles par code d'erreur contractuel ; les 400 affichent le détail renvoyé par l'API.
function messageFor(error, mode) {
  if (error.code === 'UNAUTHORIZED') return 'Email ou mot de passe incorrect.';
  if (error.code === 'EMAIL_ALREADY_USED') return 'Un compte existe déjà avec cet email. Connecte-toi plutôt.';
  if (error.code === 'INVALID_INPUT') {
    return mode === 'register' ? `Inscription impossible : ${error.message}.` : 'Saisis un email et un mot de passe valides.';
  }
  return error.message;
}

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (mode === 'register' && password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setEnCours(true);
    try {
      const credentials = { email: email.trim(), password };
      const result = mode === 'register' ? await register(credentials) : await login(credentials);
      onAuthenticated(result);
    } catch (requestError) {
      setError(messageFor(requestError, mode));
    } finally {
      setEnCours(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand"><span className="brand-mark">B</span><span>LeBon<span className="brand-accent">Deal</span></span></div>
        <p className="eyebrow">BIENVENUE SUR LE BON DEAL</p>
        <h1 id="auth-title">{mode === 'login' ? 'Content de te revoir.' : 'Crée ton compte.'}</h1>
        <p className="auth-subtitle">{mode === 'login' ? 'Connecte-toi pour retrouver les bonnes affaires.' : 'Inscris-toi pour découvrir et publier des annonces.'}</p>

        <div className="auth-tabs" role="tablist" aria-label="Authentification">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'auth-tab selected' : 'auth-tab'} onClick={() => changeMode('login')}>Connexion</button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'auth-tab selected' : 'auth-tab'} onClick={() => changeMode('register')}>Créer un compte</button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Adresse e-mail<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="toi@exemple.fr" /></label>
          <label>Mot de passe<input required type="password" minLength="8" maxLength="72" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="8 caractères minimum" /></label>
          {mode === 'register' && <label>Confirmer le mot de passe<input required type="password" minLength="8" maxLength="72" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Répète ton mot de passe" /></label>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={enCours}>{enCours ? 'Connexion…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'} <span>→</span></button>
        </form>
        <p className="auth-terms">En continuant, tu acceptes de rejoindre la communauté LeBonDeal.</p>
      </section>
    </main>
  );
}
