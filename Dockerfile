
FROM node:20-alpine AS base


WORKDIR /usr/src/app

# Keep the package manager compatible with Node 20 and the lockfile.
RUN npm install -g pnpm@10.34.5

# Copy package files for caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

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


CMD ["sh", "./docker-entrypoint.sh"]
