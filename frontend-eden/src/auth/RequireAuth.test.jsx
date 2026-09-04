import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequireAuth from "./RequireAuth";
import { useAuth } from "./AuthContext";

vi.mock("./AuthContext", () => ({ useAuth: vi.fn() }));

function renderGuard(roles) {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route
          path="/secret"
          element={
            <RequireAuth roles={roles}>
              <div>SECRET</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => vi.mocked(useAuth).mockReset());

describe("RequireAuth", () => {
  it("loading → แสดง 'กำลังโหลด...'", () => {
    vi.mocked(useAuth).mockReturnValue({ loading: true, user: null });
    renderGuard();
    expect(screen.getByText("กำลังโหลด...")).toBeInTheDocument();
  });

  it("ไม่มี user → redirect ไป /login", () => {
    vi.mocked(useAuth).mockReturnValue({ loading: false, user: null });
    renderGuard();
    expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument();
  });

  it("role ไม่ตรง → แสดง 'ไม่มีสิทธิ์เข้าถึง'", () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      user: { role: "staff" },
    });
    renderGuard(["admin"]);
    expect(screen.getByText("ไม่มีสิทธิ์เข้าถึง")).toBeInTheDocument();
  });

  it("role ตรง → แสดง children", () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      user: { role: "admin" },
    });
    renderGuard(["admin"]);
    expect(screen.getByText("SECRET")).toBeInTheDocument();
  });

  it("ไม่ระบุ roles + มี user → แสดง children", () => {
    vi.mocked(useAuth).mockReturnValue({
      loading: false,
      user: { role: "tenant" },
    });
    renderGuard();
    expect(screen.getByText("SECRET")).toBeInTheDocument();
  });
});
