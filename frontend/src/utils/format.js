export function formatPrix(prix) {
  return prix === 0 ? 'Gratuit' : `${prix.toLocaleString('fr-FR')} €`;
}

export function formatDateRelative(isoDate, maintenant = Date.now()) {
  const minutes = Math.floor((maintenant - new Date(isoDate).getTime()) / 60000);
  if (minutes < 1) return 'À l’instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  if (heures < 24) return `Il y a ${heures} h`;
  const jours = Math.floor(heures / 24);
  if (jours < 30) return `Il y a ${jours} j`;
  return new Date(isoDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMembreDepuis(isoDate) {
  if (!isoDate) return '';
  return new Date(isoDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function labelStatut(statut) {
  return { DISPONIBLE: 'Disponible', RESERVEE: 'Réservée', VENDUE: 'Vendue' }[statut] ?? statut;
}
