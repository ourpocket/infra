# -----------------------
# Base stage
# -----------------------
FROM node:20-alpine AS base

# Set working directory
WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files for caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy all source code
COPY . .

# -----------------------
# Development stage
# -----------------------
FROM base AS development
ENV NODE_ENV=development

# Expose port for NestJS
EXPOSE 3000

# Start NestJS in watch mode
CMD ["pnpm", "run", "start:dev"]

# -----------------------
# Production stage
# -----------------------
FROM base AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Build NestJS
RUN pnpm run build

# Expose port
EXPOSE 3000

# Start compiled app
CMD ["node", "dist/main.js"]
