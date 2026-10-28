import request from 'supertest';
import app from '../src/app.js';
import { User, Annonce, Favori, Message } from '../src/models/index.js';
import { seedDatabase, SEED_PASSWORD } from '../src/seed/seed.js';
import { connectTestDb, clearDb, closeTestDb } from './helpers/db.js';
import { registerUser } from './helpers/auth.js';

describe('seed de démonstration', () => {
    beforeAll(connectTestDb);
    beforeEach(clearDb);
    afterAll(closeTestDb);

    test('crée comptes, annonces, favoris et message', async () => {
        const summary = await seedDatabase();

        expect(summary).toEqual({ users: 5, annonces: 4, favoris: 2, messages: 1 });
        expect(await User.countDocuments()).toBe(5);
        expect(await Annonce.countDocuments()).toBe(4);
        expect(await Favori.countDocuments()).toBe(2);
        expect(await Message.countDocuments()).toBe(1);
    });

    test('est idempotent : relancé deux fois, les compteurs restent identiques', async () => {
        await seedDatabase();
        await seedDatabase();

        expect(await User.countDocuments()).toBe(5);
        expect(await Annonce.countDocuments()).toBe(4);
        expect(await Favori.countDocuments()).toBe(2);
        expect(await Message.countDocuments()).toBe(1);
    });

    test('ne touche pas aux autres comptes', async () => {
        const { user } = await registerUser('vrai.utilisateur@example.test');

        await seedDatabase();
        await seedDatabase();

        expect(await User.exists({ _id: user.id })).toBeTruthy();
    });

    test('les comptes de démonstration peuvent se connecter via l’API et voient le catalogue', async () => {
        await seedDatabase();

        const login = await request(app).post('/api/auth/login').send({ email: 'demo@example.test', password: SEED_PASSWORD });
        const catalogue = await request(app).get('/api/annonces').set({ Authorization: `Bearer ${login.body.token}` });

        expect(login.status).toBe(200);
        expect(catalogue.body.items).toHaveLength(4);
        expect(catalogue.body.items.filter((annonce) => annonce.favori)).toHaveLength(2);
        expect(catalogue.body.items.map((annonce) => annonce.vendeur.nom).sort()).toEqual(['Alexandre M.', 'Claire B.', 'Sarah K.', 'Thomas D.']);
    });

    test('conserve les dates de création de démonstration (annonces triées de la plus récente)', async () => {
        await seedDatabase();

        const login = await request(app).post('/api/auth/login').send({ email: 'demo@example.test', password: SEED_PASSWORD });
        const { items } = (await request(app).get('/api/annonces').set({ Authorization: `Bearer ${login.body.token}` })).body;

        expect(items[0].titre).toMatch(/MacBook/);
        expect(items[items.length - 1].titre).toMatch(/Appareil photo/);
    });
});
