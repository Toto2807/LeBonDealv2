import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi.js';

// Documentation publique : Swagger UI sur /api/docs et le document brut sur /api/docs.json.
export const docsRouter = Router();

docsRouter.get('/docs.json', (_req, res) => {
    res.status(200).json(openApiDocument);
});
docsRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { customSiteTitle: 'API LeBonDeal' }));
