# Stage 1: Build the Angular app with caching
FROM node:18-alpine AS build

# Set working directory inside the container
WORKDIR /app

# Install dependencies separately to improve layer caching
COPY package*.json ./

# Install only production dependencies (using cache if possible)
RUN npm ci --legacy-peer-deps --only=production

# Now copy the rest of the application source code
COPY . .

# Install dev dependencies only after caching package.json and package-lock.json layers
RUN npm install --legacy-peer-deps

# Build the Angular app in production mode (keeps only the necessary files)
RUN npm run build --prod

# Stage 2: Serve the Angular app using Nginx
FROM nginx:alpine

# Copy the built Angular app from Stage 1 to the Nginx document root
COPY --from=build /app/dist/dashboard /usr/share/nginx/html

# Optionally, copy a custom Nginx configuration (if needed)
COPY nginx.conf /etc/nginx/nginx.conf

# Expose the port Nginx will run on
EXPOSE 80

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]
