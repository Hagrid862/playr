FROM node:22-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN npm install turbo@2.7.6 --global
COPY . .
RUN turbo prune @repo/web --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN corepack enable
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# Build the project
RUN pnpm turbo build --filter=@repo/web...

FROM nginx:alpine AS runner
# Copy built files from installer
COPY --from=installer /app/apps/web/dist /usr/share/nginx/html

# Custom nginx config might be needed for SPA routing (handled by user if needed)
# For now, standard serving.

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
