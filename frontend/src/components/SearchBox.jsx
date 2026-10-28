import { useEffect, useId, useRef, useState } from 'react';
import { fetchSuggestions } from '../api/annonces.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

const GROUPES = [
  ['categorie', 'Catégories', '🏷️'],
  ['etat', 'États', '✨'],
  ['ville', 'Villes', '📍'],
  ['annonce', 'Annonces', '🔎'],
];

const sansAccents = (texte) => texte.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Met en évidence la partie saisie dans une proposition (sans tenir compte des accents).
function Surligne({ texte, saisie }) {
  const besoin = sansAccents(saisie.trim());
  const plat = sansAccents(texte);
  const debut = besoin ? plat.indexOf(besoin) : -1;
  if (debut < 0 || plat.length !== texte.length) return texte;
  return <>{texte.slice(0, debut)}<mark>{texte.slice(debut, debut + besoin.length)}</mark>{texte.slice(debut + besoin.length)}</>;
}

// Barre de recherche avec propositions (catégories, états, villes, titres d'annonces) : liste déroulante accessible
// au clavier (flèches, Entrée, Échap) et à la souris.
export default function SearchBox({ value, onChange, onSelect }) {
  const [ouvert, setOuvert] = useState(false);
  const [propositions, setPropositions] = useState([]);
  const [actif, setActif] = useState(-1);
  const conteneurRef = useRef(null);
  const inputRef = useRef(null);
  const listeId = useId();
  const saisieDifferee = useDebouncedValue(value.trim(), 200);

  useEffect(() => {
    if (!ouvert) return undefined;
    const controller = new AbortController();
    fetchSuggestions(saisieDifferee || undefined, { signal: controller.signal })
      .then((items) => {
        setPropositions(items);
        setActif(-1);
      })
      .catch(() => {
        // Les propositions sont facultatives : en cas d'erreur, la recherche par texte continue de fonctionner.
      });
    return () => controller.abort();
  }, [ouvert, saisieDifferee]);

  // Les propositions sont affichées dans l'ordre de l'API, regroupées par type.
  const groupes = GROUPES
    .map(([type, titre, icone]) => ({ type, titre, icone, items: propositions.filter((proposition) => proposition.type === type) }))
    .filter((groupe) => groupe.items.length > 0);
  const aplaties = groupes.flatMap((groupe) => groupe.items.map((item) => ({ ...item, icone: groupe.icone })));

  function choisir(proposition) {
    setOuvert(false);
    onSelect(proposition);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOuvert(true);
      setActif((courant) => (aplaties.length === 0 ? -1 : (courant + 1) % aplaties.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActif((courant) => (aplaties.length === 0 ? -1 : (courant - 1 + aplaties.length) % aplaties.length));
    } else if (event.key === 'Enter') {
      if (ouvert && actif >= 0) {
        event.preventDefault();
        choisir(aplaties[actif]);
      } else {
        setOuvert(false);
      }
    } else if (event.key === 'Escape') {
      setOuvert(false);
    }
  }

  function handleBlur(event) {
    if (!conteneurRef.current?.contains(event.relatedTarget)) setOuvert(false);
  }

  const afficherListe = ouvert && aplaties.length > 0;
  let index = -1;

  return (
    <div className="search-box" ref={conteneurRef} onBlur={handleBlur}>
      <div className="search-field">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Rechercher une annonce"
          aria-autocomplete="list"
          aria-expanded={afficherListe}
          aria-controls={listeId}
          aria-activedescendant={afficherListe && actif >= 0 ? `${listeId}-${actif}` : undefined}
          autoComplete="off"
          value={value}
          maxLength={100}
          placeholder="Que recherchez-vous ? (ex : vélo, MacBook…)"
          onChange={(event) => { onChange(event.target.value); setOuvert(true); }}
          onFocus={() => setOuvert(true)}
          onClick={() => setOuvert(true)}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button type="button" className="search-clear" aria-label="Effacer la recherche" onClick={() => { onChange(''); inputRef.current?.focus(); }}>×</button>
        )}
      </div>

      {afficherListe && (
        <ul className="search-suggestions" id={listeId} role="listbox" aria-label="Suggestions de recherche">
          {groupes.map((groupe) => (
            <li key={groupe.type} role="presentation">
              <ul role="group" aria-label={groupe.titre} className="sugg-group">
                <li role="presentation" className="sugg-heading">{groupe.titre}</li>
                {groupe.items.map((item) => {
                  index += 1;
                  const position = index;
                  return (
                    <li
                      key={`${item.type}:${item.value}`}
                      id={`${listeId}-${position}`}
                      role="option"
                      aria-selected={position === actif}
                      className="sugg-option"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => choisir(item)}
                      onMouseMove={() => setActif(position)}
                    >
                      <span className="sugg-icon" aria-hidden="true">{groupe.icone}</span>
                      <span className="sugg-text"><Surligne texte={item.value} saisie={value} /></span>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="sr-only" role="status">{afficherListe ? `${aplaties.length} suggestions disponibles` : ''}</p>
    </div>
  );
}
