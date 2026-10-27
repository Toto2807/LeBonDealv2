import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        // Stocké en minuscules : la comparaison et l'unicité sont donc insensibles à la casse.
        email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
        // Hash bcrypt uniquement. select:false => absent des requêtes sauf .select('+passwordHash').
        passwordHash: { type: String, required: true, select: false },
    },
    {
        timestamps: true,
        toJSON: {
            transform(_doc, ret) {
                ret.id = String(ret._id);
                delete ret._id;
                delete ret.__v;
                delete ret.passwordHash;
                return ret;
            },
        },
    },
);

export const User = mongoose.model('User', userSchema);
