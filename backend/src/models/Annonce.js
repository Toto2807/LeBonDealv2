import mongoose from 'mongoose';

export const CATEGORIES = ['Multimédia', 'Loisirs & Sport', 'Maison & Mobilier'];
export const ETATS = ['Neuf', 'Comme neuf', 'Très bon état', 'Bon état', 'État correct'];
export const STATUTS = ['DISPONIBLE', 'RESERVEE', 'VENDUE'];
export const PRIX_MAX = 1_000_000;

const annonceSchema = new mongoose.Schema(
    {
        titre: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
        description: { type: String, trim: true, maxlength: 2000, default: '' },
        // Prix en euros, entier (0 = gratuit).
        prix: {
            type: Number,
            required: true,
            min: 0,
            max: PRIX_MAX,
            validate: { validator: Number.isInteger, message: 'prix doit être un entier' },
        },
        categorie: { type: String, required: true, enum: CATEGORIES },
        etat: { type: String, enum: ETATS, default: 'Très bon état' },
        statut: { type: String, enum: STATUTS, default: 'DISPONIBLE' },
        photo: { type: String, trim: true, maxlength: 500, default: null },
        ville: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
        codePostal: { type: String, match: /^\d{5}$/, default: null },
        // Propriétaire : toujours renseigné côté serveur à partir du JWT, jamais par le client.
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true },
);

// "Mes annonces" et listing du catalogue triés du plus récent au plus ancien.
annonceSchema.index({ ownerId: 1, createdAt: -1 });
annonceSchema.index({ createdAt: -1 });
// Filtres du catalogue.
annonceSchema.index({ statut: 1, createdAt: -1 });
annonceSchema.index({ categorie: 1, prix: 1 });

export const Annonce = mongoose.model('Annonce', annonceSchema);
