FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY tsconfig.json ./

RUN npm run build
RUN npm prune --production

EXPOSE 3000
CMD ["npm", "start"]
