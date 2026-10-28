export default function Header({ vue, setVue, recherche, setRecherche, favorisCount, onDeposer, user, onLogout }) {
  return (
    <header className="market-header">
      <button className="brand" onClick={() => setVue('catalogue')} aria-label="LeBonDeal, accueil">
        <span className="brand-mark">B</span>
        <span>LeBon<span className="brand-accent">Deal</span></span>
      </button>

      <label className="search-box">
        <span aria-hidden="true">⌕</span>
        <input
          value={recherche}
          onChange={(event) => setRecherche(event.target.value)}
          placeholder="Que recherchez-vous ? (ex : vélo, MacBook…)"
        />
      </label>

      <nav className="market-nav" aria-label="Navigation principale">
        <button className={vue === 'catalogue' ? 'nav-link active' : 'nav-link'} onClick={() => setVue('catalogue')}>Catalogue</button>
        <button className={vue === 'mes-annonces' ? 'nav-link active' : 'nav-link'} onClick={() => setVue('mes-annonces')}>Mes annonces</button>
        <button className={vue === 'favoris' ? 'nav-link active' : 'nav-link'} onClick={() => setVue('favoris')}>
          ♡ <span className="nav-fav-label">Favoris</span>
          {favorisCount > 0 && <span className="fav-count">{favorisCount}</span>}
        </button>
        <button className="primary-button header-deposit" onClick={onDeposer}><span>＋</span> Déposer</button>
        <div className="account-actions"><span className="account-email" title={user?.email}>{user?.email}</span><button className="logout-button" onClick={onLogout}>Déconnexion</button></div>
      </nav>
    </header>
  );
}

