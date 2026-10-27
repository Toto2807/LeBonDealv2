// Exécuté par Jest avant chaque fichier de test, avant l'import de l'application.
// Les tests n'utilisent JAMAIS la base de développement : uniquement MONGODB_URI_TEST.
import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET_TEST || 'secret-de-test-uniquement-ne-pas-utiliser-en-prod';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/lebondeal_test';
