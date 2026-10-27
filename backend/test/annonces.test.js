import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { Annonce } from '../src/models/Annonce.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { config } from '../src/config/env.js';
import { connectTestDb, clearDb, closeTestDb } from './helpers/db.js';
import { registerUser } from './helpers/auth.js';
import { createAnnonce, validAnnonce } from './helpers/annonces.js';

const errorShape = (code) => ({ error: { code, message: expect.any(String) } });
const ABSENT_ID = '507f1f77bcf86cd799439011';

describe('annonces', () => {
    let alice;
    let bob;

    beforeAll(connectTestDb);
    beforeEach(async () => {
        await clearDb();
        alice = await registerUser('alice.martin@example.test');
        bob = await registerUser('bob@example.test');
    });
    afterAll(closeTestDb);

    describe('protection par JWT', () => {
        test.each([
            ['get', '/api/annonces'],
            ['post', '/api/annonces'],
            ['get', `/api/annonces/${ABSENT_ID}`],
            ['patch', `/api/annonces/${ABSENT_ID}`],
            ['delete', `/api/annonces/${ABSENT_ID}`],
        ])('401 UNAUTHORIZED sans jeton : %s %s', async (method, url) => {
            const response = await request(app)[method](url);

            expect(response.status).toBe(401);
            expect(response.body).toEqual(errorShape('UNAUTHORIZED'));
        });
    });

    describe('POST /api/annonces', () => {
        test('201 : crée l’annonce, propriétaire pris dans le JWT, forme publique contractuelle', async () => {
            const response = await request(app).post('/api/annonces').set(alice.auth).send(validAnnonce({ description: ' Prêt à rouler ', etat: 'Bon état', photo: 'https://exemple.test/velo.jpg', codePostal: '69007' }));

            expect(response.status).toBe(201);
            expect(response.body).toEqual({
                id: expect.any(String),
                titre: 'Vélo de ville vintage',
                description: 'Prêt à rouler',
                prix: 260,
                categorie: 'Loisirs & Sport',
                etat: 'Bon état',
                statut: 'DISPONIBLE',
                photo: 'https://exemple.test/velo.jpg',
                ville: 'Lyon',
                codePostal: '69007',
                ownerId: alice.user.id,
                vendeur: { id: alice.user.id, nom: 'Alice M.', membreDepuis: expect.any(String) },
                createdAt: expect.any(String),
                updatedAt: expect.any(String),
            });
            expect(response.body).not.toHaveProperty('_id');
            expect(response.body).not.toHaveProperty('__v');
            expect(JSON.stringify(response.body)).not.toContain('example.test');
            expect((await Annonce.findById(response.body.id)).ownerId.toString()).toBe(alice.user.id);
        });

        test('applique les valeurs par défaut', async () => {
            const annonce = await createAnnonce(alice.auth);

            expect(annonce).toMatchObject({ statut: 'DISPONIBLE', etat: 'Très bon état', description: '', photo: null, codePostal: null });
        });

        test.each([
            ['titre vide après trim', { titre: '   ' }],
            ['titre de 121 caractères', { titre: 'x'.repeat(121) }],
            ['titre non texte', { titre: 42 }],
            ['prix en chaîne', { prix: '260' }],
            ['prix décimal', { prix: 12.34 }],
            ['prix négatif', { prix: -5 }],
            ['prix trop grand', { prix: 1_000_001 }],
            ['catégorie hors liste', { categorie: 'Voitures' }],
            ['état hors liste', { etat: 'Cassé' }],
            ['statut hors liste', { statut: 'ARCHIVEE' }],
            ['photo en javascript:', { photo: 'javascript:alert(1)' }],
            ['photo non URL', { photo: 'pas une url' }],
            ['code postal à 4 chiffres', { codePostal: '6900' }],
            ['description de 2001 caractères', { description: 'x'.repeat(2001) }],
            ['ownerId imposé par le client', { ownerId: '507f1f77bcf86cd799439011' }],
            ['id imposé par le client', { id: '507f1f77bcf86cd799439011' }],
            ['_id imposé par le client', { _id: '507f1f77bcf86cd799439011' }],
            ['vendeur imposé', { vendeur: { nom: 'Faux' } }],
            ['propriété inconnue', { couleur: 'rouge' }],
        ])('400 INVALID_INPUT : %s', async (_label, override) => {
            const response = await request(app).post('/api/annonces').set(alice.auth).send(validAnnonce(override));

            expect(response.status).toBe(400);
            expect(response.body).toEqual(errorShape('INVALID_INPUT'));
            expect(await Annonce.countDocuments()).toBe(0);
        });

        test.each([['titre'], ['prix'], ['categorie'], ['ville']])('400 si %s est absent', async (field) => {
            const body = validAnnonce();
            delete body[field];

            const response = await request(app).post('/api/annonces').set(alice.auth).send(body);

            expect(response.status).toBe(400);
        });

        test('400 si le corps n’est pas un objet', async () => {
            expect((await request(app).post('/api/annonces').set(alice.auth).send([])).status).toBe(400);
            expect((await request(app).post('/api/annonces').set(alice.auth)).status).toBe(400);
        });

        test('accepte un prix de 0 (don)', async () => {
            expect((await request(app).post('/api/annonces').set(alice.auth).send(validAnnonce({ prix: 0 }))).status).toBe(201);
        });
    });

    describe('GET /api/annonces', () => {
        test('200 {"items":[]} quand il n’y a aucune annonce', async () => {
            const response = await request(app).get('/api/annonces').set(alice.auth);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ items: [] });
        });

        test('catalogue partagé : un compte voit les annonces des autres, les plus récentes d’abord', async () => {
            const first = await createAnnonce(alice.auth, { titre: 'Première' });
            const second = await createAnnonce(bob.auth, { titre: 'Seconde' });

            const response = await request(app).get('/api/annonces').set(alice.auth);

            expect(response.status).toBe(200);
            expect(response.body.items.map((item) => item.id)).toEqual([second.id, first.id]);
        });

        test('mine=true ne retourne que les annonces du compte connecté', async () => {
            const mine = await createAnnonce(alice.auth, { titre: 'À moi' });
            await createAnnonce(bob.auth, { titre: 'À Bob' });

            const response = await request(app).get('/api/annonces?mine=true').set(alice.auth);

            expect(response.body.items.map((item) => item.id)).toEqual([mine.id]);
        });

        describe('filtres', () => {
            beforeEach(async () => {
                await createAnnonce(alice.auth, { titre: 'MacBook Pro 14"', prix: 1490, categorie: 'Multimédia' });
                await createAnnonce(alice.auth, { titre: 'Vélo (rénové) 1984', prix: 260 });
                await createAnnonce(bob.auth, { titre: 'Fauteuil chêne', prix: 180, categorie: 'Maison & Mobilier', statut: 'RESERVEE' });
            });
            const titres = async (query) => (await request(app).get(`/api/annonces${query}`).set(alice.auth)).body.items.map((item) => item.titre).sort();

            test('q : recherche insensible à la casse sur le titre', async () => {
                expect(await titres('?q=macbook')).toEqual(['MacBook Pro 14"']);
            });

            test('q : les caractères spéciaux de regex sont traités comme du texte', async () => {
                expect(await titres('?q=(r%C3%A9nov%C3%A9)')).toEqual(['Vélo (rénové) 1984']);
                expect(await titres('?q=.*')).toEqual([]);
            });

            test('categorie', async () => {
                expect(await titres('?categorie=Maison%20%26%20Mobilier')).toEqual(['Fauteuil chêne']);
            });

            test('prixMax inclut la borne', async () => {
                expect(await titres('?prixMax=260')).toEqual(['Fauteuil chêne', 'Vélo (rénové) 1984']);
            });

            test('disponibles=true exclut réservées et vendues', async () => {
                expect(await titres('?disponibles=true')).toEqual(['MacBook Pro 14"', 'Vélo (rénové) 1984']);
            });

            test('combinaison de filtres', async () => {
                expect(await titres('?prixMax=300&disponibles=true&q=v%C3%A9lo')).toEqual(['Vélo (rénové) 1984']);
            });

            test('pagination : limit et page', async () => {
                const page1 = await request(app).get('/api/annonces?limit=2&page=1').set(alice.auth);
                const page2 = await request(app).get('/api/annonces?limit=2&page=2').set(alice.auth);

                expect(page1.body.items).toHaveLength(2);
                expect(page2.body.items).toHaveLength(1);
                expect(page2.body.items[0].id).not.toBe(page1.body.items[0].id);
            });

            test.each([
                ['prixMax non numérique', '?prixMax=abc'],
                ['prixMax négatif', '?prixMax=-1'],
                ['mine invalide', '?mine=peut-etre'],
                ['catégorie inconnue', '?categorie=Voitures'],
                ['limit à 0', '?limit=0'],
                ['limit au-delà du maximum', '?limit=101'],
                ['page à 0', '?page=0'],
                ['q répété', '?q=a&q=b'],
                ['q trop long', `?q=${'a'.repeat(101)}`],
                ['paramètre inconnu', '?tri=prix'],
                ['opérateur injecté', '?q[$ne]=x'],
            ])('400 INVALID_INPUT : %s', async (_label, query) => {
                const response = await request(app).get(`/api/annonces${query}`).set(alice.auth);

                expect(response.status).toBe(400);
                expect(response.body).toEqual(errorShape('INVALID_INPUT'));
            });
        });
    });

    describe('GET /api/annonces/:id', () => {
        test('200 : le propriétaire et tout autre compte connecté peuvent consulter une annonce', async () => {
            const annonce = await createAnnonce(alice.auth);

            const asOwner = await request(app).get(`/api/annonces/${annonce.id}`).set(alice.auth);
            const asOther = await request(app).get(`/api/annonces/${annonce.id}`).set(bob.auth);

            expect(asOwner.status).toBe(200);
            expect(asOwner.body).toEqual(annonce);
            expect(asOther.body).toEqual(annonce);
        });

        test('400 pour un identifiant mal formé, 404 pour un identifiant valide absent', async () => {
            const malformed = await request(app).get('/api/annonces/pas-un-id').set(alice.auth);
            const twelveChars = await request(app).get('/api/annonces/123456789012').set(alice.auth);
            const absent = await request(app).get(`/api/annonces/${ABSENT_ID}`).set(alice.auth);

            expect(malformed.status).toBe(400);
            expect(malformed.body).toEqual(errorShape('INVALID_INPUT'));
            expect(twelveChars.status).toBe(400);
            expect(absent.status).toBe(404);
            expect(absent.body).toEqual(errorShape('NOT_FOUND'));
        });
    });

    describe('PATCH /api/annonces/:id', () => {
        test('200 : modification partielle, les autres champs sont conservés', async () => {
            const annonce = await createAnnonce(alice.auth, { prix: 260 });

            const response = await request(app).patch(`/api/annonces/${annonce.id}`).set(alice.auth).send({ statut: 'VENDUE' });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ ...annonce, statut: 'VENDUE', updatedAt: expect.any(String) });
            expect((await Annonce.findById(annonce.id)).statut).toBe('VENDUE');
        });

        test('permet de vider la description et de retirer photo et code postal avec null', async () => {
            const annonce = await createAnnonce(alice.auth, { description: 'Texte', photo: 'https://exemple.test/a.jpg', codePostal: '69007' });

            const response = await request(app).patch(`/api/annonces/${annonce.id}`).set(alice.auth).send({ description: '', photo: null, codePostal: null });

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject({ description: '', photo: null, codePostal: null });
        });

        test.each([
            ['corps vide', {}],
            ['titre vide', { titre: '' }],
            ['titre null', { titre: null }],
            ['prix décimal', { prix: 9.99 }],
            ['statut inconnu', { statut: 'ARCHIVEE' }],
            ['ownerId', { ownerId: '507f1f77bcf86cd799439011' }],
            ['id', { id: '507f1f77bcf86cd799439011' }],
            ['createdAt', { createdAt: '2020-01-01' }],
            ['propriété inconnue', { couleur: 'rouge' }],
        ])('400 INVALID_INPUT : %s', async (_label, body) => {
            const annonce = await createAnnonce(alice.auth);

            const response = await request(app).patch(`/api/annonces/${annonce.id}`).set(alice.auth).send(body);

            expect(response.status).toBe(400);
            expect(response.body).toEqual(errorShape('INVALID_INPUT'));
        });

        test('404 NOT_FOUND pour un autre compte, et l’annonce reste inchangée', async () => {
            const annonce = await createAnnonce(alice.auth, { titre: 'Original' });

            const response = await request(app).patch(`/api/annonces/${annonce.id}`).set(bob.auth).send({ titre: 'Piraté' });

            expect(response.status).toBe(404);
            expect(response.body).toEqual(errorShape('NOT_FOUND'));
            expect((await Annonce.findById(annonce.id)).titre).toBe('Original');
        });

        test('400 pour un id mal formé, 404 pour un id absent', async () => {
            expect((await request(app).patch('/api/annonces/xyz').set(alice.auth).send({ titre: 'a' })).status).toBe(400);
            expect((await request(app).patch(`/api/annonces/${ABSENT_ID}`).set(alice.auth).send({ titre: 'a' })).status).toBe(404);
        });
    });

    describe('DELETE /api/annonces/:id', () => {
        test('204 sans corps, puis GET retourne 404', async () => {
            const annonce = await createAnnonce(alice.auth);

            const response = await request(app).delete(`/api/annonces/${annonce.id}`).set(alice.auth);

            expect(response.status).toBe(204);
            expect(response.text).toBe('');
            expect((await request(app).get(`/api/annonces/${annonce.id}`).set(alice.auth)).status).toBe(404);
        });

        test('404 pour un autre compte, et l’annonce existe toujours', async () => {
            const annonce = await createAnnonce(alice.auth);

            const response = await request(app).delete(`/api/annonces/${annonce.id}`).set(bob.auth);

            expect(response.status).toBe(404);
            expect(response.body).toEqual(errorShape('NOT_FOUND'));
            expect(await Annonce.countDocuments({ _id: annonce.id })).toBe(1);
        });

        test('400 pour un id mal formé, 404 pour un id absent', async () => {
            expect((await request(app).delete('/api/annonces/xyz').set(alice.auth)).status).toBe(400);
            expect((await request(app).delete(`/api/annonces/${ABSENT_ID}`).set(alice.auth)).status).toBe(404);
        });
    });

    test('persistance : une annonce non supprimée reste disponible après redémarrage de la connexion', async () => {
        const annonce = await createAnnonce(alice.auth, { titre: 'Durable' });

        await disconnectDb();
        await connectDb(config.mongoUri);
        const response = await request(app).get(`/api/annonces/${annonce.id}`).set(alice.auth);

        expect(mongoose.connection.readyState).toBe(1);
        expect(response.status).toBe(200);
        expect(response.body.titre).toBe('Durable');
    });
});
