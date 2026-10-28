import * as messageService from '../services/messageService.js';
import { assertObjectId } from '../validators/common.js';
import { validateMessage } from '../validators/messageValidator.js';

const conversationIds = (params) => [
    assertObjectId(params.annonceId, 'Annonce'),
    assertObjectId(params.interlocuteurId, 'Interlocuteur'),
];

export async function send(req, res) {
    const annonceId = assertObjectId(req.params.id);
    const message = await messageService.sendMessage(req.userId, annonceId, validateMessage(req.body));
    res.status(201).json(message);
}

export async function conversations(req, res) {
    res.status(200).json({ items: await messageService.listConversations(req.userId) });
}

export async function conversation(req, res) {
    const [annonceId, interlocuteurId] = conversationIds(req.params);
    res.status(200).json(await messageService.getConversation(req.userId, annonceId, interlocuteurId));
}

export async function reply(req, res) {
    const [annonceId, interlocuteurId] = conversationIds(req.params);
    const message = await messageService.replyInConversation(req.userId, annonceId, interlocuteurId, validateMessage(req.body));
    res.status(201).json(message);
}