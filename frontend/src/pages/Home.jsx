import { useMemo, useState } from 'react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const initialAnnonces = [
  { id: '1', titre: 'Apple MacBook Pro 14" M2 Pro - 16 Go / 512 Go', prix: 1490, categorie: 'Multimédia', description: 'MacBook Pro en état irréprochable avec boîte d’origine, facture et chargeur MagSafe. Batterie à 98%.', etat: 'Très bon état', statut: 'DISPONIBLE', photo: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80', ville: 'Bordeaux', codePostal: '33000', date: 'Il y a 2h', vendeur: 'Thomas D.', note: '4,9', delai: '~ 15 min' },
  { id: '2', titre: 'Vélo de ville vintage Peugeot rénové 1984', prix: 260, categorie: 'Loisirs & Sport', description: 'Cadre acier restauré, freins et pneus Michelin neufs. Prêt à rouler.', etat: 'Très bon état', statut: 'DISPONIBLE', photo: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80', ville: 'Lyon', codePostal: '69007', date: 'Il y a 5h', vendeur: 'Claire B.', note: '5,0', delai: '~ 30 min' },
  { id: '3', titre: 'Fauteuil design chêne massif & tissu bouclé', prix: 180, categorie: 'Maison & Mobilier', description: 'Fauteuil confortable au design scandinave épuré. Tissu antitache neuf.', etat: 'Comme neuf', statut: 'DISPONIBLE', photo: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=800&q=80', ville: 'Nantes', codePostal: '44000', date: 'Il y a 1j', vendeur: 'Alexandre M.', note: '4,8', delai: '~ 1h' },
  { id: '4', titre: 'Appareil photo télémétrique rétro 35mm', prix: 250, categorie: 'Multimédia', description: 'Boîtier argentique fonctionnel, lentille 50mm f/1.8 impeccable.', etat: 'Bon état', statut: 'RESERVEE', photo: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80', ville: 'Paris', codePostal: '75011', date: 'Il y a 2j', vendeur: 'Sarah K.', note: '4,9', delai: '~ 10 min' },
];

const categories = [
  ['all', '✨ Tout'], ['Multimédia', '💻 Multimédia'],
  ['Loisirs & Sport', '🚲 Vélo & Sport'], ['Maison & Mobilier', '🛋️ Mobilier'],
];

export default function Home({ user, onLogout }) {
  const [annonces, setAnnonces] = useState(initialAnnonces);
  const [recherche, setRecherche] = useState('');
  const [categorie, setCategorie] = useState('all');
  const [prixMax, setPrixMax] = useState(2000);
  const [disponibles, setDisponibles] = useState(false);
  const [vue, setVue] = useState('catalogue');
  const [selection, setSelection] = useState(null);
  const [depotOuvert, setDepotOuvert] = useState(false);
  const [form, setForm] = useState({ titre: '', prix: '', categorie: 'Multimédia', ville: '', description: '' });

  const favoris = annonces.filter((annonce) => annonce.favori);
  const annoncesAffichees = useMemo(() => annonces.filter((annonce) => {
    if (vue === 'favoris' && !annonce.favori) return false;
    if (vue === 'mes-annonces' && annonce.vendeur !== 'Vous' && annonce.id !== '1') return false;
    if (categorie !== 'all' && annonce.categorie !== categorie) return false;
    if (disponibles && annonce.statut !== 'DISPONIBLE') return false;
    if (annonce.prix > prixMax) return false;
    if (recherche && !annonce.titre.toLowerCase().includes(recherche.toLowerCase())) return false;
    return true;
  }), [annonces, vue, categorie, disponibles, prixMax, recherche]);

  const basculerFavori = (id, event) => {
    event.stopPropagation();
    setAnnonces((items) => items.map((item) => item.id === id ? { ...item, favori: !item.favori } : item));
  };

  const changerStatut = (id, statut) => {
    setAnnonces((items) => items.map((item) => item.id === id ? { ...item, statut } : item));
    setSelection((item) => item?.id === id ? { ...item, statut } : item);
  };

  const publierAnnonce = (event) => {
    event.preventDefault();
    const nouvelle = {
      id: Date.now().toString(), titre: form.titre.trim(), prix: Number(form.prix),
      categorie: form.categorie, description: form.description || 'Article en vente directe sur LeBonDeal.',
      etat: 'Très bon état', statut: 'DISPONIBLE',
      photo: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
      ville: form.ville || 'Paris', codePostal: '75000', date: 'À l’instant',
      vendeur: 'Vous', note: '5,0', delai: '~ Immédiat',
    };
    setAnnonces((items) => [nouvelle, ...items]);
    setForm({ titre: '', prix: '', categorie: 'Multimédia', ville: '', description: '' });
    setDepotOuvert(false);
    setVue('mes-annonces');
  };

  const titre = vue === 'catalogue' ? 'Toutes les annonces en France'
    : vue === 'mes-annonces' ? 'Espace vendeur — vos articles'
      : `Vos articles sauvegardés (${favoris.length})`;

  return (
    <div className="marketplace">
      <Header
        vue={vue}
        setVue={setVue}
        recherche={recherche}
        setRecherche={setRecherche}
        favorisCount={favoris.length}
        onDeposer={() => setDepotOuvert(true)}
        user={user}
        onLogout={onLogout}
      />

      <main className="market-main">
        <section className="market-intro">
          <div><p className="eyebrow">LA SECONDE MAIN, EN TOUTE SIMPLICITÉ</p><h1>{titre}</h1><p className="intro-copy">{vue === 'catalogue' ? 'Découvrez des objets sélectionnés près de chez vous.' : vue === 'mes-annonces' ? 'Suivez vos articles et gérez leur disponibilité.' : 'Retrouvez facilement les articles qui vous intéressent.'}</p></div>
          {vue !== 'catalogue' && <button className="text-button" onClick={() => setVue('catalogue')}>← Retour au catalogue</button>}
        </section>

        {vue === 'catalogue' && <section className="filter-bar" aria-label="Filtres des annonces">
          <div className="category-filters">{categories.map(([id, label]) => <button key={id} onClick={() => setCategorie(id)} className={categorie === id ? 'category-chip selected' : 'category-chip'}>{label}</button>)}</div>
          <div className="filter-options"><label className="availability"><input type="checkbox" checked={disponibles} onChange={(event) => setDisponibles(event.target.checked)} /> Disponibles</label><label className="price-filter">Jusqu’à <strong>{prixMax.toLocaleString('fr-FR')} €</strong><input type="range" min="100" max="2500" step="50" value={prixMax} onChange={(event) => setPrixMax(Number(event.target.value))} /></label></div>
        </section>}

        <div className="results-heading"><h2>{vue === 'catalogue' ? 'À découvrir' : 'Vos annonces'}</h2><span>{annoncesAffichees.length} article{annoncesAffichees.length > 1 ? 's' : ''}</span></div>
        {annoncesAffichees.length === 0 ? <section className="empty-state"><span className="empty-icon">⌕</span><h2>Aucune annonce trouvée</h2><p>Essaie de modifier ta recherche ou tes filtres.</p><button className="text-button" onClick={() => { setRecherche(''); setCategorie('all'); setDisponibles(false); setPrixMax(2500); }}>Réinitialiser les filtres</button></section> :
          <section className="listing-grid" aria-label="Liste des annonces">{annoncesAffichees.map((item) => <article className="listing-card" key={item.id} onClick={() => setSelection(item)}>
            <div className="listing-photo"><img src={item.photo} alt={item.titre} /><span className={item.statut === 'DISPONIBLE' ? 'status-badge available' : 'status-badge reserved'}>{item.statut === 'DISPONIBLE' ? 'Disponible' : item.statut === 'VENDUE' ? 'Vendue' : 'Réservée'}</span><button className={item.favori ? 'heart-button is-favorite' : 'heart-button'} onClick={(event) => basculerFavori(item.id, event)} aria-label={item.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}>{item.favori ? '♥' : '♡'}</button></div>
            <div className="listing-info"><span className="listing-category">{item.categorie}</span><h3>{item.titre}</h3><p className="listing-price">{item.prix.toLocaleString('fr-FR')} €</p></div>
            <div className="listing-meta"><span>⌖ {item.ville}</span><span>{item.date}</span></div>
          </article>)}</section>}
      </main>

      <Footer />

      {selection && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelection(null); }}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title"><button className="modal-close" onClick={() => setSelection(null)} aria-label="Fermer">×</button><div className="detail-image"><img src={selection.photo} alt={selection.titre} /><span className={selection.statut === 'DISPONIBLE' ? 'status-badge available' : 'status-badge reserved'}>{selection.statut}</span></div><div className="detail-title-row"><div><span className="listing-category">{selection.categorie}</span><h2 id="detail-title">{selection.titre}</h2><p className="detail-location">⌖ {selection.ville} ({selection.codePostal}) · Publié {selection.date}</p></div><strong className="detail-price">{selection.prix.toLocaleString('fr-FR')} €</strong></div><div className="detail-description"><h3>Description</h3><p>{selection.description}</p><span>État : {selection.etat}</span></div><div className="seller-row"><div className="seller-avatar">{selection.vendeur.slice(0, 1)}</div><div className="seller-info"><strong>{selection.vendeur}</strong><span>★ {selection.note}/5 · Répond en {selection.delai}</span></div><div className="detail-actions">{selection.vendeur === 'Vous' && <select aria-label="Statut de l’annonce" value={selection.statut} onChange={(event) => changerStatut(selection.id, event.target.value)}><option value="DISPONIBLE">Disponible</option><option value="RESERVEE">Réservée</option><option value="VENDUE">Vendue</option></select>}<button className="primary-button" onClick={() => window.alert(`Message envoyé à ${selection.vendeur} !`)}>✉ Contacter</button></div></div></section></div>}

      {depotOuvert && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDepotOuvert(false); }}><section className="deposit-modal" role="dialog" aria-modal="true" aria-labelledby="deposit-title"><button className="modal-close" onClick={() => setDepotOuvert(false)} aria-label="Fermer">×</button><p className="eyebrow">VENTE RAPIDE</p><h2 id="deposit-title">Déposer une annonce</h2><p className="form-intro">Présente ton article pour le proposer près de chez toi.</p><form onSubmit={publierAnnonce} className="deposit-form"><label>Titre de l’annonce *<input required maxLength="90" value={form.titre} onChange={(event) => setForm({ ...form, titre: event.target.value })} placeholder="Ex. Clavier mécanique sans fil" /></label><div className="form-columns"><label>Prix (€) *<input required type="number" min="0" step="1" value={form.prix} onChange={(event) => setForm({ ...form, prix: event.target.value })} placeholder="85" /></label><label>Catégorie<select value={form.categorie} onChange={(event) => setForm({ ...form, categorie: event.target.value })}><option>Multimédia</option><option>Loisirs & Sport</option><option>Maison & Mobilier</option></select></label></div><label>Ville<input value={form.ville} onChange={(event) => setForm({ ...form, ville: event.target.value })} placeholder="Ex. Bordeaux" /></label><label>Description<textarea rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Décris l’état et les accessoires inclus…" /></label><button type="submit" className="primary-button submit-button">Publier mon annonce <span>→</span></button></form></section></div>}
    </div>
  );
}
