FROM node:22-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN npm install turbo --global
COPY . .
RUN turbo prune @repo/admin --docker

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
RUN pnpm turbo build --filter=@repo/admin...

FROM nginx:alpine AS runner
COPY --from=installer /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
