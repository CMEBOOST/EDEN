# ใช้ Node.js เวอร์ชัน 20 บน Alpine Linux เพื่อให้ไฟล์มีขนาดเล็ก
FROM node:20-alpine

# ตั้งค่า Working Directory ใน Container
WORKDIR /app

# ก๊อปปี้ไฟล์ package.json และ package-lock.json (ถ้ามี) เข้าไปก่อน
COPY package*.json ./

# ติดตั้ง Dependencies
RUN npm install

# ก๊อปปี้ไฟล์ทั้งหมดในโปรเจกต์เข้าไป
COPY . .

# เปิดพอร์ต 5173
EXPOSE 5173

# คำสั่งรันเมื่อ Start Container
CMD ["npm", "run", "dev"]