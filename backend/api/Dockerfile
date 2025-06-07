FROM node:18-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache python3 py3-pip

COPY ./api/package*.json ./

RUN npm install

COPY ./api ./

COPY ./scripts /usr/src/app/scripts

EXPOSE 3001

CMD ["npm", "start"]
