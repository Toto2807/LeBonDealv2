import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';
import { config, assertConfig } from '../config/env.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { User, Annonce, Favori, Message, Image } from '../models/index.js';

// Données de démonstration 100 % fictives. Tous les comptes partagent ce mot de passe de développement.
export const SEED_PASSWORD = 'MotDePasse123!';

const SEED_USERS = ['thomas.durand', 'claire.bernard', 'alexandre.martin', 'sarah.klein', 'demo'].map((name) => `${name}@example.test`);

const unsplash = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`;

const SEED_ANNONCES = [
    { owner: 'thomas.durand@example.test', titre: 'Apple MacBook Pro 14" M2 Pro - 16 Go / 512 Go', prix: 1490, categorie: 'Multimédia', etat: 'Très bon état', statut: 'DISPONIBLE', ville: 'Bordeaux', codePostal: '33000', photo: unsplash('photo-1517336714731-489689fd1ca8'), description: 'MacBook Pro en état irréprochable avec boîte d’origine, facture et chargeur MagSafe. Batterie à 98%.', heures: 2 },
    { owner: 'claire.bernard@example.test', titre: 'Vélo de ville vintage Peugeot rénové 1984', prix: 260, categorie: 'Loisirs & Sport', etat: 'Très bon état', statut: 'DISPONIBLE', ville: 'Lyon', codePostal: '69007', photo: unsplash('photo-1485965120184-e220f721d03e'), description: 'Cadre acier restauré, freins et pneus Michelin neufs. Prêt à rouler.', heures: 5 },
    { owner: 'alexandre.martin@example.test', titre: 'Fauteuil design chêne massif & tissu bouclé', prix: 180, categorie: 'Maison & Mobilier', etat: 'Comme neuf', statut: 'DISPONIBLE', ville: 'Nantes', codePostal: '44000', photo: unsplash('photo-1567538096630-e0c55bd6374c'), description: 'Fauteuil confortable au design scandinave épuré. Tissu antitache neuf.', heures: 24 },
    { owner: 'sarah.klein@example.test', titre: 'Appareil photo télémétrique rétro 35mm', prix: 250, categorie: 'Multimédia', etat: 'Bon état', statut: 'RESERVEE', ville: 'Paris', codePostal: '75011', photo: unsplash('photo-1526170375885-4d8ecf77b99f'), description: 'Boîtier argentique fonctionnel, lentille 50mm f/1.8 impeccable.', heures: 48 },
];

// Idempotent : supprime les données de démonstration existantes puis les recrée.
export async function seedDatabase() {
    const existing = await User.find({ email: { $in: SEED_USERS } }).select('_id');
    const existingIds = existing.map((user) => user._id);
    const annonceIds = await Annonce.find({ ownerId: { $in: existingIds } }).distinct('_id');
    await Promise.all([
        Message.deleteMany({ $or: [{ fromId: { $in: existingIds } }, { toId: { $in: existingIds } }] }),
        Favori.deleteMany({ $or: [{ userId: { $in: existingIds } }, { annonceId: { $in: annonceIds } }] }),
        Annonce.deleteMany({ ownerId: { $in: existingIds } }),
        Image.deleteMany({ ownerId: { $in: existingIds } }),
    ]);
    await User.deleteMany({ _id: { $in: existingIds } });

    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    const users = await User.insertMany(SEED_USERS.map((email) => ({ email, passwordHash })));
    const byEmail = Object.fromEntries(users.map((user) => [user.email, user]));

    const now = Date.now();
    const annonces = await Annonce.insertMany(
        SEED_ANNONCES.map(({ owner, heures, ...fields }) => ({
            ...fields,
            ownerId: byEmail[owner]._id,
            createdAt: new Date(now - heures * 3600 * 1000),
        })),
    );

    const demo = byEmail['demo@example.test'];
    await Favori.insertMany([annonces[0], annonces[1]].map((annonce) => ({ userId: demo._id, annonceId: annonce._id })));
    await Message.create({
        annonceId: annonces[0]._id,
        fromId: demo._id,
        toId: annonces[0].ownerId,
        body: 'Bonjour, le MacBook est-il toujours disponible ?',
    });
    // Réponse du vendeur : la conversation de démonstration contient un aller-retour.
    await Message.create({
        annonceId: annonces[0]._id,
        fromId: annonces[0].ownerId,
        toId: demo._id,
        body: 'Oui, il est toujours disponible ! Vous pouvez passer le voir à Bordeaux cette semaine.',
    });

    return { users: users.length, annonces: annonces.length, favoris: 2, messages: 2 };
}

// Exécution en ligne de commande : npm run db:seed
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    try {
        if (config.env === 'production') throw new Error('Le seed est interdit en production');
        assertConfig();
        await connectDb(config.mongoUri);
        // Garantit les index (unicité) avant d'insérer.
        await Promise.all([User, Annonce, Favori, Message, Image].map((model) => model.init()));
        const summary = await seedDatabase();
    } catch (error) {
        process.exitCode = 1;
    } finally {
        await disconnectDb();
    }
}