FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache \
build-base \
cmake \
python3 \
git \
gcompat \
libstdc++
RUN mv /usr/bin/g++ /usr/bin/g++-real && \
echo '#!/bin/sh' > /usr/bin/g++ && \
echo 'exec /usr/bin/g++-real "$@" -std=c++20 -Wno-error=maybe-uninitialized -Wno-maybe-uninitialized' >> /usr/bin/g++ && \
chmod +x /usr/bin/g++

COPY package*.json ./
RUN git config --global --add safe.directory '*'
RUN npm install

FROM base AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM base AS builder
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS production
WORKDIR /app
RUN apk add --no-cache gcompat libstdc++

COPY --chown=node:node package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules/
COPY --from=builder --chown=node:node /app/dist ./dist/
COPY --from=builder --chown=node:node /app/drizzle.config.ts ./
COPY --from=builder --chown=node:node /app/drizzle ./drizzle

USER node

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/main"]