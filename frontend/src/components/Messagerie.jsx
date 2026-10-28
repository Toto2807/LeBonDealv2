import { useCallback, useEffect, useState } from 'react';
import ConversationList from './ConversationList.jsx';
import ConversationThread from './ConversationThread.jsx';
import { listConversations } from '../api/messages.js';

const RAFRAICHISSEMENT_MS = 15000;

// Messagerie : liste des conversations à gauche, fil de discussion à droite (une seule colonne sur mobile).
export default function Messagerie({ selection, onSelect }) {
  const [conversations, setConversations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listConversations({ signal: controller.signal })
      .then((items) => {
        setConversations(items);
        setErreur('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setErreur(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChargement(false);
      });
    return () => controller.abort();
  }, [version]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setVersion((courant) => courant + 1);
    }, RAFRAICHISSEMENT_MS);
    return () => clearInterval(timer);
  }, []);

  const recharger = useCallback(() => setVersion((courant) => courant + 1), []);

  if (erreur && conversations.length === 0) {
    return <div className="state-banner" role="alert"><span>{erreur}</span><button className="secondary-button" onClick={recharger}>Réessayer</button></div>;
  }
  if (chargement) return <p className="loading-text" role="status">Chargement des messages…</p>;
  if (conversations.length === 0 && !selection) {
    return (
      <section className="empty-state">
        <span className="empty-icon" aria-hidden="true">✉</span>
        <h2>Aucune conversation</h2>
        <p>Contacte un vendeur depuis une annonce, ou attends qu’un acheteur t’écrive : vos échanges apparaîtront ici.</p>
      </section>
    );
  }

  return (
    <div className={selection ? 'messagerie has-selection' : 'messagerie'}>
      <ConversationList conversations={conversations} selection={selection} onSelect={onSelect} />
      {selection
        ? <ConversationThread key={`${selection.annonceId}:${selection.interlocuteurId}`} annonceId={selection.annonceId} interlocuteurId={selection.interlocuteurId} onBack={() => onSelect(null)} onEnvoye={recharger} />
        : <div className="thread thread-empty"><p>Choisis une conversation pour la lire et y répondre.</p></div>}
    </div>
  );
}
