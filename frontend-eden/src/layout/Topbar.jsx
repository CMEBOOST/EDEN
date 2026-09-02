import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { avatarSrc } from "../lib/avatar";
import { crumbsFor } from "./breadcrumbs";

const roleLabel = { admin: "ผู้ดูแลระบบ", staff: "พนักงาน", tenant: "ผู้เช่า" };

function Breadcrumbs() {
  const { pathname } = useLocation();
  const crumbs = crumbsFor(pathname);
  if (crumbs.length === 0) return <div />;

  return (
    <nav className="flex items-center gap-1.5 text-sm min-w-0">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-gray-300">›</span>}
            {c.to && !last ? (
              <Link
                to={c.to}
                className="text-gray-400 hover:text-gray-700 transition-colors shrink-0"
              >
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-gray-800 truncate">
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // ปิดเมนูเมื่อคลิกนอก / กด Esc (คลิก sidebar link = mousedown นอก ref → ปิดด้วย)
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleLogout() {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-gray-200 pl-1.5 pr-2 py-1 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <img
          src={avatarSrc(user)}
          alt=""
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="leading-tight text-left hidden sm:block">
          <div className="text-sm font-medium text-gray-700">
            {user?.username ?? "-"}
          </div>
          <div className="text-xs text-gray-400">
            {roleLabel[user?.role] ?? user?.role}
          </div>
        </div>
        <span
          className={`text-gray-400 text-xs transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-50"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
            <img
              src={avatarSrc(user)}
              alt=""
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="leading-tight min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">
                {user?.username ?? "-"}
              </div>
              <div className="text-xs text-gray-400">
                {roleLabel[user?.role] ?? user?.role}
              </div>
            </div>
          </div>

          <Link
            to="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            👤 โปรไฟล์
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            ⏻ ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

function TopBar() {
  return (
    <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between gap-4 px-6 shrink-0">
      <Breadcrumbs />
      <UserMenu />
    </header>
  );
}

export default TopBar;
