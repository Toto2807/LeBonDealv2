import 'dotenv/config'

const env = process.env

export const config = {
    env: env.NODE_ENV || 'development',
    port: Number(env.PORT) || 3000,
    mongoUri: env.MONGODB_URI,
    corsOrigin: (env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((origin) => origin.trim()),
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN || '2h',
}

// Appelée au démarrage du serveur (pas à l'import, pour que les tests puissent importer l'app).
export function assertConfig() {
    const missing = []
    if (!config.mongoUri) missing.push('MONGODB_URI')
    if (!config.jwtSecret) missing.push('JWT_SECRET')
    if (missing.length > 0) {
        throw new Error(`Variables d'environnement manquantes : ${missing.join(', ')} (voir backend/.env.example)`)
    }
    if (config.jwtSecret.length < 32) {
        throw new Error('JWT_SECRET doit contenir au moins 32 caractères')
    }
}
