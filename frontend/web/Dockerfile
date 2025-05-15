# Stage 1: Build React app
FROM node:16 AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html

# Expose default nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]