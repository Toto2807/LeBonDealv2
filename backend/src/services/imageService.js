import { Annonce } from '../models/Annonce.js';
import { Image } from '../models/Image.js';
import { invalidInput, notFoundError } from '../errors/AppError.js';
import { imageIdFromUrl, imageUrl } from '../utils/images.js';

// Signatures ("magic bytes") : on vérifie le contenu réel, pas seulement l'en-tête Content-Type déclaré par le client.
const SIGNATURES = {
    'image/jpeg': (octets) => octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff,
    'image/png': (octets) => octets.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/webp': (octets) => octets.subarray(0, 4).toString('latin1') === 'RIFF' && octets.subarray(8, 12).toString('latin1') === 'WEBP',
};

export async function saveImage(userId, octets, contentType) {
    if (!SIGNATURES[contentType]?.(octets)) throw invalidInput('Le fichier n’est pas une image JPEG, PNG ou WebP valide');
    const image = await Image.create({ data: octets, contentType, size: octets.length, ownerId: userId });
    return { id: String(image._id), url: imageUrl(image._id), contentType, size: image.size };
}

export async function getImage(id) {
    const image = await Image.findById(id).select('data contentType');
    if (!image) throw notFoundError('Image introuvable');
    return image;
}

// Une annonce ne peut référencer qu'une image téléversée par son propriétaire.
export async function assertImageOwnedBy(userId, photo) {
    const id = imageIdFromUrl(photo);
    if (id && !(await Image.exists({ _id: id, ownerId: userId }))) throw invalidInput('photo : image inconnue, envoyez-la d’abord');
}

// Supprime l'image d'une ancienne photo si plus aucune annonce ne l'utilise.
export async function releaseImage(photo) {
    const id = imageIdFromUrl(photo);
    if (!id || (await Annonce.exists({ photo }))) return;
    await Image.deleteOne({ _id: id });
}
