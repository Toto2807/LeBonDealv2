import { Annonce } from '../models/Annonce.js';
import { Favori } from '../models/Favori.js';
import { Message } from '../models/Message.js';
import { notFoundError } from '../errors/AppError.js';
import { serializeAnnonce, OWNER_FIELDS } from '../serializers/annonceSerializer.js';

const withOwner = (query) => query.populate('ownerId', OWNER_FIELDS);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Catalogue partagé : tout utilisateur connecté voit toutes les annonces ; "mine" restreint aux siennes.
export async function listAnnonces(userId, { q, categorie, prixMax, disponibles, mine, page, limit }) {
    const filter = {};
    if (mine) filter.ownerId = userId;
    if (categorie) filter.categorie = categorie;
    if (prixMax !== undefined) filter.prix = { $lte: prixMax };
    if (disponibles) filter.statut = 'DISPONIBLE';
    if (q) filter.titre = { $regex: escapeRegex(q), $options: 'i' };

    const annonces = await withOwner(Annonce.find(filter))
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    return annonces.map(serializeAnnonce);
}

export async function getAnnonce(id) {
    const annonce = await withOwner(Annonce.findById(id));
    if (!annonce) throw notFoundError('Annonce introuvable');
    return serializeAnnonce(annonce);
}

// Le propriétaire vient du JWT (userId), jamais du corps de la requête.
export async function createAnnonce(userId, data) {
    const annonce = await Annonce.create({ ...data, ownerId: userId });
    await annonce.populate('ownerId', OWNER_FIELDS);
    return serializeAnnonce(annonce);
}

// Filtrer sur ownerId rend l'opération atomique : annonce absente ou d'un autre compte => même 404.
export async function updateAnnonce(userId, id, patch) {
    const annonce = await withOwner(
        Annonce.findOneAndUpdate({ _id: id, ownerId: userId }, { $set: patch }, { returnDocument: 'after', runValidators: true }),
    );
    if (!annonce) throw notFoundError('Annonce introuvable');
    return serializeAnnonce(annonce);
}

export async function deleteAnnonce(userId, id) {
    const annonce = await Annonce.findOneAndDelete({ _id: id, ownerId: userId });
    if (!annonce) throw notFoundError('Annonce introuvable');
    await Promise.all([Favori.deleteMany({ annonceId: id }), Message.deleteMany({ annonceId: id })]);
}
