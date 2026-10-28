import mongoose from 'mongoose';

export const MESSAGE_MAX = 1000;

const messageSchema = new mongoose.Schema(
    {
        annonceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Annonce', required: true },
        fromId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        toId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        body: { type: String, required: true, trim: true, minlength: 1, maxlength: MESSAGE_MAX },
    },
    { timestamps: true },
);

// Messages reçus et messages envoyés d'un utilisateur : liste de ses conversations.
messageSchema.index({ toId: 1, createdAt: -1 });
messageSchema.index({ fromId: 1, createdAt: -1 });
// Nettoyage des messages quand une annonce est supprimée.
messageSchema.index({ annonceId: 1 });

export const Message = mongoose.model('Message', messageSchema);