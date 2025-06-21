FROM node:20-alpine as build

WORKDIR /app

# Install Python and build tools needed for node-gyp
RUN apk add --no-cache python3 make g++ 

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Create a lightweight production image
FROM node:20-alpine

WORKDIR /app

# Copy only necessary files from build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Install Python and build tools needed for node-gyp
RUN apk add --no-cache python3 make g++

# Install only production dependencies
RUN npm ci --only=production

# Expose API port
EXPOSE 5000

CMD ["node", "dist/main.js"]
