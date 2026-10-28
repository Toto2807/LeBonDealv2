# Image de l'API Express. Contexte de build : la racine du dépôt (voir docker-compose.prod.yml).
#   docker build -f backend/Dockerfile -t lebondeal-api .
FROM node:22-alpine AS dependances
WORKDIR /app
# Seuls les package.json sont copiés d'abord : la couche des dépendances n'est reconstruite que si elles changent.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root=false

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependances /app/node_modules ./node_modules
COPY backend/package.json backend/
COPY backend/src backend/src
WORKDIR /app/backend
# Pas de root dans le conteneur.
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "src/server.js"]
