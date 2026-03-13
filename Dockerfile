# ===========================================
# Stage 1: Build
# ===========================================
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ===========================================
# Stage 2: Production
# ===========================================
FROM node:20-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json* ./

RUN npm ci --omit=dev

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV SAVE_DIR=/app/data

CMD ["node", "server.js"]
