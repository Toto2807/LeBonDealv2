import { useState } from 'react';
import { sendMessage } from '../api/messages.js';

const MESSAGE_MAX = 1000;

// Formulaire "Contacter le vendeur" affiché dans le détail d'une annonce d'un autre compte.
export default function ContactForm({ annonce, onSent, onCancel, onOuvrirConversation }) {
  const [message, setMessage] = useState('');
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');
    setEnCours(true);
    try {
      await sendMessage(annonce.id, message.trim());
      setEnvoye(true);
      onSent?.('Message envoyé au vendeur.');
    } catch (error) {
      setErreur(error.message);
    } finally {
      setEnCours(false);
    }
  }

  if (envoye) {
    return (
      <div className="contact-sent" role="status">
        <span>✓ Message envoyé à {annonce.vendeur.nom}. Sa réponse arrivera dans tes messages.</span>
        <button type="button" className="secondary-button" onClick={onOuvrirConversation}>Voir la conversation</button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <label htmlFor="contact-message">Ton message à {annonce.vendeur.nom}</label>
      <textarea
        id="contact-message"
        required
        autoFocus
        rows="3"
        maxLength={MESSAGE_MAX}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Bonjour, cet article est-il toujours disponible ?"
      />
      <div className="contact-actions">
        <span className="field-hint">{message.length}/{MESSAGE_MAX}</span>
        <button type="button" className="secondary-button" disabled={enCours} onClick={onCancel}>Annuler</button>
        <button type="submit" className="primary-button" disabled={enCours || message.trim() === ''}>{enCours ? 'Envoi…' : 'Envoyer'}</button>
      </div>
      {erreur && <p className="form-error" role="alert">{erreur}</p>}
    </form>
  );
}
