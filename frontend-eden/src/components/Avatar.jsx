import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

// รูปที่มาจาก backend (ผ่าน ngrok ตอน dev) ต้องแนบ header ข้าม interstitial warning
// ของ ngrok — <img src> แนบ header เองไม่ได้ จึง fetch เป็น blob แล้วค่อยตั้งเป็น src
// ส่วนรูป preset/preview ในเครื่อง (import asset, blob: URL) ใช้ src ตรงได้เลย
function Avatar({ src, alt = "", className }) {
  const isRemote = typeof src === "string" && src.startsWith(API_BASE);
  const [resolvedSrc, setResolvedSrc] = useState(isRemote ? null : src);

  useEffect(() => {
    if (!isRemote) {
      setResolvedSrc(src);
      return;
    }
    let objectUrl;
    let cancelled = false;
    fetch(src, { headers: { "ngrok-skip-browser-warning": "true" } })
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, isRemote]);

  if (!resolvedSrc) return <div className={className} />;
  return <img src={resolvedSrc} alt={alt} className={className} />;
}

export default Avatar;
