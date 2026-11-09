# Multi-stage production Dockerfile for Consent
# Stage 1: Build the Web Frontend
FROM node:20-alpine AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build the Server
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./
RUN npm run build

# Stage 3: Minimal Production Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000
ENV LLM_PROVIDER=mock
ENV DEMO_MODE=true

# Copy server package & install production dependencies only
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy compiled backend and database scripts
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/src/db ./src/db

# Copy built frontend assets to server static root
COPY --from=web-builder /app/web/dist /app/web/dist

# Expose port
EXPOSE 4000

# Seed initial hackathon state and launch
CMD ["sh", "-c", "npx tsx src/db/seed.ts && node dist/index.js"]
