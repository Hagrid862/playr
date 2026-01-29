FROM node:22-alpine AS base

FROM base AS builder
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat openssl
# Set working directory
WORKDIR /app
# Install turbo global
RUN npm install turbo@2.7.6 --global
COPY . .
RUN turbo prune @repo/api --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# First install dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/packages/db/prisma/schema.prisma ./packages/db/prisma/schema.prisma

# Install pnpm
RUN npm install -g pnpm@9.15.4
RUN pnpm install --frozen-lockfile

# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# Generate prisma client
RUN pnpm turbo run prisma:generate --filter=@repo/db

RUN pnpm turbo build --filter=@repo/api...

# Prune dev dependencies
RUN pnpm install --prod --frozen-lockfile

FROM base AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

# Copy everything from installer stage
COPY --from=installer --chown=nestjs:nodejs /app .

EXPOSE 8000

CMD ["node", "apps/api/dist/main"]
