import request from 'supertest';
import app from '../../src/app.js';

export const PASSWORD = 'MotDePasse123!';

// Crée un compte via l'API et renvoie l'utilisateur, son jeton et l'en-tête Authorization prêt à l'emploi.
export async function registerUser(email = 'alice@example.test', password = PASSWORD) {
    const response = await request(app).post('/api/auth/register').send({ email, password });
    if (response.status !== 201) throw new Error(`Inscription de test impossible (${response.status})`);
    return { user: response.body.user, token: response.body.token, auth: { Authorization: `Bearer ${response.body.token}` } };
}
