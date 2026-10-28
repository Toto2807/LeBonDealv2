import mongoose from 'mongoose';
import { Annonce } from '../models/Annonce.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { invalidInput, notFoundError } from '../errors/AppError.js';
import { serializeMessage, nomDe } from '../serializers/messageSerializer.js';

const CONVERSATIONS_LIMIT = 100;
const THREAD_LIMIT = 200;

// Une conversation = les messages d'une annonce échangés entre deux utilisateurs, dans un sens ou dans l'autre.
// Filtrer sur le couple (userId, autreId) garantit qu'un tiers n'y a jamais accès (404).
const threadFilter = (userId, annonceId, autreId) => ({
    annonceId,
    $or: [
        { fromId: userId, toId: autreId },
        { fromId: autreId, toId: userId },
    ],
});

async function populated(message) {
    return message.populate([
        { path: 'fromId', select: 'email' },
        { path: 'toId', select: 'email' },
        { path: 'annonceId', select: 'titre' },
    ]);
}

// Premier message (ou suivant) d'un acheteur au vendeur de l'annonce.
export async function sendMessage(userId, annonceId, { message }) {
    const annonce = await Annonce.findById(annonceId).select('ownerId');
    if (!annonce) throw notFoundError('Annonce introuvable');
    if (String(annonce.ownerId) === String(userId)) throw invalidInput('Vous ne pouvez pas vous écrire à vous-même');

    const created = await Message.create({ annonceId, fromId: userId, toId: annonce.ownerId, body: message });
    return serializeMessage(await populated(created), userId);
}

// Conversations de l'utilisateur (messages envoyés ET reçus), la plus récente d'abord.
export async function listConversations(userId) {
    const me = new mongoose.Types.ObjectId(userId);
    const groupes = await Message.aggregate([
        { $match: { $or: [{ fromId: me }, { toId: me }] } },
        { $sort: { createdAt: -1, _id: -1 } },
        {
            $group: {
                _id: { annonceId: '$annonceId', autreId: { $cond: [{ $eq: ['$fromId', me] }, '$toId', '$fromId'] } },
                dernier: { $first: '$$ROOT' },
                total: { $sum: 1 },
            },
        },
        { $sort: { 'dernier.createdAt': -1, 'dernier._id': -1 } },
        { $limit: CONVERSATIONS_LIMIT },
    ]);

    const [annonces, users] = await Promise.all([
        Annonce.find({ _id: { $in: groupes.map((groupe) => groupe._id.annonceId) } }).select('titre photo'),
        User.find({ _id: { $in: groupes.map((groupe) => groupe._id.autreId) } }).select('email'),
    ]);
    const annonceParId = new Map(annonces.map((annonce) => [String(annonce._id), annonce]));
    const userParId = new Map(users.map((user) => [String(user._id), user]));

    return groupes.map(({ _id, dernier, total }) => {
        const annonce = annonceParId.get(String(_id.annonceId));
        return {
            annonceId: String(_id.annonceId),
            annonceTitre: annonce?.titre ?? null,
            annoncePhoto: annonce?.photo ?? null,
            interlocuteur: { id: String(_id.autreId), nom: nomDe(userParId.get(String(_id.autreId))) },
            dernierMessage: {
                message: dernier.body,
                fromMe: String(dernier.fromId) === String(userId),
                createdAt: dernier.createdAt,
            },
            total,
        };
    });
}

// Fil de discussion complet (les 200 derniers messages, du plus ancien au plus récent).
export async function getConversation(userId, annonceId, autreId) {
    const recents = await Message.find(threadFilter(userId, annonceId, autreId))
        .sort({ createdAt: -1, _id: -1 })
        .limit(THREAD_LIMIT)
        .populate('fromId', 'email')
        .populate('toId', 'email')
        .populate('annonceId', 'titre');
    if (recents.length === 0) throw notFoundError('Conversation introuvable');

    const [annonce, autre] = await Promise.all([
        Annonce.findById(annonceId).select('titre prix photo statut'),
        User.findById(autreId).select('email'),
    ]);
    if (!annonce) throw notFoundError('Conversation introuvable');

    return {
        annonce: { id: String(annonce._id), titre: annonce.titre, prix: annonce.prix, photo: annonce.photo, statut: annonce.statut },
        interlocuteur: { id: String(autreId), nom: nomDe(autre) },
        items: recents.reverse().map((message) => serializeMessage(message, userId)),
    };
}

// Répondre dans une conversation existante (acheteur comme vendeur). On ne peut pas écrire à quelqu'un
// qui n'a jamais échangé avec nous sur cette annonce : le vendeur ne peut donc que répondre.
export async function replyInConversation(userId, annonceId, autreId, { message }) {
    if (String(autreId) === String(userId)) throw invalidInput('Vous ne pouvez pas vous écrire à vous-même');
    if (!(await Message.exists(threadFilter(userId, annonceId, autreId)))) throw notFoundError('Conversation introuvable');

    const created = await Message.create({ annonceId, fromId: userId, toId: autreId, body: message });
    return serializeMessage(await populated(created), userId);
}