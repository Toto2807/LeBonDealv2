import { useEffect, useState } from 'react';
import { listReceivedMessages } from '../api/messages.js';
import { formatDateRelative } from '../utils/format.js';

// Boîte de réception : messages reçus des acheteurs sur mes annonces.
export default function MessagesList() {
  const [messages, setMessages] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setChargement(true);
    setErreur('');
    listReceivedMessages({ signal: controller.signal })
      .then(setMessages)
      .catch((error) => {
        if (error.name !== 'AbortError') setErreur(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChargement(false);
      });
    return () => controller.abort();
  }, [version]);

  if (erreur) {
    return <div className="state-banner" role="alert"><span>{erreur}</span><button className="secondary-button" onClick={() => setVersion((v) => v + 1)}>Réessayer</button></div>;
  }
  if (chargement) return <p className="loading-text" role="status">Chargement des messages…</p>;
  if (messages.length === 0) {
    return (
      <section className="empty-state">
        <span className="empty-icon" aria-hidden="true">✉</span>
        <h2>Aucun message reçu</h2>
        <p>Quand un acheteur te contactera à propos d’une annonce, son message apparaîtra ici.</p>
      </section>
    );
  }

  return (
    <ul className="message-list" aria-label="Messages reçus">
      {messages.map((message) => (
        <li className="message-item" key={message.id}>
          <div className="message-head">
            <strong>{message.from.nom}</strong>
            <span>à propos de « {message.annonceTitre ?? 'annonce supprimée'} »</span>
            <time dateTime={message.createdAt}>{formatDateRelative(message.createdAt)}</time>
          </div>
          <p>{message.message}</p>
        </li>
      ))}
    </ul>
  );
}
