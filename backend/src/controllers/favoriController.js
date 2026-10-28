import * as favoriService from '../services/favoriService.js';
import { assertObjectId } from '../validators/common.js';

export async function add(req, res) {
    await favoriService.addFavori(req.userId, assertObjectId(req.params.annonceId));
    res.status(204).end();
}

export async function remove(req, res) {
    await favoriService.removeFavori(req.userId, assertObjectId(req.params.annonceId));
    res.status(204).end();
}
