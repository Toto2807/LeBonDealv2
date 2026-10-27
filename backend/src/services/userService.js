import { User } from '../models/User.js';
import { unauthorized } from '../errors/AppError.js';

export async function getProfile(userId) {
    const user = await User.findById(userId);
    // Jeton valide mais compte supprimé : la session n'est plus valable.
    if (!user) throw unauthorized('Compte introuvable');
    return { id: String(user._id), email: user.email };
}
