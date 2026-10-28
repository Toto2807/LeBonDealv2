import { Annonce, CATEGORIES, ETATS } from '../models/Annonce.js';
import { Favori } from '../models/Favori.js';
import { Message } from '../models/Message.js';
import { notFoundError } from '../errors/AppError.js';
import { serializeAnnonce, OWNER_FIELDS } from '../serializers/annonceSerializer.js';
import { favoriIdSet, allFavoriIds } from './favoriService.js';
import { assertImageOwnedBy, releaseImage } from './imageService.js';
import { accentInsensitivePattern, stripAccents } from '../utils/text.js';

const withOwner = (query) => query.populate('ownerId', OWNER_FIELDS);

// Sérialise des annonces en ajoutant l'indicateur favori de l'utilisateur (une seule requête).
async function present(userId, annonces) {
    const favoris = await favoriIdSet(userId, annonces.map((annonce) => annonce._id));
    return annonces.map((annonce) => serializeAnnonce(annonce, favoris.has(String(annonce._id))));
}

// Catalogue partagé : tout utilisateur connecté voit toutes les annonces ; "mine" restreint aux siennes.
export async function listAnnonces(userId, { q, categorie, etat, ville, prixMax, disponibles, mine, favoris, page, limit }) {
    const filter = {};
    if (mine) filter.ownerId = userId;
    if (favoris) filter._id = { $in: await allFavoriIds(userId) };
    if (categorie) filter.categorie = categorie;
    if (etat) filter.etat = etat;
    if (ville) filter.ville = { $regex: `^${accentInsensitivePattern(ville)}$`, $options: 'i' };
    if (prixMax !== undefined) filter.prix = { $lte: prixMax };
    if (disponibles) filter.statut = 'DISPONIBLE';
    if (q) filter.titre = { $regex: accentInsensitivePattern(q), $options: 'i' };

    const annonces = await withOwner(Annonce.find(filter))
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    return present(userId, annonces);
}

export async function getAnnonce(userId, id) {
    const annonce = await withOwner(Annonce.findById(id));
    if (!annonce) throw notFoundError('Annonce introuvable');
    return (await present(userId, [annonce]))[0];
}

// Le propriétaire vient du JWT (userId), jamais du corps de la requête.
export async function createAnnonce(userId, data) {
    await assertImageOwnedBy(userId, data.photo);
    const annonce = await Annonce.create({ ...data, ownerId: userId });
    await annonce.populate('ownerId', OWNER_FIELDS);
    return serializeAnnonce(annonce, false);
}

// Filtrer sur ownerId rend l'opération atomique : annonce absente ou d'un autre compte => même 404.
export async function updateAnnonce(userId, id, patch) {
    await assertImageOwnedBy(userId, patch.photo);
    const avant = 'photo' in patch ? await Annonce.findOne({ _id: id, ownerId: userId }).select('photo') : null;
    const annonce = await withOwner(
        Annonce.findOneAndUpdate({ _id: id, ownerId: userId }, { $set: patch }, { returnDocument: 'after', runValidators: true }),
    );
    if (!annonce) throw notFoundError('Annonce introuvable');
    if (avant && avant.photo !== annonce.photo) await releaseImage(avant.photo);
    return (await present(userId, [annonce]))[0];
}

export async function deleteAnnonce(userId, id) {
    const annonce = await Annonce.findOneAndDelete({ _id: id, ownerId: userId });
    if (!annonce) throw notFoundError('Annonce introuvable');
    await Promise.all([Favori.deleteMany({ annonceId: id }), Message.deleteMany({ annonceId: id })]);
    await releaseImage(annonce.photo);
}

const SUGGESTIONS_VILLES = 4;
const SUGGESTIONS_VILLES_VIDE = 5;
const SUGGESTIONS_TITRES = 5;

// Propositions de recherche : catégories, états, villes et titres d'annonces correspondant au texte saisi
// (sans accents ni casse). Sans texte : les catégories et les villes les plus présentes.
export async function suggestAnnonces({ q }) {
    const items = [];
    const besoin = q ? stripAccents(q).toLowerCase() : '';
    const correspond = (texte) => !besoin || stripAccents(texte).toLowerCase().includes(besoin);

    for (const categorie of CATEGORIES) if (correspond(categorie)) items.push({ type: 'categorie', value: categorie });
    if (besoin) for (const etat of ETATS) if (correspond(etat)) items.push({ type: 'etat', value: etat });

    const motif = besoin ? accentInsensitivePattern(q) : null;
    const villes = await Annonce.aggregate([
        ...(motif ? [{ $match: { ville: { $regex: motif, $options: 'i' } } }] : []),
        { $group: { _id: { $toLower: '$ville' }, ville: { $first: '$ville' }, total: { $sum: 1 } } },
        { $sort: { total: -1, _id: 1 } },
        { $limit: besoin ? SUGGESTIONS_VILLES : SUGGESTIONS_VILLES_VIDE },
    ]);
    items.push(...villes.map(({ ville }) => ({ type: 'ville', value: ville })));

    if (motif) {
        const annonces = await Annonce.find({ titre: { $regex: motif, $options: 'i' } }).sort({ createdAt: -1, _id: -1 }).limit(20).select('titre');
        const vus = new Set();
        for (const annonce of annonces) {
            const cle = annonce.titre.toLowerCase();
            if (vus.has(cle) || vus.size >= SUGGESTIONS_TITRES) continue;
            vus.add(cle);
            items.push({ type: 'annonce', value: annonce.titre, id: String(annonce._id) });
        }
    }
    return items;
}
