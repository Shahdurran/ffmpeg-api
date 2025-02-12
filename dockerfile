# Use an official Ubuntu base image
FROM ubuntu:latest 

# Set timezone non-interactively
ENV TZ=Europe/Amsterdam
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install necessary dependencies
RUN apt-get update && apt-get install -y curl ffmpeg nodejs npm

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]
