FROM node:22-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
RUN npm install turbo@2.7.6 --global
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

# Set build arguments for Vite
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the project
RUN pnpm turbo run prisma:generate --filter=@repo/db
RUN pnpm turbo build --filter=@repo/admin...

FROM nginx:alpine AS runner
COPY --from=installer /app/apps/admin/dist /usr/share/nginx/html
RUN rm /etc/nginx/conf.d/default.conf \
    && printf 'server {\n  listen 80;\n  server_name _;\n  root /usr/share/nginx/html;\n  index index.html;\n  location / {\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
