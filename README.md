# LeBonDeal

Marketplace de petites annonces de seconde main (projet étudiant EFREI, module Full Stack JS) : on s'inscrit, on publie des annonces, on cherche et filtre le catalogue, on met des annonces en favori et on contacte les vendeurs.

**Stack** : React + Vite (front) · Node.js + Express (API) · MongoDB + Mongoose (base de données) · JWT + bcrypt (authentification) · Jest + Supertest (tests) · ESLint · Swagger/OpenAPI · Docker · GitHub Actions.

## Fonctionnalités

- Inscription, connexion, déconnexion (JWT) ; la session survit au rechargement de la page.
- Catalogue partagé avec recherche, filtre par catégorie, prix maximum et « disponibles uniquement ».
- Déposer, consulter, modifier, supprimer ses annonces et changer leur statut (disponible, réservée, vendue).
- Favoris persistés par compte.
- Contacter un vendeur et lire ses messages reçus.
- Interface responsive, utilisable au clavier.

## Versions et prérequis

| Outil | Version |
| --- | --- |
| Node.js | 20.19 ou plus récent (testé en CI sur 20 et 22) |
| npm | 10 ou plus récent |
| Docker + Docker Compose | pour MongoDB (aucune installation locale de MongoDB) |

Principales dépendances : React 19, Vite 7, Express 5, Mongoose 9, MongoDB 7 (image Docker), Jest 30.

## Démarrage rapide

```bash
# 1. Dépendances (workspaces npm : frontend + backend)
npm install

# 2. Configuration : copier l'exemple puis, au minimum, changer JWT_SECRET et les mots de passe
cp backend/.env.example backend/.env

# 3. Base MongoDB dans Docker (attend qu'elle soit prête)
npm run db:up

# 4. (facultatif) données de démonstration
npm run db:seed

# 5. Front + API en parallèle
npm run dev
```

| Service | URL |
| --- | --- |
| Application (Vite) | http://localhost:5173 |
| API | http://localhost:3000/api (aussi via le proxy Vite : http://localhost:5173/api) |
| Santé | http://localhost:3000/api/health → `{"status":"ok"}` |
| Documentation Swagger | http://localhost:3000/api/docs |

Comptes de démonstration (après `npm run db:seed`) : `demo@example.test`, `thomas.durand@example.test`, `claire.bernard@example.test`… Mot de passe commun : `MotDePasse123!`.

Lancer une seule partie : `npm run dev --workspace backend` (API seule) ou `npm run dev --workspace frontend` (front seul).

## Variables d'environnement

Toutes sont décrites dans `backend/.env.example`. Le vrai fichier `backend/.env` est ignoré par Git : **ne le commitez jamais**.

| Variable | Rôle |
| --- | --- |
| `PORT` | Port de l'API (3000) |
| `CORS_ORIGIN` | Origine(s) autorisée(s) du front, séparées par des virgules |
| `JWT_SECRET` | Clé de signature des jetons, **32 caractères minimum**, propre à chaque environnement |
| `JWT_EXPIRES_IN` | Durée de vie des jetons (`2h` par défaut) |
| `MONGODB_URI` | Connexion à la base de développement |
| `MONGODB_URI_TEST` | Connexion à la base de test : son nom **doit finir par `_test`** |
| `MONGO_*` | Conteneur MongoDB (ports, comptes root et applicatif) |

Le serveur refuse de démarrer si `JWT_SECRET` ou `MONGODB_URI` manquent. Détail du schéma MongoDB, des index, des sauvegardes : [`docs/BDD.md`](docs/BDD.md).

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | API (avec rechargement) + front Vite |
| `npm run build` | Build de production du front (`frontend/dist`) |
| `npm start` | API seule en mode production locale |
| `npm run lint` | ESLint sur tout le dépôt |
| `npm test` | Tests Jest/Supertest du back (MongoDB doit tourner : `npm run db:up`) |
| `npm run test:coverage` | Idem avec rapport de couverture (`backend/coverage`) |
| `npm run db:up` / `db:down` / `db:reset` / `db:seed` | Cycle de vie de MongoDB (voir `docs/BDD.md`) |

### Tests

Les tests (`backend/test/`) lancent l'application Express réelle avec Supertest sur une **base MongoDB dédiée** (`lebondeal_test`), sans jamais toucher la base de développement : les collections sont vidées avant chaque test et la connexion est refusée si le nom de base ne finit pas par `_test`. Ils couvrent, pour chaque route : le cas nominal, les entrées invalides (400), l'absence de JWT ou un JWT falsifié/expiré (401), l'isolation entre deux comptes (404), la persistance après redémarrage de la connexion, ainsi que la cohérence entre routes implémentées et documentation OpenAPI.

## API

Contrat complet et exécutable sur `/api/docs` (Swagger UI, JSON brut sur `/api/docs.json`).

| Méthode | Route | Réponse de succès |
| --- | --- | --- |
| `GET` | `/api/health` | 200 `{"status":"ok"}` (public) |
| `POST` | `/api/auth/register` | 201 `{user:{id,email}, token}` |
| `POST` | `/api/auth/login` | 200 `{user:{id,email}, token}` |
| `GET` | `/api/users/me` | 200 `{id,email}` |
| `GET` | `/api/annonces` | 200 `{items:[…]}` (filtres `q`, `categorie`, `prixMax`, `disponibles`, `mine`, `favoris`, `page`, `limit`) |
| `POST` | `/api/annonces` | 201 annonce créée |
| `GET` `PATCH` `DELETE` | `/api/annonces/:id` | 200 · 200 · 204 sans corps |
| `PUT` `DELETE` | `/api/favoris/:annonceId` | 204 (idempotents) |
| `POST` | `/api/annonces/:id/messages` | 201 message envoyé au vendeur |
| `GET` | `/api/messages` | 200 `{items:[…]}` messages reçus |

Toutes les routes sauf `health`, `register`, `login` et `docs` exigent `Authorization: Bearer <jwt>`.

Erreurs, toujours au même format `{"error":{"code","message"}}` :

| Situation | HTTP | `code` |
| --- | --- | --- |
| Corps, paramètre ou identifiant invalide (ou champ inconnu, dont `id`/`ownerId`) | 400 | `INVALID_INPUT` |
| Jeton absent, falsifié, expiré ; identifiants incorrects | 401 | `UNAUTHORIZED` |
| Ressource absente **ou appartenant à un autre compte** (modification/suppression) | 404 | `NOT_FOUND` |
| Email déjà utilisé | 409 | `EMAIL_ALREADY_USED` |

Exemple :

```bash
TOKEN=$(curl -s localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.test","password":"MotDePasse123!"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')
curl -s "localhost:3000/api/annonces?q=peugeot" -H "Authorization: Bearer $TOKEN"
```

## Architecture

```text
React (Vite)  ──fetch /api──▶  Express  ──Mongoose──▶  MongoDB
 navigateur      JWT Bearer     API REST                 (Docker)
```

Chemin d'une requête dans l'API : `route → middleware (JWT) → contrôleur (validation) → service (règles métier) → modèle Mongoose`.

```text
backend/src/
  app.js, server.js     création de l'app Express (importable sans ouvrir de port) / démarrage
  routes/               une route = une méthode HTTP + un contrôleur ; index.js liste les routeurs
  controllers/          lisent la requête, appellent validateurs et services, choisissent le code HTTP
  validators/           TOUTE la validation côté serveur (types, longueurs, énumérations, champs interdits)
  services/             logique métier et accès aux modèles (propriété, favoris, messages, JWT, bcrypt)
  serializers/          forme JSON publique des annonces/messages (aucun champ sensible)
  models/               schémas Mongoose et index
  middlewares/          requireAuth (JWT Bearer), errorHandler (format d'erreur commun)
  docs/                 document OpenAPI et Swagger UI
  seed/                 données de démonstration
backend/test/           tests Jest + Supertest
frontend/src/
  api/                  client fetch : jeton, erreurs normalisées, une fonction par route
  pages/ components/    Auth, Home et composants d'interface
  hooks/                chargement des annonces (annulation des requêtes), favoris, debounce
docker-compose.yml      MongoDB de développement
docker-compose.prod.yml pile complète (MongoDB + API + nginx)
```

### Sécurité : pourquoi les données d'un compte sont privées

- **Le serveur décide, jamais le client.** Le propriétaire (`ownerId`) d'une annonce est lu dans le JWT *vérifié* ; l'envoyer dans un `POST`/`PATCH` est refusé (400). Cacher un bouton dans React ne protège rien : un client HTTP peut appeler l'API directement, donc **chaque** règle est appliquée dans Express.
- **Modifier/supprimer = propriétaire uniquement.** La requête MongoDB filtre sur `{_id, ownerId}` : une annonce d'un autre compte et une annonce inexistante donnent la même réponse `404`, ce qui ne révèle pas son existence. `401` signifie « pas authentifié », `404` « rien à vous ici ».
- **Mots de passe** : hash bcrypt (jamais stockés ni renvoyés), 8 à 72 octets (bcrypt ignore le reste), comparaison à temps comparable même quand l'email est inconnu, message de connexion identique pour « email inconnu » et « mauvais mot de passe ».
- **JWT** : HS256 (algorithme imposé), signé avec `JWT_SECRET` côté serveur uniquement, expire après `JWT_EXPIRES_IN`. Le jeton est conservé dans le `localStorage` du navigateur : il survit au rechargement mais un script injecté (XSS) pourrait le lire ; c'est pourquoi le front n'injecte jamais de HTML brut (React échappe le texte) et que la durée de vie est courte. À l'expiration, la première requête reçoit un 401 et l'interface ramène à la connexion. Alternative plus robuste : cookie `HttpOnly` + protection CSRF.
- **Validation côté serveur** (`backend/src/validators/`) : types stricts (une injection `{"$ne":null}` est rejetée), longueurs, énumérations, URL de photo en `http(s)` uniquement, filtres de recherche échappés.
- En-têtes de sécurité avec Helmet, CORS limité à `CORS_ORIGIN`, corps JSON limité à 100 ko.

### Catalogue partagé (écart assumé avec l'énoncé)

Une marketplace doit montrer les annonces de tous : un compte connecté **lit** toutes les annonces (`GET /api/annonces`, `GET /api/annonces/:id`) mais ne peut **modifier ou supprimer** que les siennes (404 sinon). Ses favoris et ses messages restent strictement privés. La ressource s'appelle `/api/annonces` (sujet hors catalogue TaskFlow/HabitLab/BudgetFlow) : les 5 routes CRUD, l'enveloppe `{items:[]}`, les codes HTTP et le format d'erreur reprennent exactement le contrat du livret. Ces deux points sont à faire valider par le formateur.

## Choix techniques

- **Vite plutôt que Webpack** : Vite sert le code en modules ES natifs en développement (démarrage instantané, rechargement à chaud) et produit le bundle de production avec Rollup. Webpack, bundler historique (Create React App), n'est pas utilisé ici.
- **Babel** : transpileur qui convertit JSX et la syntaxe récente en JavaScript exécutable par les navigateurs ; ici il intervient via `@vitejs/plugin-react`. Côté back, Node exécute directement les modules ES et Jest tourne en mode ESM natif (`--experimental-vm-modules`) : aucune transpilation.
- **Mongoose** pour les schémas, validations et index ; **bcryptjs** (pur JS, sans compilation native) ; **Express 5** (les erreurs des handlers `async` arrivent automatiquement au gestionnaire d'erreurs).
- **Argent/prix** : entiers en euros ; pas de flottants.

## CI/CD et déploiement

`.github/workflows/ci.yml` s'exécute à chaque push sur `main` et chaque pull request :

1. **Hygiène** : aucun `.env` ni `node_modules` versionné.
2. **Lint et build** : `npm ci`, `npm run lint`, `npm run build` (Node 22).
3. **Tests** : Jest/Supertest sur Node 20 et 22 avec un conteneur MongoDB jetable (service GitHub Actions). **C'est ici que s'insèrent les tests dans la chaîne CI/CD** : un échec bloque la fusion ; une future étape de déploiement viendra après des tests verts.

Pile complète en conteneurs (API + nginx + MongoDB), prête pour un hébergement Docker :

```bash
docker compose --env-file backend/.env -f docker-compose.yml -f docker-compose.prod.yml up -d --build
# application sur http://localhost:8080 ; nginx relaie /api vers l'API (non exposée)
```

L'image de l'API ne contient ni tests, ni `.env`, ni dépendances de développement, et s'exécute sans droits root. Le plan de déploiement cloud définitif reste à valider avec le formateur ; en production il faut un `JWT_SECRET` et des mots de passe MongoDB générés, et un reverse proxy TLS.

## Organisation du travail en équipe

Une branche par fonctionnalité, une pull request par branche (modèle dans `.github/pull_request_template.md`), la CI doit être verte avant fusion. Rôles : base de données, back-end, front-end, CI/outillage.

## Limites connues et pistes d'amélioration

- Pas de réinitialisation de mot de passe ni de vérification d'email ; pas de limitation de débit sur la connexion.
- Pas de jeton de rafraîchissement : reconnexion à l'expiration du JWT.
- Photos par URL uniquement (pas d'envoi de fichier) ; le nom du vendeur est déduit du début de l'email (`prénom.nom` → « Prénom N. »).
- Messagerie à sens unique : le vendeur lit les messages mais ne peut pas répondre dans l'application.
- Recherche par expression régulière sur le titre (un index texte serait préférable à grande échelle) ; listes limitées à 100 annonces par page.
- Suppression en cascade non transactionnelle (voir `docs/BDD.md`).
- Les tests du front (composants) ne sont pas automatisés : le parcours a été vérifié à la main dans le navigateur.

## Dépannage

| Symptôme | Cause et solution |
| --- | --- |
| `MONGO_APP_PASSWORD manquant` au `db:up` | `backend/.env` absent : `cp backend/.env.example backend/.env` |
| `Démarrage impossible : … ECONNREFUSED` | MongoDB n'est pas lancé : `npm run db:up` |
| Authentification MongoDB refusée après avoir changé les mots de passe | Le compte n'est créé qu'à la première initialisation : `npm run db:reset` puis `npm run db:up` |
| Les tests refusent de démarrer (« Base … refusée ») | `MONGODB_URI_TEST` doit pointer vers une base dont le nom finit par `_test` |
| Port 27017 déjà utilisé | Changer `MONGO_PORT` et les deux URI dans `backend/.env` |
