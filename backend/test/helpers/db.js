import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../../src/config/db.js';
import { config } from '../../src/config/env.js';
import '../../src/models/index.js';

// Connexion à la base de TEST uniquement : on refuse de démarrer sur une autre base
// pour ne jamais effacer les données de développement.
export async function connectTestDb() {
    await connectDb(config.mongoUri);
    if (!mongoose.connection.name.endsWith('_test')) {
        const name = mongoose.connection.name;
        await disconnectDb();
        throw new Error(`Base "${name}" refusée : les tests exigent une base dont le nom finit par _test`);
    }
    // Attend la création des index (unicité email, favoris...) avant les tests.
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

// Vide toutes les collections en conservant les index : fixtures déterministes à chaque test.
export async function clearDb() {
    await Promise.all(Object.values(mongoose.models).map((model) => model.deleteMany({})));
}

export async function closeTestDb() {
    await disconnectDb();
}
