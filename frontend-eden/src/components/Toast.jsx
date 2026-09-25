import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

const ToastContext = createContext(null);

let idSeq = 0;

const ICON = { success: "✓", error: "✕" };
const STYLE = {
  success: "bg-green-600",
  error: "bg-red-600",
};

// ระบบแจ้งเตือนแบบ toast กลาง — เรียกจากที่ไหนก็ได้ผ่าน useToast()
// (ใช้แทน modal เพราะบางจุด เช่น สร้างสัญญา นำทางออกจากฟอร์มทันทีหลังสำเร็จ)
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const show = useCallback(
    (message, type = "success", duration = 3000) => {
      const id = ++idSeq;
      setToasts((list) => [...list, { id, message, type }]);
      timers.current[id] = setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      success: (message, duration) => show(message, "success", duration),
      error: (message, duration) => show(message, "error", duration),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`${STYLE[t.type] ?? STYLE.success} pointer-events-auto text-white text-sm rounded-lg shadow-lg px-4 py-3 flex items-center gap-2 min-w-[240px] max-w-sm`}
          >
            <span className="font-bold">{ICON[t.type] ?? ICON.success}</span>
            <span className="flex-1">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              className="text-white/80 hover:text-white text-lg leading-none"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast ต้องใช้ภายใน <ToastProvider>");
  return ctx;
}
