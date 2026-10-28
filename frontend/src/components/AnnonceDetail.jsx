import { useState } from 'react';
import Modal from './Modal.jsx';
import AnnoncePhoto from './AnnoncePhoto.jsx';
import StatusBadge from './StatusBadge.jsx';
import ContactForm from './ContactForm.jsx';
import { STATUTS } from '../constants.js';
import { formatDateRelative, formatMembreDepuis, formatPrix } from '../utils/format.js';

export default function AnnonceDetail({ annonce, estProprietaire, occupe, erreur, onClose, onChangerStatut, onModifier, onSupprimer, onMessageEnvoye, onOuvrirConversation }) {
  const [confirmation, setConfirmation] = useState(false);
  const [contactOuvert, setContactOuvert] = useState(false);
  const vendeur = annonce.vendeur;

  return (
    <Modal className="detail-modal" titleId="detail-title" onClose={onClose}>
      <div className="detail-image">
        <AnnoncePhoto key={annonce.photo} src={annonce.photo} alt={annonce.titre} />
        <StatusBadge statut={annonce.statut} />
      </div>
      <div className="detail-title-row">
        <div>
          <span className="listing-category">{annonce.categorie}</span>
          <h2 id="detail-title">{annonce.titre}</h2>
          <p className="detail-location">⌖ {annonce.ville}{annonce.codePostal ? ` (${annonce.codePostal})` : ''} · Publié {formatDateRelative(annonce.createdAt).toLowerCase()}</p>
        </div>
        <strong className="detail-price">{formatPrix(annonce.prix)}</strong>
      </div>
      <div className="detail-description">
        <h3>Description</h3>
        <p>{annonce.description || 'Aucune description.'}</p>
        <span>État : {annonce.etat}</span>
      </div>

      <div className="seller-row">
        <div className="seller-avatar" aria-hidden="true">{vendeur.nom.slice(0, 1)}</div>
        <div className="seller-info">
          <strong>{estProprietaire ? `${vendeur.nom} (vous)` : vendeur.nom}</strong>
          <span>Membre depuis {formatMembreDepuis(vendeur.membreDepuis)}</span>
        </div>
        {!estProprietaire && !contactOuvert && (
          <div className="detail-actions"><button type="button" className="primary-button" onClick={() => setContactOuvert(true)}>✉ Contacter</button></div>
        )}
        {estProprietaire && (
          <div className="detail-actions">
            <select aria-label="Statut de l’annonce" value={annonce.statut} disabled={occupe} onChange={(event) => onChangerStatut(annonce, event.target.value)}>
              {STATUTS.map(([valeur, libelle]) => <option key={valeur} value={valeur}>{libelle}</option>)}
            </select>
            <button type="button" className="secondary-button" disabled={occupe} onClick={() => onModifier(annonce)}>Modifier</button>
            <button type="button" className="danger-button" disabled={occupe} onClick={() => setConfirmation(true)}>Supprimer</button>
          </div>
        )}
      </div>

      {!estProprietaire && contactOuvert && <ContactForm annonce={annonce} onSent={onMessageEnvoye} onCancel={() => setContactOuvert(false)} onOuvrirConversation={() => onOuvrirConversation(annonce)} />}

      {confirmation && (
        <div className="confirm-box" role="alertdialog" aria-labelledby="confirm-title">
          <strong id="confirm-title">Supprimer définitivement cette annonce ?</strong>
          <button type="button" className="secondary-button" autoFocus disabled={occupe} onClick={() => setConfirmation(false)}>Annuler</button>
          <button type="button" className="danger-button confirm" disabled={occupe} onClick={() => onSupprimer(annonce)}>Oui, supprimer</button>
        </div>
      )}
      {erreur && <p className="form-error detail-error" role="alert">{erreur}</p>}
    </Modal>
  );
}

