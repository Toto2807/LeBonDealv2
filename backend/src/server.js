import app from './app.js';
import { config, assertConfig } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';

try {
  assertConfig();
  await connectDb(config.mongoUri);
} catch (error) {
  // Le message ne contient jamais l'URI (identifiants) : on affiche seulement la cause.
  console.error(`Démarrage impossible : ${error.message}`);
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`API disponible sur http://localhost:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} reçu, arrêt du serveur...`);
  server.close(async () => {
    await disconnectDb();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
