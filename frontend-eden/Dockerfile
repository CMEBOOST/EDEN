# ---- deps: ติดตั้ง dependency (แยก layer ไว้ใช้ cache) ----
FROM node:20.20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- dev: Vite dev server (docker-compose.yml ชี้ target นี้) ----
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---- build: สร้าง static bundle ----
FROM deps AS build
# base URL ของ backend — Vite inline ตอน build (prod ใช้ /api ผ่าน nginx proxy)
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
COPY . .
RUN npm run build

# ---- runtime: nginx เสิร์ฟ dist (stage สุดท้าย = default target) ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
