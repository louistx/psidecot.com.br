# 1. Base image with Node.js (builder)
FROM node:20-alpine AS builder

# 2. Set working directory
WORKDIR /app

# 3. Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# 4. Copy all files and build Next.js app
COPY . .
RUN npm run build

# 5. Production image
FROM node:20-alpine AS runner

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Copy only the necessary files from the builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Next.js listens on port 3000 by default
EXPOSE 3000

# Start the app
CMD ["npm", "start"]