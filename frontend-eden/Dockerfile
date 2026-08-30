# ใช้ Node.js เวอร์ชัน 20 บน Alpine Linux เพื่อให้ไฟล์มีขนาดเล็ก (pin minor)
FROM node:20.20-alpine

# ตั้งค่า Working Directory ใน Container
WORKDIR /app

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