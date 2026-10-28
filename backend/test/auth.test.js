import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { connectTestDb, clearDb, closeTestDb } from './helpers/db.js';
import { registerUser, PASSWORD } from './helpers/auth.js';

const secret = process.env.JWT_SECRET;
const errorShape = (code) => ({ error: { code, message: expect.any(String) } });

describe('authentification', () => {
    beforeAll(connectTestDb);
    beforeEach(clearDb);
    afterAll(closeTestDb);

    describe('POST /api/auth/register', () => {
        test('201 : retourne user {id,email} et un vrai JWT, sans mot de passe ni hash', async () => {
            const response = await request(app).post('/api/auth/register').send({ email: 'alice@example.test', password: PASSWORD });

            expect(response.status).toBe(201);
            expect(response.body).toEqual({ user: { id: expect.any(String), email: 'alice@example.test' }, token: expect.any(String) });
            expect(JSON.stringify(response.body)).not.toMatch(/password|hash/i);

            const payload = jwt.verify(response.body.token, secret);
            expect(payload.sub).toBe(response.body.user.id);
            expect(payload.exp).toBeGreaterThan(payload.iat);
        });

        test('stocke uniquement un hash bcrypt', async () => {
            await request(app).post('/api/auth/register').send({ email: 'alice@example.test', password: PASSWORD });

            const stored = await User.findOne({ email: 'alice@example.test' }).select('+passwordHash');
            expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
            expect(stored.passwordHash).not.toContain(PASSWORD);
        });

        test('409 EMAIL_ALREADY_USED, insensible à la casse', async () => {
            await registerUser('alice@example.test');

            const response = await request(app).post('/api/auth/register').send({ email: ' ALICE@Example.TEST ', password: PASSWORD });

            expect(response.status).toBe(409);
            expect(response.body).toEqual(errorShape('EMAIL_ALREADY_USED'));
        });

        test('deux inscriptions simultanées avec le même email : une seule réussit', async () => {
            const send = () => request(app).post('/api/auth/register').send({ email: 'race@example.test', password: PASSWORD });

            const statuses = (await Promise.all([send(), send()])).map((response) => response.status).sort();

            expect(statuses).toEqual([201, 409]);
            expect(await User.countDocuments({ email: 'race@example.test' })).toBe(1);
        });

        test.each([
            ['email invalide', { email: 'pas-un-email', password: PASSWORD }],
            ['email absent', { password: PASSWORD }],
            ['mot de passe de 7 caractères', { email: 'a@example.test', password: '1234567' }],
            ['mot de passe de plus de 72 octets', { email: 'a@example.test', password: 'a'.repeat(73) }],
            ['mot de passe absent', { email: 'a@example.test' }],
            ['mot de passe numérique', { email: 'a@example.test', password: 12345678 }],
            ['email objet (injection NoSQL)', { email: { $ne: null }, password: PASSWORD }],
            ['propriété inconnue', { email: 'a@example.test', password: PASSWORD, role: 'admin' }],
            ['tentative d’imposer id', { email: 'a@example.test', password: PASSWORD, id: '507f1f77bcf86cd799439011' }],
        ])('400 INVALID_INPUT : %s', async (_label, body) => {
            const response = await request(app).post('/api/auth/register').send(body);

            expect(response.status).toBe(400);
            expect(response.body).toEqual(errorShape('INVALID_INPUT'));
            expect(await User.countDocuments()).toBe(0);
        });

        test('400 si le corps est absent ou n’est pas un objet', async () => {
            expect((await request(app).post('/api/auth/register')).status).toBe(400);
            expect((await request(app).post('/api/auth/register').send([])).status).toBe(400);
        });
    });

    describe('POST /api/auth/login', () => {
        test('200 : même schéma que register, email insensible à la casse', async () => {
            const { user } = await registerUser('alice@example.test');

            const response = await request(app).post('/api/auth/login').send({ email: 'ALICE@example.test', password: PASSWORD });

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ user: { id: user.id, email: 'alice@example.test' }, token: expect.any(String) });
            expect(jwt.verify(response.body.token, secret).sub).toBe(user.id);
        });

        test('401 UNAUTHORIZED avec le même message pour un mauvais mot de passe et un email inconnu', async () => {
            await registerUser('alice@example.test');

            const wrongPassword = await request(app).post('/api/auth/login').send({ email: 'alice@example.test', password: 'AutreMotDePasse!' });
            const unknownEmail = await request(app).post('/api/auth/login').send({ email: 'inconnu@example.test', password: PASSWORD });

            expect(wrongPassword.status).toBe(401);
            expect(unknownEmail.status).toBe(401);
            expect(wrongPassword.body).toEqual(errorShape('UNAUTHORIZED'));
            expect(unknownEmail.body).toEqual(wrongPassword.body);
        });

        test('401 si le mot de passe saisi commence par le vrai mot de passe de 72 octets (pas de troncature)', async () => {
            const longPassword = 'p'.repeat(72);
            await registerUser('alice@example.test', longPassword);

            const response = await request(app).post('/api/auth/login').send({ email: 'alice@example.test', password: `${longPassword}-en-plus` });

            expect(response.status).toBe(401);
        });

        test.each([
            ['email invalide', { email: 'oups', password: PASSWORD }],
            ['mot de passe vide', { email: 'a@example.test', password: '' }],
            ['corps vide', {}],
            ['propriété inconnue', { email: 'a@example.test', password: PASSWORD, admin: true }],
        ])('400 INVALID_INPUT : %s', async (_label, body) => {
            const response = await request(app).post('/api/auth/login').send(body);

            expect(response.status).toBe(400);
            expect(response.body).toEqual(errorShape('INVALID_INPUT'));
        });
    });

    describe('GET /api/users/me et middleware Bearer', () => {
        test('200 avec un jeton valide : id et email uniquement', async () => {
            const { user, auth } = await registerUser();

            const response = await request(app).get('/api/users/me').set(auth);

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ id: user.id, email: 'alice@example.test' });
        });

        const userId = '507f1f77bcf86cd799439011';
        test.each([
            ['sans en-tête Authorization', () => ({})],
            ['schéma Basic', () => ({ Authorization: 'Basic abc' })],
            ['Bearer sans jeton', () => ({ Authorization: 'Bearer' })],
            ['jeton aléatoire', () => ({ Authorization: 'Bearer pas.un.jwt' })],
            ['jeton signé avec une autre clé (falsifié)', () => ({ Authorization: `Bearer ${jwt.sign({}, 'autre-cle', { subject: userId })}` })],
            ['jeton expiré', () => ({ Authorization: `Bearer ${jwt.sign({}, secret, { subject: userId, expiresIn: -10 })}` })],
            ['jeton sans sujet', () => ({ Authorization: `Bearer ${jwt.sign({}, secret)}` })],
            ['jeton alg=none', () => ({ Authorization: `Bearer ${Buffer.from('{"alg":"none"}').toString('base64url')}.${Buffer.from(`{"sub":"${userId}"}`).toString('base64url')}.` })],
        ])('401 UNAUTHORIZED : %s', async (_label, headers) => {
            const response = await request(app).get('/api/users/me').set(headers());

            expect(response.status).toBe(401);
            expect(response.body).toEqual(errorShape('UNAUTHORIZED'));
        });

        test('401 si le compte du jeton n’existe plus', async () => {
            const { user, auth } = await registerUser();
            await User.deleteOne({ _id: user.id });

            const response = await request(app).get('/api/users/me').set(auth);

            expect(response.status).toBe(401);
        });
    });
});
