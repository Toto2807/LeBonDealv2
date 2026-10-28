import { useState } from 'react';
import Modal from './Modal.jsx';
import { CATEGORIES, ETATS } from '../constants.js';

const VIDE = { titre: '', prix: '', categorie: CATEGORIES[0], etat: 'Très bon état', ville: '', codePostal: '', photo: '', description: '' };

function depuisAnnonce(annonce) {
  return {
    titre: annonce.titre,
    prix: String(annonce.prix),
    categorie: annonce.categorie,
    etat: annonce.etat,
    ville: annonce.ville,
    codePostal: annonce.codePostal ?? '',
    photo: annonce.photo ?? '',
    description: annonce.description,
  };
}

// Création : les champs facultatifs vides sont omis. Modification : ils sont remis à null (ou '').
function versPayload(form, enEdition) {
  const payload = {
    titre: form.titre.trim(),
    prix: Number(form.prix),
    categorie: form.categorie,
    etat: form.etat,
    ville: form.ville.trim(),
    description: form.description.trim(),
  };
  const codePostal = form.codePostal.trim();
  const photo = form.photo.trim();
  if (codePostal || enEdition) payload.codePostal = codePostal || null;
  if (photo || enEdition) payload.photo = photo || null;
  return payload;
}

export default function AnnonceForm({ annonce, onSubmit, onClose }) {
  const enEdition = Boolean(annonce);
  const [form, setForm] = useState(enEdition ? depuisAnnonce(annonce) : VIDE);
  const [erreur, setErreur] = useState('');
  const [enCours, setEnCours] = useState(false);

  const champ = (nom) => ({ value: form[nom], onChange: (event) => setForm({ ...form, [nom]: event.target.value }) });

  async function handleSubmit(event) {
    event.preventDefault();
    setErreur('');
    setEnCours(true);
    try {
      await onSubmit(versPayload(form, enEdition));
    } catch (error) {
      setErreur(error.message);
      setEnCours(false);
    }
  }

  return (
    <Modal className="deposit-modal" titleId="deposit-title" onClose={onClose}>
      <p className="eyebrow">{enEdition ? 'MODIFICATION' : 'VENTE RAPIDE'}</p>
      <h2 id="deposit-title">{enEdition ? 'Modifier l’annonce' : 'Déposer une annonce'}</h2>
      <p className="form-intro">{enEdition ? 'Mets à jour les informations de ton article.' : 'Présente ton article pour le proposer près de chez toi.'}</p>
      <form onSubmit={handleSubmit} className="deposit-form">
        <label>Titre de l’annonce *<input required maxLength="120" data-autofocus {...champ('titre')} placeholder="Ex. Clavier mécanique sans fil" /></label>
        <div className="form-columns">
          <label>Prix (€) *<input required type="number" min="0" max="1000000" step="1" {...champ('prix')} placeholder="85" /></label>
          <label>Catégorie *<select {...champ('categorie')}>{CATEGORIES.map((categorie) => <option key={categorie}>{categorie}</option>)}</select></label>
        </div>
        <div className="form-columns">
          <label>État<select {...champ('etat')}>{ETATS.map((etat) => <option key={etat}>{etat}</option>)}</select></label>
          <label>Ville *<input required maxLength="80" {...champ('ville')} placeholder="Ex. Bordeaux" /></label>
        </div>
        <div className="form-columns">
          <label>Code postal <span className="field-hint">(facultatif)</span><input inputMode="numeric" pattern="[0-9]{5}" title="5 chiffres" {...champ('codePostal')} placeholder="33000" /></label>
          <label>Photo (URL) <span className="field-hint">(facultatif)</span><input type="url" maxLength="500" {...champ('photo')} placeholder="https://…" /></label>
        </div>
        <label>Description<textarea rows="4" maxLength="2000" {...champ('description')} placeholder="Décris l’état et les accessoires inclus…" /></label>
        {erreur && <p className="form-error" role="alert">{erreur}</p>}
        <button type="submit" className="primary-button submit-button" disabled={enCours}>{enCours ? 'Envoi…' : enEdition ? 'Enregistrer les modifications' : 'Publier mon annonce'} <span>→</span></button>
      </form>
    </Modal>
  );
}

