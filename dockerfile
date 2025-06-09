FROM node:18-alpine

WORKDIR /app

# Copier les fichiers package
COPY package.json ./

# Installer les dépendances
RUN npm install

# Copier le code de l'application
COPY . .

# Créer le dossier data
RUN mkdir -p /data

# Exposer le port
EXPOSE 3000

# Définir les variables d'environnement
ENV NODE_ENV=production
ENV DB_PATH=/data/orders.db

# Démarrer l'application
CMD ["node", "server.js"]