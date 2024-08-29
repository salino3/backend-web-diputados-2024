# Use an official Node.js version 20 base image
FROM node:20

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the port your app runs on (change if you use a different port)
EXPOSE 8100

# Command to run your application
CMD ["node", "index.js"]
