import request from 'supertest';
import app from '../src/app.js';
import { Message } from '../src/models/Message.js';
import { connectTestDb, clearDb, closeTestDb } from './helpers/db.js';
import { registerUser } from './helpers/auth.js';
import { createAnnonce } from './helpers/annonces.js';

const errorShape = (code) => ({ error: { code, message: expect.any(String) } });
const ABSENT_ID = '507f1f77bcf86cd799439011';

describe('messages au vendeur', () => {
    let seller;
    let buyer;
    let other;
    let annonce;

    beforeAll(connectTestDb);
    beforeEach(async () => {
        await clearDb();
        seller = await registerUser('thomas.durand@example.test');
        buyer = await registerUser('claire@example.test');
        other = await registerUser('autre@example.test');
        annonce = await createAnnonce(seller.auth, { titre: 'MacBook Pro' });
    });
    afterAll(closeTestDb);

    const send = (auth, body, id = annonce.id) => request(app).post(`/api/annonces/${id}/messages`).set(auth).send(body);

    test.each([
        ['post', () => `/api/annonces/${ABSENT_ID}/messages`],
        ['get', () => '/api/messages'],
    ])('401 sans jeton : %s', async (method, url) => {
        const response = await request(app)[method](url());

        expect(response.status).toBe(401);
        expect(response.body).toEqual(errorShape('UNAUTHORIZED'));
    });

    test('201 : expéditeur pris dans le JWT, destinataire = propriétaire de l’annonce', async () => {
        const response = await send(buyer.auth, { message: '  Bonjour, toujours disponible ?  ' });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            id: expect.any(String),
            annonceId: annonce.id,
            annonceTitre: 'MacBook Pro',
            from: { id: buyer.user.id, nom: 'Claire' },
            message: 'Bonjour, toujours disponible ?',
            createdAt: expect.any(String),
        });
        expect(JSON.stringify(response.body)).not.toContain('example.test');
        const stored = await Message.findOne();
        expect(String(stored.fromId)).toBe(buyer.user.id);
        expect(String(stored.toId)).toBe(seller.user.id);
    });

    test('le vendeur retrouve le message dans sa boîte de réception, pas les autres comptes', async () => {
        await send(buyer.auth, { message: 'Premier' });
        await send(other.auth, { message: 'Second' });

        const inbox = await request(app).get('/api/messages').set(seller.auth);
        const buyerInbox = await request(app).get('/api/messages').set(buyer.auth);

        expect(inbox.status).toBe(200);
        expect(inbox.body.items.map((item) => item.message)).toEqual(['Second', 'Premier']);
        expect(buyerInbox.body).toEqual({ items: [] });
    });

    test('400 si le vendeur s’écrit à lui-même', async () => {
        const response = await send(seller.auth, { message: 'Test' });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(errorShape('INVALID_INPUT'));
        expect(await Message.countDocuments()).toBe(0);
    });

    test.each([
        ['message vide', { message: '   ' }],
        ['message trop long', { message: 'x'.repeat(1001) }],
        ['message non texte', { message: 42 }],
        ['message absent', {}],
        ['destinataire imposé', { message: 'Salut', toId: '507f1f77bcf86cd799439011' }],
        ['expéditeur imposé', { message: 'Salut', fromId: '507f1f77bcf86cd799439011' }],
    ])('400 INVALID_INPUT : %s', async (_label, body) => {
        const response = await send(buyer.auth, body);

        expect(response.status).toBe(400);
        expect(response.body).toEqual(errorShape('INVALID_INPUT'));
        expect(await Message.countDocuments()).toBe(0);
    });

    test('400 pour un id mal formé, 404 pour une annonce absente', async () => {
        expect((await send(buyer.auth, { message: 'Salut' }, 'xyz')).status).toBe(400);
        const absent = await send(buyer.auth, { message: 'Salut' }, ABSENT_ID);
        expect(absent.status).toBe(404);
        expect(absent.body).toEqual(errorShape('NOT_FOUND'));
    });

    test('supprimer l’annonce supprime aussi ses messages', async () => {
        await send(buyer.auth, { message: 'Salut' });

        await request(app).delete(`/api/annonces/${annonce.id}`).set(seller.auth);

        expect(await Message.countDocuments()).toBe(0);
        expect((await request(app).get('/api/messages').set(seller.auth)).body).toEqual({ items: [] });
    });
});
