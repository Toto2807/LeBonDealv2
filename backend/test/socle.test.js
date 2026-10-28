import express from 'express';
import request from 'supertest';
import app from '../src/app.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { AppError } from '../src/errors/AppError.js';

describe('socle API', () => {
    test('une route inconnue retourne 404 au format d’erreur commun', async () => {
        const response = await request(app).get('/api/inconnue');

        expect(response.status).toBe(404);
        expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
    });

    test('un JSON mal formé retourne 400 INVALID_INPUT', async () => {
        const response = await request(app).post('/api/health').set('Content-Type', 'application/json').send('{"a":');

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    test('un corps trop volumineux est refusé en 400', async () => {
        const response = await request(app).post('/api/health').send({ texte: 'x'.repeat(200 * 1024) });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    test('helmet est actif et X-Powered-By absent', async () => {
        const response = await request(app).get('/api/health');

        expect(response.headers['x-powered-by']).toBeUndefined();
        expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    describe('errorHandler', () => {
        const buildApp = (error) => {
            const testApp = express();
            testApp.get('/boom', () => {
                throw error;
            });
            testApp.use(errorHandler);
            return testApp;
        };

        test('une AppError garde son statut, son code et son message', async () => {
            const response = await request(buildApp(new AppError(409, 'EMAIL_ALREADY_USED', 'Déjà pris'))).get('/boom');

            expect(response.status).toBe(409);
            expect(response.body).toEqual({ error: { code: 'EMAIL_ALREADY_USED', message: 'Déjà pris' } });
        });

        test('une erreur inattendue retourne 500 sans divulguer la cause', async () => {
            const response = await request(buildApp(new Error('mot de passe de la base : hunter2'))).get('/boom');

            expect(response.status).toBe(500);
            expect(response.body.error.code).toBe('INTERNAL_ERROR');
            expect(JSON.stringify(response.body)).not.toContain('hunter2');
            expect(JSON.stringify(response.body)).not.toContain('stack');
        });
    });
});
