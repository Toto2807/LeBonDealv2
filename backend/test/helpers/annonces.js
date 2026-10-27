import request from 'supertest';
import app from '../../src/app.js';

export const validAnnonce = (overrides = {}) => ({
    titre: 'Vélo de ville vintage',
    prix: 260,
    categorie: 'Loisirs & Sport',
    ville: 'Lyon',
    ...overrides,
});

// Crée une annonce via l'API pour le compte `auth` et renvoie le corps JSON de la réponse.
export async function createAnnonce(auth, overrides = {}) {
    const response = await request(app).post('/api/annonces').set(auth).send(validAnnonce(overrides));
    if (response.status !== 201) throw new Error(`Création d'annonce de test impossible (${response.status})`);
    return response.body;
}
