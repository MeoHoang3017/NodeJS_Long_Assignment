FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci

# Copy source code after dependencies.
COPY . .

EXPOSE 3000

CMD ["npm", "start"]
