## Ce que fait cette PR

<!-- Une ou deux phrases : la fonctionnalité ajoutée ou le problème corrigé. -->

## Branche et périmètre

- Branche : `feature/...`
- Responsable : <!-- BDD / Back / Front / CI -->
- Dépend de : <!-- branches à merger avant, ou « rien » -->

## Vérifications faites en local

- [ ] `npm run lint` passe
- [ ] `npm test` passe (MongoDB lancé avec `npm run db:up`)
- [ ] `npm run build` passe
- [ ] Aucun secret, `.env` ou `node_modules` dans le diff

## Impact sur le contrat d'API

- [ ] Aucun changement de route ou de format JSON
- [ ] Routes/formats modifiés : `/api/docs` (OpenAPI) et le README sont à jour

## Comment tester à la main

<!-- Étapes pour reproduire, captures d'écran si l'interface change. -->
