import AnnoncePhoto from './AnnoncePhoto.jsx';
import StatusBadge from './StatusBadge.jsx';
import { formatDateRelative, formatPrix } from '../utils/format.js';

export default function AnnonceCard({ annonce, onOpen, onToggleFavori }) {
  function handleKeyDown(event) {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(annonce);
    }
  }

  return (
    <article
      className="listing-card"
      tabIndex={0}
      aria-label={`${annonce.titre}, ${formatPrix(annonce.prix)}, ${annonce.ville}. Ouvrir l’annonce`}
      onClick={() => onOpen(annonce)}
      onKeyDown={handleKeyDown}
    >
      <div className="listing-photo">
        <AnnoncePhoto key={annonce.photo} src={annonce.photo} alt={annonce.titre} />
        <StatusBadge statut={annonce.statut} />
        <button
          type="button"
          className={annonce.favori ? 'heart-button is-favorite' : 'heart-button'}
          aria-pressed={annonce.favori}
          aria-label={annonce.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavori(annonce);
          }}
        >
          {annonce.favori ? '♥' : '♡'}
        </button>
      </div>
      <div className="listing-info">
        <span className="listing-category">{annonce.categorie}</span>
        <h3>{annonce.titre}</h3>
        <p className="listing-price">{formatPrix(annonce.prix)}</p>
      </div>
      <div className="listing-meta"><span>⌖ {annonce.ville}</span><span>{formatDateRelative(annonce.createdAt)}</span></div>
    </article>
  );
}

