# ใช้ Node.js เวอร์ชัน 20 บน Alpine Linux เพื่อให้ไฟล์มีขนาดเล็ก (pin minor)
FROM node:20.20-alpine

# ตั้งค่า Working Directory ใน Container
WORKDIR /app

# base URL ของ backend — ส่งผ่าน --build-arg / compose build.args
# Vite inline ค่านี้ตอน build · dev server (npm run dev) ก็อ่านจาก ENV นี้
ARG VITE_API_BASE=http://localhost:8000
ENV VITE_API_BASE=$VITE_API_BASE

# ก๊อปปี้ไฟล์ package.json และ package-lock.json เข้าไปก่อน (แยก layer ไว้ใช้ cache)
COPY package*.json ./

# ติดตั้ง Dependencies แบบตรงตาม lock file (reproducible)
RUN npm ci

# ก๊อปปี้ไฟล์ทั้งหมดในโปรเจกต์เข้าไป
COPY . .

# เปิดพอร์ต 5173
EXPOSE 5173

# คำสั่งรันเมื่อ Start Container
CMD ["npm", "run", "dev"]