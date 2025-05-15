# Use official Node image
FROM node:16

# Create app directory
WORKDIR /app

# Only copy package files first (to leverage Docker layer caching)
COPY package*.json ./

# Install dependencies inside container
RUN npm install

# Now copy the rest of the app's source code
COPY . .

# Expose port and define start command
EXPOSE 3001
CMD ["npm", "start"]