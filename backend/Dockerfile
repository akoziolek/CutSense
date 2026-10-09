FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM base AS development
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

FROM base AS builder
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:22-alpine AS production
WORKDIR /app

COPY --chown=node:node package*.json .
COPY --from=builder --chown=node:node /app/dist dist/
COPY --from=builder --chown=node:node /app/node_modules node_modules/

USER node

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/main"]