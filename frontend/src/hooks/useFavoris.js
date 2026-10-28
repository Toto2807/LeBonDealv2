import { useCallback, useEffect, useState } from 'react';
import { listAnnonces } from '../api/annonces.js';

// Ensemble des identifiants d'annonces en favori (pour le compteur de l'en-tête).
// Chaque annonce porte aussi son propre indicateur `favori` fourni par l'API.
export function useFavoris() {
  const [ids, setIds] = useState(() => new Set());

  useEffect(() => {
    const controller = new AbortController();
    listAnnonces({ favoris: true, limit: 100 }, { signal: controller.signal })
      .then((annonces) => setIds(new Set(annonces.map((annonce) => annonce.id))))
      .catch(() => {
        // Le compteur reste à 0 : l'erreur réseau est déjà signalée par le chargement de la liste.
      });
    return () => controller.abort();
  }, []);

  const marquer = useCallback((id, favori) => {
    setIds((courant) => {
      const suivant = new Set(courant);
      if (favori) suivant.add(id);
      else suivant.delete(id);
      return suivant;
    });
  }, []);

  return { count: ids.size, marquer };
}

