import request from 'supertest';
import app from '../src/app.js';
import { openApiDocument } from '../src/docs/openapi.js';
import { apiRouters } from '../src/routes/index.js';

const HTTP_METHODS = ['get', 'put', 'post', 'patch', 'delete'];

// Routes réellement déclarées dans les routeurs Express, au format "METHODE /chemin/{param}".
function implementedOperations() {
    const operations = ['GET /api/health'];
    for (const [mountPath, router] of apiRouters) {
        for (const layer of router.stack.filter((item) => item.route)) {
            const path = (mountPath + (layer.route.path === '/' ? '' : layer.route.path)).replace(/:(\w+)/g, '{$1}');
            for (const method of Object.keys(layer.route.methods)) operations.push(`${method.toUpperCase()} ${path}`);
        }
    }
    return operations.sort();
}

function documentedOperations() {
    return Object.entries(openApiDocument.paths)
        .flatMap(([path, item]) => HTTP_METHODS.filter((method) => item[method]).map((method) => `${method.toUpperCase()} ${path}`))
        .sort();
}

function collectRefs(node, refs = []) {
    if (Array.isArray(node)) node.forEach((child) => collectRefs(child, refs));
    else if (node && typeof node === 'object') {
        for (const [key, value] of Object.entries(node)) {
            if (key === '$ref') refs.push(value);
            else collectRefs(value, refs);
        }
    }
    return refs;
}

describe('documentation OpenAPI', () => {
    test('documente exactement les routes implémentées (ni plus, ni moins)', () => {
        expect(documentedOperations()).toEqual(implementedOperations());
    });

    test('tous les $ref pointent vers un composant existant', () => {
        for (const reference of collectRefs(openApiDocument)) {
            const target = reference.replace('#/', '').split('/').reduce((node, key) => node?.[key], openApiDocument);
            expect({ reference, exists: target !== undefined }).toEqual({ reference, exists: true });
        }
    });

    test('toute route métier est protégée par bearerAuth, sauf health, register, login et l’affichage des photos', () => {
        const publicOperations = ['GET /api/health', 'POST /api/auth/register', 'POST /api/auth/login', 'GET /api/images/{id}'];
        for (const operation of documentedOperations().filter((item) => !publicOperations.includes(item))) {
            const [method, path] = operation.split(' ');
            expect({ operation, security: openApiDocument.paths[path][method.toLowerCase()].security }).toEqual({ operation, security: [{ bearerAuth: [] }] });
        }
    });

    test('chaque opération décrit au moins une réponse de succès et les erreurs applicables', () => {
        for (const operation of documentedOperations()) {
            const [method, path] = operation.split(' ');
            const codes = Object.keys(openApiDocument.paths[path][method.toLowerCase()].responses);
            expect({ operation, hasSuccess: codes.some((code) => code.startsWith('2')) }).toEqual({ operation, hasSuccess: true });
            if (!['GET /api/health', 'GET /api/images/{id}'].includes(operation) && !operation.includes('/auth/')) {
                expect({ operation, has401: codes.includes('401') }).toEqual({ operation, has401: true });
            }
        }
    });

    test('GET /api/docs.json sert le document sans authentification', async () => {
        const response = await request(app).get('/api/docs.json');

        expect(response.status).toBe(200);
        expect(response.body.openapi).toBe('3.0.3');
        expect(Object.keys(response.body.paths)).toContain('/api/annonces/{id}');
    });

    test('GET /api/docs/ sert l’interface Swagger UI', async () => {
        const response = await request(app).get('/api/docs/');

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/html/);
        expect(response.text).toContain('swagger-ui');
    });

    test('le document ne contient aucun secret ni email réel', () => {
        const serialized = JSON.stringify(openApiDocument);

        expect(serialized).not.toMatch(/eyJ[A-Za-z0-9_-]{10,}/); // pas de vrai JWT
        const emails = serialized.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) ?? [];
        for (const email of emails) expect(email).toMatch(/@example\.test$/);
    });
});
