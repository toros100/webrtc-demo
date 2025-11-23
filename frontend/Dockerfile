FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_COTURN_URLS
RUN echo "build arg: $VITE_COTURN_URLS"
RUN npm run build


FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY .htpasswd /etc/nginx/.htpasswd
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]

