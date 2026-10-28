import request from 'supertest';
import app from '../src/app.js';
import { Favori } from '../src/models/Favori.js';
import { connectTestDb, clearDb, closeTestDb } from './helpers/db.js';
import { registerUser } from './helpers/auth.js';
import { createAnnonce } from './helpers/annonces.js';

const errorShape = (code) => ({ error: { code, message: expect.any(String) } });
const ABSENT_ID = '507f1f77bcf86cd799439011';

describe('favoris', () => {
    let alice;
    let bob;
    let annonce;

    beforeAll(connectTestDb);
    beforeEach(async () => {
        await clearDb();
        alice = await registerUser('alice@example.test');
        bob = await registerUser('bob@example.test');
        annonce = await createAnnonce(bob.auth, { titre: 'Fauteuil design' });
    });
    afterAll(closeTestDb);

    const favorisOf = async (user) => (await request(app).get('/api/annonces?favoris=true').set(user.auth)).body.items;

    test.each([['put'], ['delete']])('401 sans jeton : %s', async (method) => {
        const response = await request(app)[method](`/api/favoris/${annonce.id}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual(errorShape('UNAUTHORIZED'));
    });

    test('PUT 204 : l’annonce apparaît dans mes favoris et porte favori:true pour moi seulement', async () => {
        const response = await request(app).put(`/api/favoris/${annonce.id}`).set(alice.auth);

        expect(response.status).toBe(204);
        expect(response.text).toBe('');
        expect((await favorisOf(alice)).map((item) => item.id)).toEqual([annonce.id]);
        expect((await request(app).get(`/api/annonces/${annonce.id}`).set(alice.auth)).body.favori).toBe(true);
        expect((await request(app).get(`/api/annonces/${annonce.id}`).set(bob.auth)).body.favori).toBe(false);
    });

    test('les favoris sont privés : un autre compte ne les voit pas', async () => {
        await request(app).put(`/api/favoris/${annonce.id}`).set(alice.auth);

        expect(await favorisOf(bob)).toEqual([]);
    });

    test('PUT est idempotent (un seul favori en base)', async () => {
        await request(app).put(`/api/favoris/${annonce.id}`).set(alice.auth);
        const second = await request(app).put(`/api/favoris/${annonce.id}`).set(alice.auth);

        expect(second.status).toBe(204);
        expect(await Favori.countDocuments({ userId: alice.user.id, annonceId: annonce.id })).toBe(1);
    });

    test('deux PUT simultanés ne provoquent aucune erreur', async () => {
        const send = () => request(app).put(`/api/favoris/${annonce.id}`).set(alice.auth);

        const statuses = (await Promise.all([send(), send(), send()])).map((response) => response.status);

        expect(statuses).toEqual([204, 204, 204]);
        expect(await Favori.countDocuments()).toBe(1);
    });

    test('DELETE 204 retire le favori, et reste idempotent', async () => {
        await request(app).put(`/api/favoris/${annonce.id}`).set(alice.auth);

        const first = await request(app).delete(`/api/favoris/${annonce.id}`).set(alice.auth);
        const second = await request(app).delete(`/api/favoris/${annonce.id}`).set(alice.auth);

        expect(first.status).toBe(204);
        expect(second.status).toBe(204);
        expect(await favorisOf(alice)).toEqual([]);
    });

    test('DELETE par un autre compte ne touche pas mes favoris', async () => {
        await request(app).put(`/api/favoris/${annonce.id}`).set(alice.auth);

        await request(app).delete(`/api/favoris/${annonce.id}`).set(bob.auth);

        expect(await favorisOf(alice)).toHaveLength(1);
    });

    test('400 pour un id mal formé, 404 pour une annonce absente (PUT)', async () => {
        expect((await request(app).put('/api/favoris/xyz').set(alice.auth)).status).toBe(400);
        expect((await request(app).delete('/api/favoris/xyz').set(alice.auth)).status).toBe(400);
        const absent = await request(app).put(`/api/favoris/${ABSENT_ID}`).set(alice.auth);
        expect(absent.status).toBe(404);
        expect(absent.body).toEqual(errorShape('NOT_FOUND'));
    });

    test('favoris=true se combine avec les autres filtres', async () => {
        const velo = await createAnnonce(bob.auth, { titre: 'Vélo', prix: 100 });
        await request(app).put(`/api/favoris/${annonce.id}`).set(alice.auth);
        await request(app).put(`/api/favoris/${velo.id}`).set(alice.auth);

        const response = await request(app).get('/api/annonces?favoris=true&q=v%C3%A9lo').set(alice.auth);

        expect(response.body.items.map((item) => item.id)).toEqual([velo.id]);
    });

    test('supprimer l’annonce supprime aussi ses favoris', async () => {
        await request(app).put(`/api/favoris/${annonce.id}`).set(alice.auth);

        await request(app).delete(`/api/annonces/${annonce.id}`).set(bob.auth);

        expect(await Favori.countDocuments()).toBe(0);
        expect(await favorisOf(alice)).toEqual([]);
    });
});
