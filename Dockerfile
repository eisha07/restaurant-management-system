# Use Node.js for both building and running
FROM node:18

# Set working directory
WORKDIR /app

# Copy backend files and install dependencies
COPY restaurant-backend/package*.json ./restaurant-backend/
RUN cd restaurant-backend && npm install

# Copy frontend files and install dependencies
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Copy the rest of the code
COPY . .

# Build the frontend
RUN cd frontend && npm run build

# Move frontend build to backend public folder (so Express can serve it)
RUN mkdir -p restaurant-backend/public
RUN cp -r frontend/dist/* restaurant-backend/public/

# Expose the port Hugging Face expects
EXPOSE 7860

# Set environment variables
ENV PORT=7860
ENV BIND_ADDRESS=0.0.0.0
ENV NODE_ENV=production

# Start the backend
CMD ["node", "restaurant-backend/server.js"]

