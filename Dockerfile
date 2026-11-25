# Frontend image: the React app (Vite dev server).
# Started together with the backend and database by the docker-compose.yml in
# the habit-tracker-backend repo (`docker compose up --build`).
FROM node:24-alpine

WORKDIR /app

# Install packages first, in their own layer: rebuilding after a code change is
# then quick, because `npm ci` only runs again when package files change.
COPY package.json package-lock.json ./
RUN npm ci

# Then the code (.dockerignore keeps out node_modules/, .env, dist/ ...).
COPY . .

EXPOSE 5173

# Listen on all network interfaces (0.0.0.0) so the browser on your computer can
# reach the server inside the container. Port 5173 is fixed in vite.config.ts.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
