import { displayName } from './annonceSerializer.js';

// `fromId` doit être peuplé avec { email } et `annonceId` avec { titre }.
export function serializeMessage(message) {
    const from = message.fromId;
    const annonce = message.annonceId;
    return {
        id: String(message._id),
        annonceId: String(message.populated('annonceId') ?? annonce),
        annonceTitre: annonce?.titre ?? null,
        from: { id: String(message.populated('fromId') ?? from), nom: from?.email ? displayName(from.email) : 'Utilisateur' },
        message: message.body,
        createdAt: message.createdAt,
    };
}
