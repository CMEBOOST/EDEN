import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import RequireAuth from "./auth/RequireAuth";
import Sidebar from "./layout/Sidebar";
import TopBar from "./layout/Topbar";
import Login from "./pages/Login";
import Menu from "./pages/Menu";
import Dashboard from "./modules/dashboard/Dashboard";
import Contracts from "./modules/contracts/Contracts";
import ContractForm from "./modules/contracts/ContractForm";
import ContractDetail from "./modules/contracts/ContractDetail";
import ContractHistory from "./modules/contracts/ContractHistory";
import CheckoutInspection from "./modules/requests/CheckoutInspection";
import Profile from "./modules/profile/Profile";
import Tenants from "./modules/tenants/Tenants";
import TenantDetail from "./modules/tenants/TenantDetail";
import Rates from "./modules/rates/Rates";
import Users from "./modules/users/Users";
import AuditLog from "./modules/audit/AuditLog";

function Layout() {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex flex-col flex-1 w-full">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/profile" element={<Profile />} />
            <Route
              path="/tenants"
              element={
                <RequireAuth roles={["admin", "staff"]}>
                  <Tenants />
                </RequireAuth>
              }
            />
            <Route
              path="/tenants/:tenantId"
              element={
                <RequireAuth roles={["admin", "staff"]}>
                  <TenantDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/contracts"
              element={
                <RequireAuth roles={["admin", "staff"]}>
                  <Contracts />
                </RequireAuth>
              }
            />
            <Route
              path="/contracts/new"
              element={
                <RequireAuth roles={["admin", "staff"]}>
                  <ContractForm />
                </RequireAuth>
              }
            />
            <Route
              path="/contracts/history"
              element={
                <RequireAuth roles={["admin", "staff"]}>
                  <ContractHistory />
                </RequireAuth>
              }
            />
            <Route
              path="/contracts/history/:contractId"
              element={
                <RequireAuth roles={["admin", "staff"]}>
                  <ContractDetail readOnly />
                </RequireAuth>
              }
            />
            <Route
              path="/contracts/:contractId"
              element={
                <RequireAuth roles={["admin", "staff"]}>
                  <ContractDetail />
                </RequireAuth>
              }
            />
            <Route
              path="/contracts/:contractId/checkout"
              element={
                <RequireAuth roles={["admin", "staff"]}>
                  <CheckoutInspection />
                </RequireAuth>
              }
            />
            <Route
              path="/rate"
              element={
                <RequireAuth roles={["admin"]}>
                  <Rates />
                </RequireAuth>
              }
            />
            <Route
              path="/users"
              element={
                <RequireAuth roles={["admin", "staff"]}>
                  <Users />
                </RequireAuth>
              }
            />
            <Route
              path="/permission"
              element={<Navigate to="/users" replace />}
            />
            <Route
              path="/log"
              element={
                <RequireAuth roles={["admin"]}>
                  <AuditLog />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
