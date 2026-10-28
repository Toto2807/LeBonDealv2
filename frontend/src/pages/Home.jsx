import { useCallback, useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import AnnonceCard from '../components/AnnonceCard.jsx';
import AnnonceDetail from '../components/AnnonceDetail.jsx';
import AnnonceForm from '../components/AnnonceForm.jsx';
import Messagerie from '../components/Messagerie.jsx';
import Notice from '../components/Notice.jsx';
import { createAnnonce, deleteAnnonce, updateAnnonce } from '../api/annonces.js';
import { addFavori, removeFavori } from '../api/favoris.js';
import { useAnnonces } from '../hooks/useAnnonces.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useFavoris } from '../hooks/useFavoris.js';
import { CATEGORY_FILTERS, LISTE_LIMITE, PRIX_SLIDER } from '../constants.js';

const TEXTES_VUE = {
  catalogue: ['Toutes les annonces en France', 'Découvrez des objets sélectionnés près de chez vous.'],
  'mes-annonces': ['Espace vendeur — vos articles', 'Suivez vos articles et gérez leur disponibilité.'],
  favoris: ['Vos articles sauvegardés', 'Retrouvez facilement les articles qui vous intéressent.'],
  messages: ['Vos messages', 'Discutez avec les acheteurs et les vendeurs, sans quitter LeBonDeal.'],
};

export default function Home({ user, onLogout }) {
  const [vue, setVue] = useState('catalogue');
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('all');
  const [etat, setEtat] = useState('');
  const [ville, setVille] = useState('');
  const [prixMax, setPrixMax] = useState(PRIX_SLIDER.max);
  const [disponibles, setDisponibles] = useState(false);
  const [selection, setSelection] = useState(null);
  const [formulaire, setFormulaire] = useState(null);
  const [actionEnCours, setActionEnCours] = useState(false);
  const [erreurAction, setErreurAction] = useState('');
  const [notice, setNotice] = useState(null);
  const [conversation, setConversation] = useState(null);

  const rechercheDifferee = useDebouncedValue(recherche.trim(), 300);
  const filtres = useMemo(() => ({
    q: rechercheDifferee || undefined,
    mine: vue === 'mes-annonces' || undefined,
    favoris: vue === 'favoris' || undefined,
    // Les filtres de la barre ne s'appliquent qu'au catalogue, où ils sont visibles.
    categorie: vue === 'catalogue' && categorie !== 'all' ? categorie : undefined,
    etat: vue === 'catalogue' && etat ? etat : undefined,
    ville: vue === 'catalogue' && ville ? ville : undefined,
    prixMax: vue === 'catalogue' && prixMax < PRIX_SLIDER.max ? prixMax : undefined,
    disponibles: vue === 'catalogue' && disponibles ? true : undefined,
    limit: LISTE_LIMITE,
  }), [rechercheDifferee, vue, categorie, etat, ville, prixMax, disponibles]);
  const { annonces, setAnnonces, chargement, erreur, recharger } = useAnnonces(filtres, { groupe: vue, actif: vue !== 'messages' });
  const favoris = useFavoris();

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

  // Mise à jour immédiate du cœur ; annulée avec un message si l'API refuse ou est injoignable.
  function appliquerFavori(id, favori) {
    favoris.marquer(id, favori);
    setAnnonces((items) => (vue === 'favoris' && !favori
      ? items.filter((item) => item.id !== id)
      : items.map((item) => (item.id === id ? { ...item, favori } : item))));
    setSelection((courante) => (courante?.id === id ? { ...courante, favori } : courante));
  }

  async function basculerFavori(annonce) {
    const favori = !annonce.favori;
    appliquerFavori(annonce.id, favori);
    try {
      await (favori ? addFavori(annonce.id) : removeFavori(annonce.id));
    } catch (error) {
      appliquerFavori(annonce.id, !favori);
      if (vue === 'favoris') recharger();
      setNotice({ type: 'error', text: `Favori non enregistré : ${error.message}` });
    }
  }

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

  // Choix d'une proposition de la barre de recherche : applique le filtre correspondant dans le catalogue.
  function choisirSuggestion(proposition) {
    setVue('catalogue');
    if (proposition.type === 'annonce') {
      setRecherche(proposition.value);
      return;
    }
    setRecherche('');
    if (proposition.type === 'categorie') setCategorie(proposition.value);
    else if (proposition.type === 'etat') setEtat(proposition.value);
    else setVille(proposition.value);
  }

  function reinitialiserFiltres() {
    setRecherche('');
    setCategorie('all');
    setEtat('');
    setVille('');
    setDisponibles(false);
    setPrixMax(PRIX_SLIDER.max);
  }

  const [titre, introduction] = TEXTES_VUE[vue];
  const filtresActifs = Boolean(recherche) || categorie !== 'all' || Boolean(etat) || Boolean(ville) || disponibles || prixMax < PRIX_SLIDER.max;
  const compteur = annonces.length >= LISTE_LIMITE ? `${LISTE_LIMITE}+ articles` : `${annonces.length} article${annonces.length > 1 ? 's' : ''}`;

  return (
    <div className="marketplace">
      <Header
        vue={vue}
        setVue={setVue}
        recherche={recherche}
        setRecherche={setRecherche}
        onSuggestion={choisirSuggestion}
        favorisCount={favoris.count}
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
            <label className="toggle">
              <input type="checkbox" checked={disponibles} onChange={(event) => setDisponibles(event.target.checked)} />
              <span className="toggle-track" aria-hidden="true" />
              <span>Disponibles uniquement</span>
            </label>
            <div className="price-filter">
              <div className="price-head">
                <label htmlFor="prix-max">Prix maximum</label>
                <output htmlFor="prix-max">{prixMax < PRIX_SLIDER.max ? `${prixMax.toLocaleString('fr-FR')} €` : 'Sans limite'}</output>
              </div>
              <input
                id="prix-max"
                type="range"
                min={PRIX_SLIDER.min}
                max={PRIX_SLIDER.max}
                step={PRIX_SLIDER.step}
                value={prixMax}
                style={{ '--progress': `${((prixMax - PRIX_SLIDER.min) / (PRIX_SLIDER.max - PRIX_SLIDER.min)) * 100}%` }}
                onChange={(event) => setPrixMax(Number(event.target.value))}
              />
              <div className="price-scale" aria-hidden="true"><span>{PRIX_SLIDER.min} €</span><span>{PRIX_SLIDER.max.toLocaleString('fr-FR')} € et +</span></div>
            </div>
          </div>
        </section>}

        {vue === 'catalogue' && (etat || ville) && (
          <div className="active-filters" aria-label="Filtres actifs">
            {ville && <span className="filter-chip">Ville : {ville}<button type="button" aria-label={`Retirer le filtre ville ${ville}`} onClick={() => setVille('')}>×</button></span>}
            {etat && <span className="filter-chip">État : {etat}<button type="button" aria-label={`Retirer le filtre état ${etat}`} onClick={() => setEtat('')}>×</button></span>}
          </div>
        )}

        {vue === 'messages' && <Messagerie selection={conversation} onSelect={setConversation} />}

        {vue !== 'messages' && <div className="results-heading"><h2>{vue === 'catalogue' ? 'À découvrir' : 'Vos annonces'}</h2><span aria-live="polite">{chargement ? 'Chargement…' : compteur}</span></div>}

        {vue !== 'messages' && erreur && <div className="state-banner" role="alert"><span>{erreur}</span><button className="secondary-button" onClick={recharger}>Réessayer</button></div>}

        {vue !== 'messages' && !erreur && chargement && annonces.length === 0 && <p className="loading-text" role="status">Chargement des annonces…</p>}

        {vue !== 'messages' && !erreur && !chargement && annonces.length === 0 && (
          <section className="empty-state">
            <span className="empty-icon" aria-hidden="true">⌕</span>
            <h2>{vue === 'mes-annonces' ? 'Tu n’as pas encore d’annonce' : vue === 'favoris' ? 'Aucun favori pour l’instant' : 'Aucune annonce trouvée'}</h2>
            <p>{vue === 'mes-annonces' ? 'Publie ton premier article en quelques secondes.' : vue === 'favoris' ? 'Les articles que tu sauvegardes apparaîtront ici.' : 'Essaie de modifier ta recherche ou tes filtres.'}</p>
            {vue === 'mes-annonces' && <button className="primary-button" onClick={() => setFormulaire({ annonce: null })}>Déposer une annonce</button>}
            {vue === 'catalogue' && filtresActifs && <button className="text-button" onClick={reinitialiserFiltres}>Réinitialiser les filtres</button>}
          </section>
        )}

        {vue !== 'messages' && annonces.length > 0 && (
          <section className={chargement ? 'listing-grid is-loading' : 'listing-grid'} aria-label="Liste des annonces" aria-busy={chargement}>
            {annonces.map((annonce) => <AnnonceCard key={annonce.id} annonce={annonce} onOpen={ouvrirDetail} onToggleFavori={basculerFavori} />)}
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
          onMessageEnvoye={(text) => setNotice({ type: 'success', text })}
          onOuvrirConversation={(annonce) => { setConversation({ annonceId: annonce.id, interlocuteurId: annonce.ownerId }); fermerDetail(); setVue('messages'); }}
        />
      )}

      {formulaire && <AnnonceForm annonce={formulaire.annonce} onSubmit={enregistrerFormulaire} onClose={() => setFormulaire(null)} />}

      <Notice notice={notice} onDismiss={fermerNotice} />
    </div>
  );
}


