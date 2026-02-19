# Use Node 22 to satisfy Vite's requirements
FROM node:22-alpine

WORKDIR /app

# Copy package files first to cache dependencies (Faster builds!)
COPY package*.json ./

RUN npm install

# Copy the rest of your code
COPY . .

# Vite's default port
EXPOSE 5173

# Run vite with host 0.0.0.0 so it's accessible outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]