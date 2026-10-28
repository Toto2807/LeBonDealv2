import request from 'supertest';
import app from '../src/app.js';
import { Message } from '../src/models/Message.js';
import { connectTestDb, clearDb, closeTestDb } from './helpers/db.js';
import { registerUser } from './helpers/auth.js';
import { createAnnonce } from './helpers/annonces.js';

const errorShape = (code) => ({ error: { code, message: expect.any(String) } });
const ABSENT_ID = '507f1f77bcf86cd799439011';

describe('messagerie (messages et conversations)', () => {
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
    const thread = (auth, interlocuteurId, annonceId = annonce.id) => request(app).get(`/api/conversations/${annonceId}/${interlocuteurId}`).set(auth);
    const reply = (auth, interlocuteurId, body, annonceId = annonce.id) => request(app).post(`/api/conversations/${annonceId}/${interlocuteurId}/messages`).set(auth).send(body);
    const conversations = (auth) => request(app).get('/api/conversations').set(auth);

    test.each([
        ['post', () => `/api/annonces/${ABSENT_ID}/message`],
        ['get', () => '/api/conversations'],
        ['get', () => `/api/conversations/${ABSENT_ID}/${ABSENT_ID}`],
        ['post', () => `/api/conversations/${ABSENT_ID}/${ABSENT_ID}/message`],
    ])('401 sans jeton : %s %s', async (method, url) => {
        const response = await request(app)[method](url());

        expect(response.status).toBe(401);
        expect(response.body).toEqual(errorShape('UNAUTHORIZED'));
    });

    describe('POST /api/annonces/:id/messages (premier message de l’acheteur)', () => {
        test('201 : expéditeur pris dans le JWT, destinataire = propriétaire de l’annonce', async () => {
            const response = await send(buyer.auth, { message: '  Bonjour, toujours disponible ?  ' });

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                id: expect.any(String),
                annonceId: annonce.id,
                annonceTitre: 'MacBook Pro',
                from: { id: buyer.user.id, nom: 'Claire' },
                to: { id: seller.user.id, nom: 'Thomas D.' },
                message: 'Bonjour, toujours disponible ?',
                fromMe: true,
                createdAt: expect.any(String),
            });
            expect(JSON.stringify(response.body)).not.toContain('example.test');
            const stored = await Message.findOne();
            expect(String(stored.fromId)).toBe(buyer.user.id);
            expect(String(stored.toId)).toBe(seller.user.id);
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
    });

    describe('conversations : lecture, réponse du vendeur, échanges', () => {
        test('le vendeur voit la conversation et peut répondre à l’acheteur', async () => {
            await send(buyer.auth, { message: 'Bonjour, toujours disponible ?' });

            const list = await conversations(seller.auth);
            expect(list.status).toBe(200);
            expect(list.body.items).toEqual([
                {
                    annonceId: annonce.id,
                    annonceTitre: 'MacBook Pro',
                    annoncePhoto: null,
                    interlocuteur: { id: buyer.user.id, nom: 'Claire' },
                    dernierMessage: { message: 'Bonjour, toujours disponible ?', fromMe: false, createdAt: expect.any(String) },
                    total: 1,
                },
            ]);

            const answer = await reply(seller.auth, buyer.user.id, { message: 'Oui, vous pouvez passer demain.' });
            expect(answer.status).toBe(201);
            expect(answer.body).toMatchObject({ fromMe: true, from: { id: seller.user.id }, to: { id: buyer.user.id }, message: 'Oui, vous pouvez passer demain.' });
            const stored = await Message.findOne({ body: 'Oui, vous pouvez passer demain.' });
            expect(String(stored.fromId)).toBe(seller.user.id);
            expect(String(stored.toId)).toBe(buyer.user.id);
        });

        test('l’acheteur voit la réponse, et chacun voit « fromMe » de son point de vue', async () => {
            await send(buyer.auth, { message: 'Question' });
            await reply(seller.auth, buyer.user.id, { message: 'Réponse' });
            await reply(buyer.auth, seller.user.id, { message: 'Merci !' });

            const asBuyer = await thread(buyer.auth, seller.user.id);
            const asSeller = await thread(seller.auth, buyer.user.id);

            expect(asBuyer.status).toBe(200);
            expect(asBuyer.body.annonce).toMatchObject({ id: annonce.id, titre: 'MacBook Pro', prix: 260, statut: 'DISPONIBLE' });
            expect(asBuyer.body.interlocuteur).toEqual({ id: seller.user.id, nom: 'Thomas D.' });
            expect(asBuyer.body.items.map((item) => item.message)).toEqual(['Question', 'Réponse', 'Merci !']);
            expect(asBuyer.body.items.map((item) => item.fromMe)).toEqual([true, false, true]);
            expect(asSeller.body.interlocuteur).toEqual({ id: buyer.user.id, nom: 'Claire' });
            expect(asSeller.body.items.map((item) => item.fromMe)).toEqual([false, true, false]);
        });

        test('la liste est triée de la conversation la plus récente à la plus ancienne et compte les messages', async () => {
            const second = await createAnnonce(seller.auth, { titre: 'Vélo' });
            await send(buyer.auth, { message: 'À propos du MacBook' });
            await send(other.auth, { message: 'À propos du MacBook aussi' }, annonce.id);
            await send(buyer.auth, { message: 'À propos du vélo' }, second.id);
            await reply(seller.auth, other.user.id, { message: 'Réponse à autre' });

            const list = await conversations(seller.auth);

            expect(list.body.items.map((item) => [item.annonceTitre, item.interlocuteur.nom, item.total])).toEqual([
                ['MacBook Pro', 'Autre', 2],
                ['Vélo', 'Claire', 1],
                ['MacBook Pro', 'Claire', 1],
            ]);
            expect(list.body.items[0].dernierMessage).toMatchObject({ message: 'Réponse à autre', fromMe: true });
            expect((await conversations(buyer.auth)).body.items).toHaveLength(2);
            expect((await conversations(other.auth)).body.items).toHaveLength(1);
        });

        test('un tiers ne peut ni lire ni écrire dans la conversation (404), et ne la voit pas dans sa liste', async () => {
            await send(buyer.auth, { message: 'Privé' });

            const reading = await thread(other.auth, buyer.user.id);
            const readingSeller = await thread(other.auth, seller.user.id);
            const writing = await reply(other.auth, buyer.user.id, { message: 'Intrusion' });

            expect(reading.status).toBe(404);
            expect(reading.body).toEqual(errorShape('NOT_FOUND'));
            expect(readingSeller.status).toBe(404);
            expect(writing.status).toBe(404);
            expect(await Message.countDocuments()).toBe(1);
            expect((await conversations(other.auth)).body).toEqual({ items: [] });
        });

        test('le vendeur ne peut pas démarrer une conversation avec quelqu’un qui ne lui a jamais écrit', async () => {
            const response = await reply(seller.auth, other.user.id, { message: 'Bonjour' });

            expect(response.status).toBe(404);
            expect(await Message.countDocuments()).toBe(0);
        });

        test('400 si on répond à soi-même, aux identifiants mal formés ou avec un corps invalide', async () => {
            await send(buyer.auth, { message: 'Question' });

            expect((await reply(buyer.auth, buyer.user.id, { message: 'Moi' })).status).toBe(400);
            expect((await thread(buyer.auth, 'xyz')).status).toBe(400);
            expect((await thread(buyer.auth, seller.user.id, 'xyz')).status).toBe(400);
            expect((await reply(buyer.auth, 'xyz', { message: 'a' })).status).toBe(400);
            for (const body of [{ message: '  ' }, { message: 'x'.repeat(1001) }, {}, { message: 'a', toId: seller.user.id }]) {
                const response = await reply(seller.auth, buyer.user.id, body);
                expect(response.status).toBe(400);
                expect(response.body).toEqual(errorShape('INVALID_INPUT'));
            }
            expect(await Message.countDocuments()).toBe(1);
        });

        test('404 pour une conversation inexistante', async () => {
            const response = await thread(buyer.auth, seller.user.id);

            expect(response.status).toBe(404);
            expect(response.body).toEqual(errorShape('NOT_FOUND'));
        });

        test('supprimer l’annonce supprime ses conversations', async () => {
            await send(buyer.auth, { message: 'Salut' });
            await reply(seller.auth, buyer.user.id, { message: 'Bonjour' });

            await request(app).delete(`/api/annonces/${annonce.id}`).set(seller.auth);

            expect(await Message.countDocuments()).toBe(0);
            expect((await conversations(seller.auth)).body).toEqual({ items: [] });
            expect((await thread(buyer.auth, seller.user.id)).status).toBe(404);
        });
    });
});