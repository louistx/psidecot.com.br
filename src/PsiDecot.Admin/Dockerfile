# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# VITE_API_URL vazio → client.ts usa '/api/v1' (relativo)
# O nginx abaixo faz proxy /api → psidecot.api:8080
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Production stage — nginx serve o SPA + proxy para a API
FROM nginx:alpine AS runner

# Config nginx:
#  - /api/  → proxy para o container da API (mesma rede docker-compose)
#  - sw.js / workbox-*.js → sem cache (PWA service worker)
#  - /* → SPA fallback para index.html
RUN printf '\
server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
\n\
  # Proxy: encaminha chamadas de API para o container psidecot.api\n\
  location /api/ {\n\
    proxy_pass         http://psidecot.api:8080/api/;\n\
    proxy_set_header   Host $host;\n\
    proxy_set_header   X-Real-IP $remote_addr;\n\
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;\n\
  }\n\
\n\
  # Service worker e workbox: nunca cachear para atualizações funcionarem\n\
  location ~* (sw\\.js|workbox-[^/]+\\.js)$ {\n\
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";\n\
    add_header Pragma "no-cache";\n\
    try_files $uri =404;\n\
  }\n\
\n\
  # SPA fallback: qualquer rota → index.html\n\
  location / {\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
