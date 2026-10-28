import request from 'supertest';
import app from '../src/app.js';
import { Image } from '../src/models/Image.js';
import { Annonce } from '../src/models/Annonce.js';
import { IMAGE_MAX_BYTES } from '../src/models/Image.js';
import { connectTestDb, clearDb, closeTestDb } from './helpers/db.js';
import { registerUser } from './helpers/auth.js';
import { validAnnonce } from './helpers/annonces.js';

const errorShape = (code) => ({ error: { code, message: expect.any(String) } });
const ABSENT_ID = '507f1f77bcf86cd799439011';

// Plus petits fichiers valides pour chaque format (seule la signature compte pour le serveur).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]), Buffer.from('JFIF'), Buffer.alloc(20)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x1a, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(20)]);

describe('photos des annonces', () => {
    let alice;
    let bob;

    beforeAll(connectTestDb);
    beforeEach(async () => {
        await clearDb();
        alice = await registerUser('alice@example.test');
        bob = await registerUser('bob@example.test');
    });
    afterAll(closeTestDb);

    const upload = (auth, contentType, octets) => request(app).post('/api/images').set(auth).set('Content-Type', contentType).send(octets);
    const createWithPhoto = (auth, photo) => request(app).post('/api/annonces').set(auth).send(validAnnonce({ photo }));

    describe('POST /api/images', () => {
        test('401 sans jeton', async () => {
            const response = await request(app).post('/api/images').set('Content-Type', 'image/png').send(PNG);

            expect(response.status).toBe(401);
            expect(response.body).toEqual(errorShape('UNAUTHORIZED'));
            expect(await Image.countDocuments()).toBe(0);
        });

        test.each([
            ['image/png', PNG],
            ['image/jpeg', JPEG],
            ['image/webp', WEBP],
        ])('201 : enregistre une image %s dans MongoDB', async (contentType, octets) => {
            const response = await upload(alice.auth, contentType, octets);

            expect(response.status).toBe(201);
            expect(response.body).toEqual({ id: expect.any(String), url: expect.stringMatching(/^\/api\/images\/[0-9a-f]{24}$/), contentType, size: octets.length });
            expect(response.body.url).toBe(`/api/images/${response.body.id}`);
            const stored = await Image.findById(response.body.id);
            expect(String(stored.ownerId)).toBe(alice.user.id);
            expect(Buffer.compare(stored.data, octets)).toBe(0);
        });

        test.each([
            ['type texte', 'text/plain', Buffer.from('bonjour')],
            ['SVG (peut contenir du script)', 'image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')],
            ['GIF', 'image/gif', Buffer.from('GIF89a')],
            ['PDF', 'application/pdf', Buffer.from('%PDF-1.4')],
        ])('400 INVALID_INPUT : %s', async (_label, contentType, octets) => {
            const response = await upload(alice.auth, contentType, octets);

            expect(response.status).toBe(400);
            expect(response.body).toEqual(errorShape('INVALID_INPUT'));
            expect(await Image.countDocuments()).toBe(0);
        });

        test('400 si le contenu ne correspond pas au type déclaré (fichier renommé)', async () => {
            const wrongType = await upload(alice.auth, 'image/png', JPEG);
            const notAnImage = await upload(alice.auth, 'image/jpeg', Buffer.from('<?php echo 1; ?>'));

            expect(wrongType.status).toBe(400);
            expect(notAnImage.status).toBe(400);
            expect(await Image.countDocuments()).toBe(0);
        });

        test('400 si le corps est vide ou absent', async () => {
            const empty = await upload(alice.auth, 'image/png', Buffer.alloc(0));
            const missing = await request(app).post('/api/images').set(alice.auth);

            expect(empty.status).toBe(400);
            expect(missing.status).toBe(400);
        });

        test('400 au-delà de 5 Mo', async () => {
            const tooBig = Buffer.concat([PNG, Buffer.alloc(IMAGE_MAX_BYTES)]);

            const response = await upload(alice.auth, 'image/png', tooBig);

            expect(response.status).toBe(400);
            expect(response.body).toEqual(errorShape('INVALID_INPUT'));
            expect(await Image.countDocuments()).toBe(0);
        });
    });

    describe('GET /api/images/:id (public)', () => {
        test('200 : renvoie les octets avec le bon type, un cache long et nosniff, sans jeton', async () => {
            const { body } = await upload(alice.auth, 'image/png', PNG);

            const response = await request(app).get(body.url).buffer(true).parse((res, done) => {
                const chunks = [];
                res.on('data', (chunk) => chunks.push(chunk));
                res.on('end', () => done(null, Buffer.concat(chunks)));
            });

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('image/png');
            expect(response.headers['cache-control']).toContain('immutable');
            expect(response.headers['x-content-type-options']).toBe('nosniff');
            expect(Buffer.compare(response.body, PNG)).toBe(0);
        });

        test('400 pour un identifiant mal formé, 404 pour une image absente', async () => {
            expect((await request(app).get('/api/images/xyz')).status).toBe(400);
            const absent = await request(app).get(`/api/images/${ABSENT_ID}`);
            expect(absent.status).toBe(404);
            expect(absent.body).toEqual(errorShape('NOT_FOUND'));
        });
    });

    describe('photo d’une annonce', () => {
        test('201 : une annonce peut utiliser une image envoyée par son propriétaire', async () => {
            const { body: image } = await upload(alice.auth, 'image/jpeg', JPEG);

            const response = await createWithPhoto(alice.auth, image.url);

            expect(response.status).toBe(201);
            expect(response.body.photo).toBe(image.url);
        });

        test('400 : l’image d’un autre compte, une image inconnue ou un identifiant mal formé sont refusés', async () => {
            const { body: image } = await upload(alice.auth, 'image/jpeg', JPEG);

            const others = await createWithPhoto(bob.auth, image.url);
            const unknown = await createWithPhoto(alice.auth, `/api/images/${ABSENT_ID}`);
            const malformed = await createWithPhoto(alice.auth, '/api/images/xyz');

            for (const response of [others, unknown, malformed]) {
                expect(response.status).toBe(400);
                expect(response.body).toEqual(errorShape('INVALID_INPUT'));
            }
            expect(await Annonce.countDocuments()).toBe(0);
        });

        test('les URL externes http(s) restent acceptées, pas javascript:', async () => {
            expect((await createWithPhoto(alice.auth, 'https://exemple.test/velo.jpg')).status).toBe(201);
            expect((await createWithPhoto(alice.auth, 'javascript:alert(1)')).status).toBe(400);
        });

        test('PATCH : le propriétaire peut ajouter, remplacer puis retirer sa photo', async () => {
            const { body: first } = await upload(alice.auth, 'image/png', PNG);
            const { body: second } = await upload(alice.auth, 'image/jpeg', JPEG);
            const annonce = (await createWithPhoto(alice.auth, first.url)).body;

            const replaced = await request(app).patch(`/api/annonces/${annonce.id}`).set(alice.auth).send({ photo: second.url });
            const removed = await request(app).patch(`/api/annonces/${annonce.id}`).set(alice.auth).send({ photo: null });

            expect(replaced.body.photo).toBe(second.url);
            expect(removed.body.photo).toBeNull();
        });

        test('remplacer, retirer ou supprimer la photo libère l’ancienne image', async () => {
            const { body: first } = await upload(alice.auth, 'image/png', PNG);
            const { body: second } = await upload(alice.auth, 'image/jpeg', JPEG);
            const annonce = (await createWithPhoto(alice.auth, first.url)).body;
            expect(await Image.countDocuments()).toBe(2);

            await request(app).patch(`/api/annonces/${annonce.id}`).set(alice.auth).send({ photo: second.url });
            expect(await Image.exists({ _id: first.id })).toBeNull();
            expect(await Image.exists({ _id: second.id })).toBeTruthy();

            await request(app).patch(`/api/annonces/${annonce.id}`).set(alice.auth).send({ photo: null });
            expect(await Image.exists({ _id: second.id })).toBeNull();
        });

        test('supprimer l’annonce supprime sa photo, sauf si une autre annonce l’utilise encore', async () => {
            const { body: image } = await upload(alice.auth, 'image/png', PNG);
            const one = (await createWithPhoto(alice.auth, image.url)).body;
            const two = (await createWithPhoto(alice.auth, image.url)).body;

            await request(app).delete(`/api/annonces/${one.id}`).set(alice.auth);
            expect(await Image.exists({ _id: image.id })).toBeTruthy();

            await request(app).delete(`/api/annonces/${two.id}`).set(alice.auth);
            expect(await Image.exists({ _id: image.id })).toBeNull();
            expect((await request(app).get(image.url)).status).toBe(404);
        });

        test('un autre compte ne peut pas faire supprimer l’image en tentant de modifier l’annonce', async () => {
            const { body: image } = await upload(alice.auth, 'image/png', PNG);
            const annonce = (await createWithPhoto(alice.auth, image.url)).body;

            const response = await request(app).patch(`/api/annonces/${annonce.id}`).set(bob.auth).send({ photo: null });

            expect(response.status).toBe(404);
            expect(await Image.exists({ _id: image.id })).toBeTruthy();
        });
    });
});
