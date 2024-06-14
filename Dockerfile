# Use the official Node.js 16 image.
# Check https://hub.docker.com/_/node to select a new base image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package.json ./
COPY package-lock.json ./

# Install dependencies
RUN npm install

# Bundle app source
COPY . .


# Command to run your app using CMD which defines your runtime
CMD [ "node", "server.js" ]
