import * as messageService from '../services/messageService.js';
import { assertObjectId } from '../validators/common.js';
import { validateMessage } from '../validators/messageValidator.js';

export async function send(req, res) {
    const annonceId = assertObjectId(req.params.id);
    const message = await messageService.sendMessage(req.userId, annonceId, validateMessage(req.body));
    res.status(201).json(message);
}

export async function inbox(req, res) {
    res.status(200).json({ items: await messageService.listReceived(req.userId) });
}
