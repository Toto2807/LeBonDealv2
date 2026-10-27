import mongoose from 'mongoose';

const favoriSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        annonceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Annonce', required: true },
    },
    { timestamps: true },
);

// Un utilisateur ne peut mettre une annonce en favori qu'une seule fois.
favoriSchema.index({ userId: 1, annonceId: 1 }, { unique: true });
// Nettoyage des favoris quand une annonce est supprimée.
favoriSchema.index({ annonceId: 1 });

export const Favori = mongoose.model('Favori', favoriSchema);
