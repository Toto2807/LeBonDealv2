import { useState } from 'react';

// Affiche la photo, ou un pictogramme si l'annonce n'en a pas ou si l'image ne se charge pas.
export default function AnnoncePhoto({ src, alt }) {
  const [enErreur, setEnErreur] = useState(false);

  if (!src || enErreur) {
    return <div className="photo-placeholder" role="img" aria-label={`Pas de photo pour ${alt}`}>📷</div>;
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setEnErreur(true)} />;
}
