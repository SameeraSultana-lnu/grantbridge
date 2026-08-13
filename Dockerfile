FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY package.json /app/package.json
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY package.json /app/package.json
COPY backend/package*.json ./
# Install production deps only — devDependencies are not needed at runtime
RUN npm ci --omit=dev
COPY backend/ ./
RUN npm run build

FROM node:22-alpine AS runner
# tini gives us proper PID-1 signal forwarding inside the container
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-builder /app/backend/package*.json ./backend/
COPY --from=backend-builder /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Pre-create the data directory so auth-users.json can be written at runtime
RUN mkdir -p /app/backend/data

EXPOSE 8080
WORKDIR /app/backend
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
