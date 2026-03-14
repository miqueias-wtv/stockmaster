# Dockerfile for stockmaster-pro
# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if exists)
COPY package.json .
COPY package-lock.json .

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend
RUN npm run build

# Expose ports for Vite (3000) and API (3001)
EXPOSE 3000 3001

# Start both server and client in parallel
CMD ["npm", "run", "dev:all"]
