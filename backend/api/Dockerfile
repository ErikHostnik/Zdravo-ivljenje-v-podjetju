FROM node:20-alpine

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .

ARG PORT=3000
ENV PORT=${PORT}
EXPOSE ${PORT}

CMD [ "npm", "start" ]
