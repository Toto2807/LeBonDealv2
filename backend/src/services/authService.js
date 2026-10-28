import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import { emailAlreadyUsed, unauthorized } from '../errors/AppError.js';
import { PASSWORD_MAX_BYTES } from '../validators/authValidator.js';
import { signToken } from './tokenService.js';

const BCRYPT_ROUNDS = config.env === 'test' ? 4 : 10;
// Hash factice comparé quand l'email est inconnu : le temps de réponse ne révèle pas si le compte existe.
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', BCRYPT_ROUNDS);

function buildAuthResponse(user) {
    return { user: { id: String(user._id), email: user.email }, token: signToken(user._id) };
}

export async function register({ email, password }) {
    if (await User.exists({ email })) throw emailAlreadyUsed();

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    try {
        return buildAuthResponse(await User.create({ email, passwordHash }));
    } catch (error) {
        // Deux inscriptions simultanées : l'index unique tranche.
        if (error.code === 11000) throw emailAlreadyUsed();
        throw error;
    }
}

export async function login({ email, password }) {
    const user = await User.findOne({ email }).select('+passwordHash');
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordMatches || Buffer.byteLength(password) > PASSWORD_MAX_BYTES) {
        throw unauthorized('Email ou mot de passe incorrect');
    }
    return buildAuthResponse(user);
}
