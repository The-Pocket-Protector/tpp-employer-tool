FROM node:22-alpine AS build
WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_STEDI_API_KEY
ARG VITE_SUNFIRE_API_URL
ARG VITE_STEDI_MCP_URL

# Set as environment variables for the build
ENV VITE_STEDI_API_KEY=$VITE_STEDI_API_KEY
ENV VITE_SUNFIRE_API_URL=$VITE_SUNFIRE_API_URL
ENV VITE_STEDI_MCP_URL=$VITE_STEDI_MCP_URL

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
