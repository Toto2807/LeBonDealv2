import request from 'supertest';
import app from '../src/app.js';
import { connectTestDb, clearDb, closeTestDb } from './helpers/db.js';
import { registerUser } from './helpers/auth.js';
import { createAnnonce } from './helpers/annonces.js';

const errorShape = (code) => ({ error: { code, message: expect.any(String) } });

describe('GET /api/annonces/suggestions', () => {
    let alice;
    let bob;

    beforeAll(connectTestDb);
    beforeEach(async () => {
        await clearDb();
        alice = await registerUser('alice@example.test');
        bob = await registerUser('bob@example.test');
        await createAnnonce(alice.auth, { titre: 'Vélo de ville vintage', categorie: 'Loisirs & Sport', ville: 'Lyon', etat: 'Bon état' });
        await createAnnonce(bob.auth, { titre: 'Fauteuil chêne', categorie: 'Maison & Mobilier', ville: 'lyon' });
        await createAnnonce(bob.auth, { titre: 'MacBook Pro 14"', categorie: 'Multimédia', ville: 'Paris' });
    });
    afterAll(closeTestDb);

    const suggestions = async (query = '', auth = alice.auth) => {
        const response = await request(app).get(`/api/annonces/suggestions${query}`).set(auth);
        return response;
    };
    const valeurs = (response) => response.body.items.map((item) => `${item.type}:${item.value}`);

    test('401 sans jeton', async () => {
        const response = await request(app).get('/api/annonces/suggestions');

        expect(response.status).toBe(401);
        expect(response.body).toEqual(errorShape('UNAUTHORIZED'));
    });

    test('sans texte : toutes les catégories puis les villes les plus présentes (Lyon et lyon comptées ensemble)', async () => {
        const response = await suggestions();

        expect(response.status).toBe(200);
        expect(valeurs(response)).toEqual([
            'categorie:Multimédia',
            'categorie:Loisirs & Sport',
            'categorie:Maison & Mobilier',
            'ville:Lyon',
            'ville:Paris',
        ]);
    });

    test('propose les catégories qui correspondent, sans tenir compte des accents ni de la casse', async () => {
        expect(valeurs(await suggestions('?q=MULTIMEDIA'))).toContain('categorie:Multimédia');
        expect(valeurs(await suggestions('?q=mobil'))).toContain('categorie:Maison & Mobilier');
    });

    test('propose les états qui correspondent', async () => {
        expect(valeurs(await suggestions('?q=etat'))).toEqual(expect.arrayContaining(['etat:Très bon état', 'etat:Bon état', 'etat:État correct']));
        expect(valeurs(await suggestions('?q=comme'))).toContain('etat:Comme neuf');
    });

    test('propose les villes qui correspondent', async () => {
        const response = await suggestions('?q=ly');

        expect(valeurs(response)).toEqual(['ville:Lyon']);
    });

    test('propose les titres d’annonces de tout le catalogue, avec leur identifiant', async () => {
        const response = await suggestions('?q=velo');

        expect(response.body.items).toEqual([{ type: 'annonce', value: 'Vélo de ville vintage', id: expect.any(String) }]);
    });

    test('ne répète pas deux titres identiques et limite à 5 titres', async () => {
        for (let numero = 1; numero <= 7; numero += 1) await createAnnonce(alice.auth, { titre: `Chaise ${numero}` });
        await createAnnonce(bob.auth, { titre: 'chaise 1' });

        const titres = (await suggestions('?q=chaise')).body.items.filter((item) => item.type === 'annonce');

        expect(titres).toHaveLength(5);
        expect(new Set(titres.map((item) => item.value.toLowerCase())).size).toBe(5);
    });

    test('les caractères spéciaux sont traités comme du texte', async () => {
        const response = await suggestions('?q=%28.%2A');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ items: [] });
    });

    test('la route n’est pas confondue avec /api/annonces/:id', async () => {
        const response = await suggestions();

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.items)).toBe(true);
    });

    test.each([
        ['texte trop long', `?q=${'a'.repeat(101)}`],
        ['texte répété', '?q=a&q=b'],
        ['paramètre inconnu', '?tri=prix'],
    ])('400 INVALID_INPUT : %s', async (_label, query) => {
        const response = await suggestions(query);

        expect(response.status).toBe(400);
        expect(response.body).toEqual(errorShape('INVALID_INPUT'));
    });
});
