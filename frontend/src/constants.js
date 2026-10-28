// Valeurs acceptées par l'API (voir /api/docs) : à garder synchronisées avec backend/src/models/Annonce.js.
export const CATEGORIES = ['Multimédia', 'Loisirs & Sport', 'Maison & Mobilier'];
export const ETATS = ['Neuf', 'Comme neuf', 'Très bon état', 'Bon état', 'État correct'];
export const STATUTS = [
  ['DISPONIBLE', 'Disponible'],
  ['RESERVEE', 'Réservée'],
  ['VENDUE', 'Vendue'],
];

export const CATEGORY_FILTERS = [
  ['all', '✨ Tout'],
  ['Multimédia', '💻 Multimédia'],
  ['Loisirs & Sport', '💪 Loisirs & Sport'],
  ['Maison & Mobilier', '🛋️ Mobilier'],
];

// Au maximum du curseur, aucun plafond de prix n'est envoyé à l'API.
export const PRIX_SLIDER = { min: 100, max: 2500, step: 50 };
export const LISTE_LIMITE = 100;

