import { Annonce } from '../models/Annonce.js';
import { Message } from '../models/Message.js';
import { invalidInput, notFoundError } from '../errors/AppError.js';
import { serializeMessage } from '../serializers/messageSerializer.js';

const INBOX_LIMIT = 100;

async function populated(message) {
    return message.populate([
        { path: 'fromId', select: 'email' },
        { path: 'annonceId', select: 'titre' },
    ]);
}

// Envoie un message au vendeur de l'annonce. Le destinataire est le propriétaire de l'annonce.
export async function sendMessage(userId, annonceId, { message }) {
    const annonce = await Annonce.findById(annonceId).select('ownerId');
    if (!annonce) throw notFoundError('Annonce introuvable');
    if (String(annonce.ownerId) === String(userId)) throw invalidInput('Vous ne pouvez pas vous écrire à vous-même');

    const created = await Message.create({ annonceId, fromId: userId, toId: annonce.ownerId, body: message });
    return serializeMessage(await populated(created));
}

// Messages reçus par l'utilisateur, du plus récent au plus ancien.
export async function listReceived(userId) {
    const messages = await Message.find({ toId: userId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(INBOX_LIMIT)
        .populate('fromId', 'email')
        .populate('annonceId', 'titre');
    return messages.map(serializeMessage);
}
