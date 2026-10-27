// Exécuté UNE SEULE FOIS par l'image mongo, à la première création du volume.
// Crée un utilisateur applicatif limité (readWrite) au lieu d'utiliser le compte root.
// Pour rejouer ce script : npm run db:reset puis npm run db:up.
const appUser = process.env.MONGO_APP_USER;
const appPassword = process.env.MONGO_APP_PASSWORD;
const appDb = process.env.MONGO_APP_DB || 'lebondeal';

if (!appUser || !appPassword) {
  throw new Error('MONGO_APP_USER et MONGO_APP_PASSWORD sont obligatoires');
}

db.getSiblingDB('admin').createUser({
  user: appUser,
  pwd: appPassword,
  roles: [
    { role: 'readWrite', db: appDb },
    // Base dédiée aux tests Jest : isolée de la base de développement.
    { role: 'readWrite', db: `${appDb}_test` },
  ],
});

print(`Utilisateur ${appUser} créé (bases ${appDb} et ${appDb}_test)`);
