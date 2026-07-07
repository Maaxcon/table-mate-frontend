FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx tsc -b && npx vite build

FROM nginx:1.27-alpine

RUN apk add --no-cache bash

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY env.sh /usr/share/nginx/html/env.sh

RUN chmod +x /usr/share/nginx/html/env.sh

EXPOSE 80

CMD ["/bin/bash", "-c", "/usr/share/nginx/html/env.sh && nginx -g 'daemon off;'"]