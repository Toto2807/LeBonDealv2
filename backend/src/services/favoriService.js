import { Annonce } from '../models/Annonce.js';
import { Favori } from '../models/Favori.js';
import { notFoundError } from '../errors/AppError.js';

// PUT idempotent : mettre deux fois la même annonce en favori ne crée qu'un seul favori.
export async function addFavori(userId, annonceId) {
    if (!(await Annonce.exists({ _id: annonceId }))) throw notFoundError('Annonce introuvable');
    try {
        await Favori.updateOne({ userId, annonceId }, { $setOnInsert: { userId, annonceId } }, { upsert: true });
    } catch (error) {
        // Deux requêtes simultanées : l'index unique a déjà enregistré le favori.
        if (error.code !== 11000) throw error;
    }
}

// DELETE idempotent : retirer un favori absent n'est pas une erreur.
export async function removeFavori(userId, annonceId) {
    await Favori.deleteOne({ userId, annonceId });
}

// Identifiants (chaînes) des annonces favorites de l'utilisateur parmi `annonceIds`.
export async function favoriIdSet(userId, annonceIds) {
    const favoris = await Favori.find({ userId, annonceId: { $in: annonceIds } }).select('annonceId');
    return new Set(favoris.map((favori) => String(favori.annonceId)));
}

export async function allFavoriIds(userId) {
    return Favori.find({ userId }).distinct('annonceId');
}
