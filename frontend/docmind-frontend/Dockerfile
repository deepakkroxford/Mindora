# =========================================================================
# Stage 1: Build React + Vite Static Bundle
# =========================================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Cache dependencies layer
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build production distribution
COPY . .
RUN npm run build

# =========================================================================
# Stage 2: Serve with Ultra-Lightweight Nginx Alpine
# =========================================================================
FROM nginx:1.27-alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled SPA static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose web server port
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
