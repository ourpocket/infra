
FROM node:20-alpine AS base


WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files for caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

COPY . .

FROM base AS development
ENV NODE_ENV=development

EXPOSE 3000

CMD ["pnpm", "run", "start:dev"]

FROM base AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}


RUN pnpm run build

# Expose port
EXPOSE 3000


CMD ["node", "dist/main.js"]
