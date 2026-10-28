import { useCallback, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import AnnonceCard from '../components/AnnonceCard.jsx';
import AnnonceDetail from '../components/AnnonceDetail.jsx';
import AnnonceForm from '../components/AnnonceForm.jsx';
import Notice from '../components/Notice.jsx';
import { createAnnonce, deleteAnnonce, updateAnnonce } from '../api/annonces.js';
import { useAnnonces } from '../hooks/useAnnonces.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { CATEGORY_FILTERS, LISTE_LIMITE, PRIX_SLIDER } from '../constants.js';

const TEXTES_VUE = {
  catalogue: ['Toutes les annonces en France', 'Découvrez des objets sélectionnés près de chez vous.'],
  'mes-annonces': ['Espace vendeur — vos articles', 'Suivez vos articles et gérez leur disponibilité.'],
  favoris: ['Vos articles sauvegardés', 'Retrouvez facilement les articles qui vous intéressent.'],
};

export default function Home({ user, onLogout }) {
  const [vue, setVue] = useState('catalogue');
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('all');
  const [prixMax, setPrixMax] = useState(PRIX_SLIDER.max);
  const [disponibles, setDisponibles] = useState(false);
  const [selection, setSelection] = useState(null);
  const [formulaire, setFormulaire] = useState(null);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [erreurAction, setErreurAction] = useState('');
  const [notice, setNotice] = useState(null);

  const rechercheDifferee = useDebouncedValue(recherche.trim(), 300);
  const filtres = useMemo(() => ({
    q: rechercheDifferee || undefined,
    mine: vue === 'mes-annonces' || undefined,
    favoris: vue === 'favoris' || undefined,
    // Les filtres de la barre ne s'appliquent qu'au catalogue, où ils sont visibles.
    categorie: vue === 'catalogue' && categorie !== 'all' ? categorie : undefined,
    prixMax: vue === 'catalogue' && prixMax < PRIX_SLIDER.max ? prixMax : undefined,
    disponibles: vue === 'catalogue' && disponibles ? true : undefined,
    limit: LISTE_LIMITE,
  }), [rechercheDifferee, vue, categorie, prixMax, disponibles]);
  const { annonces, setAnnonces, chargement, erreur, recharger } = useAnnonces(filtres, { groupe: vue });

  const fermerNotice = useCallback(() => setNotice(null), []);
  const ouvrirDetail = (annonce) => {
    setErreurAction('');
    setSelection(annonce);
  };
  const fermerDetail = () => {
    setSelection(null);
    setErreurAction('');
  };

  // Exécute une action sur une annonce en gérant l'état « en cours » et l'erreur affichée dans la fenêtre.
  async function executer(action) {
    setActionEnCours(true);
    setErreurAction('');
    try {
      await action();
    } catch (error) {
      setErreurAction(error.message);
    } finally {
      setActionEnCours(false);
    }
  }

  const remplacerAnnonce = (annonceModifiee) => {
    setAnnonces((items) => items.map((item) => (item.id === annonceModifiee.id ? annonceModifiee : item)));
    setSelection((courante) => (courante?.id === annonceModifiee.id ? annonceModifiee : courante));
  };

  const changerStatut = (annonce, statut) => executer(async () => {
    remplacerAnnonce(await updateAnnonce(annonce.id, { statut }));
    setNotice({ type: 'success', text: 'Statut mis à jour.' });
  });

  const supprimer = (annonce) => executer(async () => {
    await deleteAnnonce(annonce.id);
    setAnnonces((items) => items.filter((item) => item.id !== annonce.id));
    fermerDetail();
    setNotice({ type: 'success', text: 'Annonce supprimée.' });
  });

  async function enregistrerFormulaire(payload) {
    if (formulaire.annonce) {
      remplacerAnnonce(await updateAnnonce(formulaire.annonce.id, payload));
      setNotice({ type: 'success', text: 'Annonce modifiée.' });
    } else {
      await createAnnonce(payload);
      if (vue === 'mes-annonces') recharger();
      else setVue('mes-annonces');
      setNotice({ type: 'success', text: 'Annonce publiée.' });
    }
    setFormulaire(null);
  }

  function reinitialiserFiltres() {
    setRecherche('');
    setCategorie('all');
    setDisponibles(false);
    setPrixMax(PRIX_SLIDER.max);
  }

  const [titre, introduction] = TEXTES_VUE[vue];
  const filtresActifs = Boolean(recherche) || categorie !== 'all' || disponibles || prixMax < PRIX_SLIDER.max;
  const compteur = annonces.length >= LISTE_LIMITE ? `${LISTE_LIMITE}+ articles` : `${annonces.length} article${annonces.length > 1 ? 's' : ''}`;

  return (
    <div className="marketplace">
      <Header
        vue={vue}
        setVue={setVue}
        recherche={recherche}
        setRecherche={setRecherche}
        favorisCount={0}
        onDeposer={() => setFormulaire({ annonce: null })}
        user={user}
        onLogout={onLogout}
      />

      <main className="market-main">
        <section className="market-intro">
          <div><p className="eyebrow">LA SECONDE MAIN, EN TOUTE SIMPLICITÉ</p><h1>{titre}</h1><p className="intro-copy">{introduction}</p></div>
          {vue !== 'catalogue' && <button className="text-button" onClick={() => setVue('catalogue')}>← Retour au catalogue</button>}
        </section>

        {vue === 'catalogue' && <section className="filter-bar" aria-label="Filtres des annonces">
          <div className="category-filters">{CATEGORY_FILTERS.map(([id, label]) => <button key={id} onClick={() => setCategorie(id)} aria-pressed={categorie === id} className={categorie === id ? 'category-chip selected' : 'category-chip'}>{label}</button>)}</div>
          <div className="filter-options">
            <label className="availability"><input type="checkbox" checked={disponibles} onChange={(event) => setDisponibles(event.target.checked)} /> Disponibles</label>
            <label className="price-filter">{prixMax < PRIX_SLIDER.max ? <>Jusqu’à <strong>{prixMax.toLocaleString('fr-FR')} €</strong></> : <strong>Tous les prix</strong>}<input type="range" aria-label="Prix maximum" min={PRIX_SLIDER.min} max={PRIX_SLIDER.max} step={PRIX_SLIDER.step} value={prixMax} onChange={(event) => setPrixMax(Number(event.target.value))} /></label>
          </div>
        </section>}

        <div className="results-heading"><h2>{vue === 'catalogue' ? 'À découvrir' : 'Vos annonces'}</h2><span aria-live="polite">{chargement ? 'Chargement…' : compteur}</span></div>

        {erreur && <div className="state-banner" role="alert"><span>{erreur}</span><button className="secondary-button" onClick={recharger}>Réessayer</button></div>}

        {!erreur && chargement && annonces.length === 0 && <p className="loading-text" role="status">Chargement des annonces…</p>}

        {!erreur && !chargement && annonces.length === 0 && (
          <section className="empty-state">
            <span className="empty-icon" aria-hidden="true">⌕</span>
            <h2>{vue === 'mes-annonces' ? 'Tu n’as pas encore d’annonce' : vue === 'favoris' ? 'Aucun favori pour l’instant' : 'Aucune annonce trouvée'}</h2>
            <p>{vue === 'mes-annonces' ? 'Publie ton premier article en quelques secondes.' : vue === 'favoris' ? 'Les articles que tu sauvegardes apparaîtront ici.' : 'Essaie de modifier ta recherche ou tes filtres.'}</p>
            {vue === 'mes-annonces' && <button className="primary-button" onClick={() => setFormulaire({ annonce: null })}>Déposer une annonce</button>}
            {vue === 'catalogue' && filtresActifs && <button className="text-button" onClick={reinitialiserFiltres}>Réinitialiser les filtres</button>}
          </section>
        )}

        {annonces.length > 0 && (
          <section className={chargement ? 'listing-grid is-loading' : 'listing-grid'} aria-label="Liste des annonces" aria-busy={chargement}>
            {annonces.map((annonce) => <AnnonceCard key={annonce.id} annonce={annonce} onOpen={ouvrirDetail} />)}
          </section>
        )}
      </main>

      <Footer />

      {selection && (
        <AnnonceDetail
          annonce={selection}
          estProprietaire={selection.ownerId === user.id}
          occupe={actionEnCours}
          erreur={erreurAction}
          onClose={fermerDetail}
          onChangerStatut={changerStatut}
          onModifier={(annonce) => { fermerDetail(); setFormulaire({ annonce }); }}
          onSupprimer={supprimer}
        />
      )}

      {formulaire && <AnnonceForm annonce={formulaire.annonce} onSubmit={enregistrerFormulaire} onClose={() => setFormulaire(null)} />}

      <Notice notice={notice} onDismiss={fermerNotice} />
    </div>
  );
}

