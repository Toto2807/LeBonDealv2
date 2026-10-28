import * as imageService from '../services/imageService.js';
import { invalidInput } from '../errors/AppError.js';
import { assertObjectId } from '../validators/common.js';

// Corps = octets de l'image, Content-Type = type de l'image (parsé par express.raw dans la route).
export async function upload(req, res) {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw invalidInput('Envoyez une image JPEG, PNG ou WebP (5 Mo maximum) comme corps de la requête');
    }
    const contentType = req.get('Content-Type').split(';')[0].trim().toLowerCase();
    res.status(201).json(await imageService.saveImage(req.userId, req.body, contentType));
}

// Route publique : une balise <img> ne peut pas envoyer d'en-tête Authorization. L'identifiant n'est pas devinable.
export async function download(req, res) {
    const image = await imageService.getImage(assertObjectId(req.params.id, 'Image'));
    res.set({
        'Content-Type': image.contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Resource-Policy': 'cross-origin',
    });
    res.status(200).send(image.data);
}
