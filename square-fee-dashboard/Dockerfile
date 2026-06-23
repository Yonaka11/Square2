# Multi-stage build: compile the frontend, then run the backend which serves
# both the API and the built frontend on a single port (8080).

# --- Stage 1: build the frontend ---
FROM node:22 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend runtime (API + static frontend) ---
FROM node:22
WORKDIR /app

# Install backend dependencies (better-sqlite3 builds against the full node image).
COPY backend/package*.json ./backend/
RUN npm ci --prefix backend

# App source + built frontend.
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV NODE_ENV=production
ENV SERVE_STATIC=true
ENV PORT=8080
ENV DATABASE_PATH=/app/data/square_dashboard.db

EXPOSE 8080
WORKDIR /app/backend
CMD ["npm", "start"]
