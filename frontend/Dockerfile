FROM node:18-alpine

WORKDIR /app

# Copy package manager files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create production build
RUN npm run build

# Use a lightweight node server for serving static files
FROM node:18-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built files from previous stage
COPY --from=0 /app/dist ./dist

# Expose port 3000
EXPOSE 3000

# Start the server and specify the public URL
CMD ["serve", "-s", "dist", "-l", "3000", "--single"]