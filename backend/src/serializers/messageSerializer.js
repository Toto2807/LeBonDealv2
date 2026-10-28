import { displayName } from './annonceSerializer.js';

export const nomDe = (user) => (user?.email ? displayName(user.email) : 'Utilisateur');

// Message d'une conversation, vu par `userId`.
// `fromId` et `toId` doivent être peuplés avec { email }, `annonceId` avec { titre }.
export function serializeMessage(message, userId) {
    const fromId = String(message.populated('fromId') ?? message.fromId);
    const toId = String(message.populated('toId') ?? message.toId);
    return {
        id: String(message._id),
        annonceId: String(message.populated('annonceId') ?? message.annonceId),
        annonceTitre: message.annonceId?.titre ?? null,
        from: { id: fromId, nom: nomDe(message.fromId) },
        to: { id: toId, nom: nomDe(message.toId) },
        message: message.body,
        fromMe: fromId === String(userId),
        createdAt: message.createdAt,
    };
}
