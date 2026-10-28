import mongoose from 'mongoose';

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

// Photos d'annonces stockées dans MongoDB (aucun fichier sur disque). Une annonce y fait référence
// par son champ ⁠ photo ⁠ = "/api/images/<id>".
const imageSchema = new mongoose.Schema(
    {
        data: { type: Buffer, required: true },
        contentType: { type: String, required: true, enum: IMAGE_TYPES },
        size: { type: Number, required: true, min: 1, max: IMAGE_MAX_BYTES },
        // Propriétaire de l'image : seul lui peut l'attacher à une de ses annonces.
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

imageSchema.index({ ownerId: 1, createdAt: -1 });

export const Image = mongoose.model('Image', imageSchema);