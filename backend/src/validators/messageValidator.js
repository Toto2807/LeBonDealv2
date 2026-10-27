import { MESSAGE_MAX } from '../models/Message.js';
import { assertBodyObject, assertAllowedKeys, cleanString } from './common.js';

// Corps attendu : { "message": "texte" }. L'expéditeur vient du JWT, le destinataire de l'annonce.
export function validateMessage(body) {
    assertBodyObject(body);
    assertAllowedKeys(body, ['message']);
    return { message: cleanString(body.message, 'message', { max: MESSAGE_MAX }) };
}
