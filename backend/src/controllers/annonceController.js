import * as annonceService from '../services/annonceService.js';
import { assertObjectId } from '../validators/common.js';
import { validateCreate, validatePatch, validateListQuery } from '../validators/annonceValidator.js';

export async function list(req, res) {
    const items = await annonceService.listAnnonces(req.userId, validateListQuery(req.query));
    res.status(200).json({ items });
}

export async function create(req, res) {
    const annonce = await annonceService.createAnnonce(req.userId, validateCreate(req.body));
    res.status(201).json(annonce);
}

export async function getOne(req, res) {
    const annonce = await annonceService.getAnnonce(assertObjectId(req.params.id));
    res.status(200).json(annonce);
}

export async function update(req, res) {
    const id = assertObjectId(req.params.id);
    const annonce = await annonceService.updateAnnonce(req.userId, id, validatePatch(req.body));
    res.status(200).json(annonce);
}

export async function remove(req, res) {
    await annonceService.deleteAnnonce(req.userId, assertObjectId(req.params.id));
    res.status(204).end();
}
