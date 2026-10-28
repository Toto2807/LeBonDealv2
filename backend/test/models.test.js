import mongoose from 'mongoose';
import { connectTestDb, clearDb, closeTestDb } from './helpers/db.js';
import { User, Annonce, Favori, Message, Image, IMAGE_MAX_BYTES } from '../src/models/index.js';

const validAnnonce = (ownerId) => ({
    titre: 'Vélo de ville',
    prix: 120,
    categorie: 'Loisirs & Sport',
    ville: 'Lyon',
    ownerId,
});

describe('modèles Mongoose', () => {
    beforeAll(connectTestDb);
    beforeEach(clearDb);
    afterAll(closeTestDb);

    describe('User', () => {
        test("normalise l'email (minuscules, trim) et ne sélectionne pas le hash par défaut", async () => {
            await User.create({ email: '  Alice@Example.TEST ', passwordHash: 'hash' });

            const user = await User.findOne({ email: 'alice@example.test' });
            expect(user.email).toBe('alice@example.test');
            expect(user.passwordHash).toBeUndefined();
        });

        test("toJSON n'expose ni passwordHash ni _id", async () => {
            const user = await User.create({ email: 'a@example.test', passwordHash: 'hash' });

            const json = user.toJSON();
            expect(json.id).toBe(String(user._id));
            expect(json).not.toHaveProperty('passwordHash');
            expect(json).not.toHaveProperty('_id');
        });

        test('refuse un email déjà utilisé, même avec une casse différente', async () => {
            await User.create({ email: 'a@example.test', passwordHash: 'hash' });

            await expect(User.create({ email: 'A@EXAMPLE.test', passwordHash: 'hash' })).rejects.toMatchObject({ code: 11000 });
        });

        test('exige email et passwordHash', async () => {
            await expect(User.create({})).rejects.toThrow(mongoose.Error.ValidationError);
        });
    });

    describe('Annonce', () => {
        const ownerId = new mongoose.Types.ObjectId();

        test('applique les valeurs par défaut (statut, état, description)', async () => {
            const annonce = await Annonce.create(validAnnonce(ownerId));

            expect(annonce.statut).toBe('DISPONIBLE');
            expect(annonce.etat).toBe('Très bon état');
            expect(annonce.description).toBe('');
            expect(annonce.photo).toBeNull();
        });

        test.each([
            ['titre vide', { titre: '   ' }],
            ['titre trop long', { titre: 'x'.repeat(121) }],
            ['prix négatif', { prix: -1 }],
            ['prix décimal', { prix: 12.5 }],
            ['catégorie inconnue', { categorie: 'Voitures' }],
            ['statut inconnu', { statut: 'ARCHIVEE' }],
            ['code postal invalide', { codePostal: '7500' }],
            ['ville absente', { ville: undefined }],
            ['propriétaire absent', { ownerId: undefined }],
        ])('refuse : %s', async (_label, override) => {
            await expect(Annonce.create({ ...validAnnonce(ownerId), ...override })).rejects.toThrow(mongoose.Error.ValidationError);
        });
    });

    describe('Favori', () => {
        test('un même couple utilisateur/annonce ne peut exister qu’une fois', async () => {
            const userId = new mongoose.Types.ObjectId();
            const annonceId = new mongoose.Types.ObjectId();
            await Favori.create({ userId, annonceId });

            await expect(Favori.create({ userId, annonceId })).rejects.toMatchObject({ code: 11000 });
        });
    });

    describe('Message', () => {
        const ids = () => ({
            annonceId: new mongoose.Types.ObjectId(),
            fromId: new mongoose.Types.ObjectId(),
            toId: new mongoose.Types.ObjectId(),
        });

        test('enregistre un message valide', async () => {
            const message = await Message.create({ ...ids(), body: '  Bonjour, toujours dispo ?  ' });

            expect(message.body).toBe('Bonjour, toujours dispo ?');
        });

        test.each([[''], ['   '], ['x'.repeat(1001)]])('refuse un corps invalide (%#)', async (body) => {
            await expect(Message.create({ ...ids(), body })).rejects.toThrow(mongoose.Error.ValidationError);
        });
    });

    describe('Image', () => {
        const valid = () => ({ data: Buffer.from([1, 2, 3]), contentType: 'image/png', size: 3, ownerId: new mongoose.Types.ObjectId() });

        test('enregistre et relit des octets', async () => {
            const created = await Image.create(valid());

            const stored = await Image.findById(created._id);
            expect([...stored.data]).toEqual([1, 2, 3]);
            expect(stored.contentType).toBe('image/png');
        });

        test.each([
            ['type non autorisé (SVG)', { contentType: 'image/svg+xml' }],
            ['type absent', { contentType: undefined }],
            ['données absentes', { data: undefined }],
            ['taille nulle', { size: 0 }],
            ['taille au-delà de la limite', { size: IMAGE_MAX_BYTES + 1 }],
            ['propriétaire absent', { ownerId: undefined }],
        ])('refuse : %s', async (_label, override) => {
            await expect(Image.create({ ...valid(), ...override })).rejects.toThrow(mongoose.Error.ValidationError);
        });
    });
});
