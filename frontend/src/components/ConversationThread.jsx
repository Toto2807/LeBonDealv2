import { useEffect, useRef, useState } from 'react';
import { getConversation, replyToConversation } from '../api/messages.js';
import { formatDateRelative, formatPrix } from '../utils/format.js';

const MESSAGE_MAX = 1000;
const RAFRAICHISSEMENT_MS = 10000;

// Fil de discussion d'une conversation : lecture, réponse, rafraîchissement automatique.
export default function ConversationThread({ annonceId, interlocuteurId, onBack, onEnvoye }) {
  const [fil, setFil] = useState(null);
  const [erreur, setErreur] = useState('');
  const [texte, setTexte] = useState('');
  const [erreurEnvoi, setErreurEnvoi] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [version, setVersion] = useState(0);
  const messagesRef = useRef(null);

  // Chargement à l'ouverture, puis rechargement silencieux toutes les 10 s (onglet visible uniquement).
  useEffect(() => {
    const controller = new AbortController();
    getConversation(annonceId, interlocuteurId, { signal: controller.signal })
      .then((resultat) => {
        setFil(resultat);
        setErreur('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setErreur(error.message);
      });
    return () => controller.abort();
  }, [annonceId, interlocuteurId, version]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setVersion((courant) => courant + 1);
    }, RAFRAICHISSEMENT_MS);
    return () => clearInterval(timer);
  }, []);

  const nombreMessages = fil?.items.length ?? 0;
  useEffect(() => {
    const zone = messagesRef.current;
    if (zone) zone.scrollTop = zone.scrollHeight;
  }, [nombreMessages]);

  async function envoyer(event) {
    event.preventDefault();
    const message = texte.trim();
    if (!message || enCours) return;
    setEnCours(true);
    setErreurEnvoi('');
    try {
      const envoye = await replyToConversation(annonceId, interlocuteurId, message);
      setFil((courant) => (courant ? { ...courant, items: [...courant.items, envoye] } : courant));
      setTexte('');
      onEnvoye?.();
    } catch (error) {
      setErreurEnvoi(error.message);
    } finally {
      setEnCours(false);
    }
  }

  // Entrée envoie, Maj+Entrée insère un retour à la ligne.
  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) envoyer(event);
  }

  if (erreur && !fil) return <div className="thread thread-empty" role="alert"><p>{erreur}</p></div>;
  if (!fil) return <div className="thread thread-empty" role="status"><p>Chargement de la conversation…</p></div>;

  return (
    <section className="thread" aria-label={`Conversation avec ${fil.interlocuteur.nom}`}>
      <header className="thread-head">
        <button type="button" className="thread-back secondary-button" onClick={onBack}>← Retour</button>
        <div className="thread-title">
          <strong>{fil.interlocuteur.nom}</strong>
          <span>{fil.annonce.titre} · {formatPrix(fil.annonce.prix)}</span>
        </div>
      </header>

      <div className="thread-messages" ref={messagesRef} role="log" aria-live="polite" aria-label="Messages">
        {fil.items.map((message) => (
          <div key={message.id} className={message.fromMe ? 'bubble mine' : 'bubble'}>
            {message.message}
            <time dateTime={message.createdAt}>{message.fromMe ? 'Vous' : message.from.nom} · {formatDateRelative(message.createdAt)}</time>
          </div>
        ))}
      </div>

      <form className="reply-form" onSubmit={envoyer}>
        <label className="sr-only" htmlFor="reply-message">Votre réponse à {fil.interlocuteur.nom}</label>
        <textarea
          id="reply-message"
          rows="2"
          maxLength={MESSAGE_MAX}
          value={texte}
          onChange={(event) => setTexte(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message… (Entrée pour envoyer)"
        />
        <button type="submit" className="primary-button" disabled={enCours || texte.trim() === ''}>{enCours ? 'Envoi…' : 'Envoyer'}</button>
      </form>
      {erreurEnvoi && <p className="form-error thread-error" role="alert">{erreurEnvoi}</p>}
    </section>
  );
}
