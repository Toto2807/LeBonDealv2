import { CATEGORIES, ETATS, STATUTS, PRIX_MAX } from '../models/Annonce.js';
import { MESSAGE_MAX } from '../models/Message.js';
import { LIMIT_DEFAULT, LIMIT_MAX } from '../validators/annonceValidator.js';

const ref = (name) => ({ $ref: `#/components/schemas/${name}`});
const response = (name) => ({ $ref: `#/components/responses/${name}`});
const json = (schema, example) => ({ content: { 'application/json': { schema, ...(example && { example }) } } });
const body = (schema, example) => ({ required: true, ...json(schema, example) });
const secured = [{ bearerAuth: [] }];

const idParam = (name, description) => ({ name, in: 'path', required: true, description, schema: { type: 'string', pattern: '^[0-9a-fA-F]{24}$', example: '507f1f77bcf86cd799439011' } });
const queryParam = (name, description, schema) => ({ name, in: 'query', required: false, description, schema });

const annonceExample = {
    id: '507f1f77bcf86cd799439011',
    titre: 'Vélo de ville vintage Peugeot rénové 1984',
    description: 'Cadre acier restauré, freins et pneus neufs.',
    prix: 260,
    categorie: 'Loisirs & Sport',
    etat: 'Très bon état',
    statut: 'DISPONIBLE',
    photo: 'https://exemple.test/velo.jpg',
    ville: 'Lyon',
    codePostal: '69007',
    ownerId: '507f191e810c19729de860ea',
    vendeur: { id: '507f191e810c19729de860ea', nom: 'Claire B.', membreDepuis: '2026-09-01T09:00:00.000Z' },
    favori: false,
    createdAt: '2026-10-05T08:30:00.000Z',
    updatedAt: '2026-10-05T08:30:00.000Z',
};

export const openApiDocument = {
    openapi: '3.0.3',
    info: {
        title: 'API LeBonDeal',
        version: '1.0.0',
        description:
            'API REST de la marketplace LeBonDeal (Express + MongoDB).\n\n' +
            'Toutes les routes métier exigent un JWT : obtenez-le avec ⁠ POST /api/auth/register ⁠ ou ⁠ POST /api/auth/login ⁠, ' +
            'puis cliquez sur *Authorize* et collez le jeton (sans le préfixe ⁠ Bearer ⁠).\n\n' +
            'Catalogue partagé : tout compte connecté peut lire les annonces, mais seul le propriétaire peut les modifier ou les supprimer ' +
            '(un autre compte reçoit ⁠ 404 NOT_FOUND ⁠). Les exemples ne contiennent que des données fictives.',
    },
    servers: [{ url: '/', description: 'Serveur courant' }],
    tags: [
        { name: 'Santé' },
        { name: 'Authentification' },
        { name: 'Annonces' },
        { name: 'Favoris' },
        { name: 'Messages' },
    ],
    paths: {
        '/api/health': {
            get: {
                tags: ['Santé'],
                summary: 'État du service (public)',
                security: [],
                responses: { 200: { description: 'Service disponible', ...json(ref('Health'), { status: 'ok' }) } },
            },
        },
        '/api/auth/register': {
            post: {
                tags: ['Authentification'],
                summary: 'Créer un compte',
                description: 'Email insensible à la casse. Mot de passe de 8 à 72 octets, stocké uniquement sous forme de hash bcrypt.',
                security: [],
                requestBody: body(ref('Credentials'), { email: 'alice@example.test', password: 'MotDePasse123!' }),
                responses: {
                    201: { description: 'Compte créé', ...json(ref('AuthResponse')) },
                    400: response('InvalidInput'),
                    409: response('EmailAlreadyUsed'),
                },
            },
        },
        '/api/auth/login': {
            post: {
                tags: ['Authentification'],
                summary: 'Se connecter',
                description: 'Le message d’erreur ne précise jamais si c’est l’email ou le mot de passe qui est incorrect.',
                security: [],
                requestBody: body(ref('Credentials'), { email: 'alice@example.test', password: 'MotDePasse123!' }),
                responses: {
                    200: { description: 'Connexion réussie', ...json(ref('AuthResponse')) },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                },
            },
        },
        '/api/users/me': {
            get: {
                tags: ['Authentification'],
                summary: 'Profil du compte connecté',
                security: secured,
                responses: {
                    200: { description: 'Profil', ...json(ref('User')) },
                    401: response('Unauthorized'),
                },
            },
        },
        '/api/annonces': {
            get: {
                tags: ['Annonces'],
                summary: 'Lister les annonces',
                description: `Catalogue partagé, du plus récent au plus ancien. Retourne \{"items": []}\` si aucune annonce ne correspond. Au plus ${LIMIT_MAX} annonces par page.`,
                security: secured,
                parameters: [
                    queryParam('q', 'Recherche dans le titre (insensible à la casse et aux accents : « velo » trouve « Vélo »)', { type: 'string', minLength: 1, maxLength: 100 }),
                    queryParam('categorie', 'Filtrer par catégorie', { type: 'string', enum: CATEGORIES }),
                    queryParam('etat', 'Filtrer par état de l’article', { type: 'string', enum: ETATS }),
                    queryParam('ville', 'Filtrer par ville (sans tenir compte de la casse ni des accents)', { type: 'string', minLength: 1, maxLength: 80 }),
                    queryParam('prixMax', 'Prix maximum inclus, en euros', { type: 'integer', minimum: 0, maximum: PRIX_MAX }),
                    queryParam('disponibles', 'true : uniquement les annonces au statut DISPONIBLE', { type: 'boolean' }),
                    queryParam('mine', 'true : uniquement mes annonces', { type: 'boolean' }),
                    queryParam('favoris', 'true : uniquement mes favoris', { type: 'boolean' }),
                    queryParam('page', 'Numéro de page (à partir de 1)', { type: 'integer', minimum: 1, default: 1 }),
                    queryParam('limit', 'Nombre d’annonces par page', { type: 'integer', minimum: 1, maximum: LIMIT_MAX, default: LIMIT_DEFAULT }),
                ],
                responses: {
                    200: { description: 'Liste des annonces', ...json({ type: 'object', required: ['items'], properties: { items: { type: 'array', items: ref('Annonce') } } }, { items: [annonceExample] }) },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                },
            },
            post: {
                tags: ['Annonces'],
                summary: 'Publier une annonce',
                description: 'Le propriétaire est toujours le compte du JWT : ⁠ ownerId ⁠ et ⁠ id ⁠ fournis par le client sont refusés (400).',
                security: secured,
                requestBody: body(ref('AnnonceCreate'), { titre: 'Vélo de ville vintage', prix: 260, categorie: 'Loisirs & Sport', ville: 'Lyon' }),
                responses: {
                    201: { description: 'Annonce créée', ...json(ref('Annonce'), annonceExample) },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                },
            },
        },
        '/api/annonces/suggestions': {
            get: {
                tags: ['Annonces'],
                summary: 'Suggestions de recherche',
                description: 'Propose des catégories, états, villes et titres d’annonces correspondant au texte saisi (insensible à la casse et aux accents). Sans ⁠ q ⁠ : les catégories et les villes les plus présentes. Au plus 12 propositions.',
                security: secured,
                parameters: [queryParam('q', 'Texte saisi', { type: 'string', minLength: 1, maxLength: 100 })],
                responses: {
                    200: { description: 'Suggestions', ...json({ type: 'object', required: ['items'], properties: { items: { type: 'array', items: ref('Suggestion') } } }, { items: [{ type: 'categorie', value: 'Loisirs & Sport' }, { type: 'ville', value: 'Lyon' }, { type: 'annonce', value: 'Vélo de ville vintage', id: '507f1f77bcf86cd799439011' }] }) },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                },
            },
        },
        '/api/annonces/{id}': {
            get: {
                tags: ['Annonces'],
                summary: 'Consulter une annonce',
                security: secured,
                parameters: [idParam('id', 'Identifiant de l’annonce')],
                responses: {
                    200: { description: 'Annonce', ...json(ref('Annonce'), annonceExample) },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                    404: response('NotFound'),
                },
            },
            patch: {
                tags: ['Annonces'],
                summary: 'Modifier une annonce (propriétaire uniquement)',
                description: 'Modification partielle : le corps doit contenir au moins un champ modifiable. ⁠ photo ⁠ et ⁠ codePostal ⁠ peuvent valoir ⁠ null ⁠. Une annonce d’un autre compte répond 404.',
                security: secured,
                parameters: [idParam('id', 'Identifiant de l’annonce')],
                requestBody: body(ref('AnnonceUpdate'), { statut: 'RESERVEE' }),
                responses: {
                    200: { description: 'Annonce modifiée', ...json(ref('Annonce'), { ...annonceExample, statut: 'RESERVEE' }) },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                    404: response('NotFound'),
                },
            },
            delete: {
                tags: ['Annonces'],
                summary: 'Supprimer une annonce (propriétaire uniquement)',
                description: 'Supprime aussi les favoris et messages liés. Une annonce d’un autre compte répond 404.',
                security: secured,
                parameters: [idParam('id', 'Identifiant de l’annonce')],
                responses: {
                    204: { description: 'Annonce supprimée (aucun corps)' },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                    404: response('NotFound'),
                },
            },
        },
        '/api/annonces/{id}/messages': {
            post: {
                tags: ['Messages'],
                summary: 'Contacter le vendeur',
                description: 'Premier message (ou message suivant) d’un acheteur. L’expéditeur est le compte du JWT, le destinataire le propriétaire de l’annonce. Écrire à sa propre annonce est refusé (400). Les réponses passent par /api/conversations.',
                security: secured,
                parameters: [idParam('id', 'Identifiant de l’annonce')],
                requestBody: body(ref('MessageCreate'), { message: 'Bonjour, est-ce toujours disponible ?' }),
                responses: {
                    201: { description: 'Message envoyé', ...json(ref('Message')) },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                    404: response('NotFound'),
                },
            },
        },
        '/api/favoris/{annonceId}': {
            put: {
                tags: ['Favoris'],
                summary: 'Ajouter une annonce aux favoris',
                description: 'Idempotent. La liste des favoris se lit avec ⁠ GET /api/annonces?favoris=true ⁠.',
                security: secured,
                parameters: [idParam('annonceId', 'Identifiant de l’annonce')],
                responses: {
                    204: { description: 'Annonce en favori (aucun corps)' },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                    404: response('NotFound'),
                },
            },
            delete: {
                tags: ['Favoris'],
                summary: 'Retirer une annonce des favoris',
                description: 'Idempotent : retirer un favori absent répond aussi 204.',
                security: secured,
                parameters: [idParam('annonceId', 'Identifiant de l’annonce')],
                responses: {
                    204: { description: 'Favori retiré (aucun corps)' },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                },
            },
        },
        '/api/conversations': {
            get: {
                tags: ['Messages'],
                summary: 'Mes conversations',
                description: 'Conversations du compte connecté (messages envoyés et reçus), la plus récente d’abord (100 maximum). Une conversation = une annonce + l’autre participant.',
                security: secured,
                responses: {
                    200: { description: 'Conversations', ...json({ type: 'object', required: ['items'], properties: { items: { type: 'array', items: ref('Conversation') } } }) },
                    401: response('Unauthorized'),
                },
            },
        },
        '/api/conversations/{annonceId}/{interlocuteurId}': {
            get: {
                tags: ['Messages'],
                summary: 'Lire une conversation',
                description: 'Fil de discussion complet (200 derniers messages, du plus ancien au plus récent). Réservé aux deux participants : tout autre compte reçoit 404.',
                security: secured,
                parameters: [idParam('annonceId', 'Identifiant de l’annonce'), idParam('interlocuteurId', 'Identifiant de l’autre participant')],
                responses: {
                    200: { description: 'Conversation', ...json(ref('ConversationDetail')) },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                    404: response('NotFound'),
                },
            },
        },
        '/api/conversations/{annonceId}/{interlocuteurId}/messages': {
            post: {
                tags: ['Messages'],
                summary: 'Répondre dans une conversation',
                description: 'Utilisable par l’acheteur comme par le vendeur, uniquement si la conversation existe déjà (le vendeur ne peut que répondre). Aucune conversation commune : 404.',
                security: secured,
                parameters: [idParam('annonceId', 'Identifiant de l’annonce'), idParam('interlocuteurId', 'Identifiant de l’autre participant')],
                requestBody: body(ref('MessageCreate'), { message: 'Oui, toujours disponible, vous pouvez passer demain.' }),
                responses: {
                    201: { description: 'Message envoyé', ...json(ref('Message')) },
                    400: response('InvalidInput'),
                    401: response('Unauthorized'),
                    404: response('NotFound'),
                },
            },
        },
    },
    components: {
        securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT HS256 obtenu via /api/auth/login ou /api/auth/register' },
        },
        responses: {
            InvalidInput: errorResponse('Corps, paramètre ou identifiant invalide', 'INVALID_INPUT', 'Champ(s) non autorisé(s) : ownerId'),
            Unauthorized: errorResponse('Jeton absent, invalide ou expiré, ou identifiants incorrects', 'UNAUTHORIZED', 'Jeton invalide ou expiré'),
            NotFound: errorResponse('Ressource inexistante ou appartenant à un autre compte', 'NOT_FOUND', 'Annonce introuvable'),
            EmailAlreadyUsed: errorResponse('Email déjà utilisé', 'EMAIL_ALREADY_USED', 'Cet email est déjà utilisé'),
        },
        schemas: {
            Health: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['ok'] } } },
            Error: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: {
                        type: 'object',
                        required: ['code', 'message'],
                        properties: {
                            code: { type: 'string', enum: ['INVALID_INPUT', 'UNAUTHORIZED', 'NOT_FOUND', 'EMAIL_ALREADY_USED', 'INTERNAL_ERROR'] },
                            message: { type: 'string' },
                        },
                    },
                },
            },
            Credentials: {
                type: 'object',
                required: ['email', 'password'],
                additionalProperties: false,
                properties: {
                    email: { type: 'string', format: 'email', maxLength: 254, example: 'alice@example.test' },
                    password: { type: 'string', minLength: 8, maxLength: 72, format: 'password', example: 'MotDePasse123!' },
                },
            },
            User: {
                type: 'object',
                required: ['id', 'email'],
                properties: { id: { type: 'string', example: '507f191e810c19729de860ea' }, email: { type: 'string', format: 'email', example: 'alice@example.test' } },
            },
            AuthResponse: {
                type: 'object',
                required: ['user', 'token'],
                properties: { user: ref('User'), token: { type: 'string', description: 'JWT à envoyer dans Authorization: Bearer <jwt>', example: '<jwt>' } },
            },
            Vendeur: {
                type: 'object',
                properties: { id: { type: 'string' }, nom: { type: 'string', description: 'Prénom et initiale déduits de l’email, jamais l’adresse complète' }, membreDepuis: { type: 'string', format: 'date-time' } },
            },
            Annonce: {
                type: 'object',
                required: ['id', 'titre', 'prix', 'categorie', 'etat', 'statut', 'ville', 'ownerId'],
                properties: {
                    id: { type: 'string' },
                    titre: { type: 'string', minLength: 1, maxLength: 120 },
                    description: { type: 'string', maxLength: 2000 },
                    prix: { type: 'integer', minimum: 0, maximum: PRIX_MAX, description: 'Prix en euros' },
                    categorie: { type: 'string', enum: CATEGORIES },
                    etat: { type: 'string', enum: ETATS },
                    statut: { type: 'string', enum: STATUTS },
                    photo: { type: 'string', nullable: true, description: 'URL http(s)' },
                    ville: { type: 'string', maxLength: 80 },
                    codePostal: { type: 'string', nullable: true, pattern: '^\\d{5}$' },
                    ownerId: { type: 'string', readOnly: true },
                    vendeur: ref('Vendeur'),
                    favori: { type: 'boolean', description: 'L’annonce est dans mes favoris' },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' },
                },
            },
            AnnonceCreate: {
                type: 'object',
                required: ['titre', 'prix', 'categorie', 'ville'],
                additionalProperties: false,
                properties: {
                    titre: { type: 'string', minLength: 1, maxLength: 120, description: 'Non vide après trim' },
                    description: { type: 'string', maxLength: 2000, description: 'Chaîne vide acceptée' },
                    prix: { type: 'integer', minimum: 0, maximum: PRIX_MAX },
                    categorie: { type: 'string', enum: CATEGORIES },
                    etat: { type: 'string', enum: ETATS, default: 'Très bon état' },
                    statut: { type: 'string', enum: STATUTS, default: 'DISPONIBLE' },
                    photo: { type: 'string', nullable: true, maxLength: 500 },
                    ville: { type: 'string', minLength: 1, maxLength: 80 },
                    codePostal: { type: 'string', nullable: true, pattern: '^\\d{5}$' },
                },
            },
            AnnonceUpdate: {
                type: 'object',
                minProperties: 1,
                additionalProperties: false,
                properties: {
                    titre: { type: 'string', minLength: 1, maxLength: 120 },
                    description: { type: 'string', maxLength: 2000 },
                    prix: { type: 'integer', minimum: 0, maximum: PRIX_MAX },
                    categorie: { type: 'string', enum: CATEGORIES },
                    etat: { type: 'string', enum: ETATS },
                    statut: { type: 'string', enum: STATUTS },
                    photo: { type: 'string', nullable: true, maxLength: 500 },
                    ville: { type: 'string', minLength: 1, maxLength: 80 },
                    codePostal: { type: 'string', nullable: true, pattern: '^\\d{5}$' },
                },
            },
            MessageCreate: {
                type: 'object',
                required: ['message'],
                additionalProperties: false,
                properties: { message: { type: 'string', minLength: 1, maxLength: MESSAGE_MAX } },
            },
            Suggestion: {
                type: 'object',
                required: ['type', 'value'],
                properties: {
                    type: { type: 'string', enum: ['categorie', 'etat', 'ville', 'annonce'] },
                    value: { type: 'string' },
                    id: { type: 'string', description: 'Identifiant de l’annonce (type annonce uniquement)' },
                },
            },
            Participant: {
                type: 'object',
                properties: { id: { type: 'string' }, nom: { type: 'string', description: 'Prénom et initiale déduits de l’email' } },
            },
            Message: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    annonceId: { type: 'string' },
                    annonceTitre: { type: 'string', nullable: true },
                    from: ref('Participant'),
                    to: ref('Participant'),
                    message: { type: 'string' },
                    fromMe: { type: 'boolean', description: 'Message écrit par le compte connecté' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },
            Conversation: {
                type: 'object',
                properties: {
                    annonceId: { type: 'string' },
                    annonceTitre: { type: 'string', nullable: true },
                    annoncePhoto: { type: 'string', nullable: true },
                    interlocuteur: ref('Participant'),
                    dernierMessage: {
                        type: 'object',
                        properties: { message: { type: 'string' }, fromMe: { type: 'boolean' }, createdAt: { type: 'string', format: 'date-time' } },
                    },
                    total: { type: 'integer', description: 'Nombre de messages échangés' },
                },
            },
            ConversationDetail: {
                type: 'object',
                properties: {
                    annonce: {
                        type: 'object',
                        properties: { id: { type: 'string' }, titre: { type: 'string' }, prix: { type: 'integer' }, photo: { type: 'string', nullable: true }, statut: { type: 'string', enum: STATUTS } },
                    },
                    interlocuteur: ref('Participant'),
                    items: { type: 'array', items: ref('Message') },
                },
            },
        },
    },
};

function errorResponse(description, code, message) {
    return { description, ...json(ref('Error'), { error: { code, message } }) };
}