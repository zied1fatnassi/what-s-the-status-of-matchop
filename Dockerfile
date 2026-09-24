# Multi-stage build for React + Vite project

# Stage 1: Development image
FROM node:22-alpine AS development

WORKDIR /app

# Copy package files to cache dependencies
COPY package*.json ./

# Install dependencies (includes dev dependencies for Vite)
RUN npm install

# Copy application source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server with HMR accessible from host
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 2: Builder - compile production build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install only prod dependencies for build
RUN npm install --production=false

COPY . .

# Build the production bundle
RUN npm run build

# Stage 3: Production runtime (minimal image)
FROM node:22-alpine AS production

WORKDIR /app

# Install a lightweight HTTP server to serve static files
RUN npm install -g serve

# Copy only the dist folder from builder
COPY --from=builder /app/dist ./dist

# Expose port for the production server
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

# Serve the static files
CMD ["serve", "-s", "dist", "-l", "3000"]
