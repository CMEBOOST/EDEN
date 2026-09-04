"""จับ exception ที่ route ไม่ได้ handle แล้วตอบกลับเป็น JSON 500

ถ้าปล่อยให้ Starlette จัดการเอง (ServerErrorMiddleware) response 500 จะถูกส่งออกไป
"นอก" ชั้น CORS → ไม่มี header `Access-Control-Allow-Origin` → browser เห็นเป็น
"Failed to fetch" แทนที่จะเห็น status 500 + ข้อความจริง

เป็น ASGI middleware ล้วน ๆ (ไม่ใช่ BaseHTTPMiddleware) เพื่อเลี่ยงปัญหา log ซ้ำ /
background task ของ BaseHTTPMiddleware  · ต้องอยู่ "ข้างใน" CORSMiddleware
(add ก่อน CORS ใน main.py) เพื่อให้ response ที่มันสร้างวิ่งกลับผ่าน CORS แล้วได้ header ครบ
"""

import logging

from starlette.responses import JSONResponse

log = logging.getLogger("uvicorn.error")


class ErrorHandlerMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        response_started = False

        async def _send(message):
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, _send)
        except Exception:
            log.exception(
                "unhandled error: %s %s",
                scope.get("method"),
                scope.get("path"),
            )
            if not response_started:
                response = JSONResponse(
                    status_code=500,
                    content={"detail": "เกิดข้อผิดพลาดภายในระบบ"},
                )
                await response(scope, receive, send)
            # จบที่นี่ — ไม่ re-raise เพื่อไม่ให้ ServerErrorMiddleware log ทับอีกรอบ
