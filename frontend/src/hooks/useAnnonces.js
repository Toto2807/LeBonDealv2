import { useCallback, useEffect, useState } from 'react';
import { listAnnonces } from '../api/annonces.js';

// Charge les annonces correspondant aux filtres ; une nouvelle requête annule la précédente.
// `groupe` identifie la vue (catalogue, mes annonces...) : en changeant de vue, les résultats de la
// vue précédente ne sont jamais affichés sous le mauvais titre, alors qu'en tapant une recherche
// les résultats précédents restent visibles (atténués) jusqu'à l'arrivée des nouveaux.
export function useAnnonces(filtres, { groupe = '', actif = true } = {}) {
  const [resultat, setResultat] = useState({ groupe, items: [] });
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [version, setVersion] = useState(0);
  const cle = JSON.stringify(filtres);

  useEffect(() => {
    if (!actif) {
      setChargement(false);
      return undefined;
    }
    const controller = new AbortController();
    setChargement(true);
    setErreur('');
    listAnnonces(JSON.parse(cle), { signal: controller.signal })
      .then((items) => setResultat({ groupe, items }))
      .catch((error) => {
        if (error.name !== 'AbortError') setErreur(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setChargement(false);
      });
    return () => controller.abort();
  }, [cle, version, groupe, actif]);

  const setAnnonces = useCallback((miseAJour) => {
    setResultat((courant) => ({ ...courant, items: typeof miseAJour === 'function' ? miseAJour(courant.items) : miseAJour }));
  }, []);
  const recharger = useCallback(() => setVersion((current) => current + 1), []);
  const annonces = resultat.groupe === groupe ? resultat.items : [];

  return { annonces, setAnnonces, chargement, erreur, recharger };
}

