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
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Contracts from "./modules/contracts/Contracts";
import ContractForm from "./modules/contracts/ContractForm";
import Tenants from "./modules/tenants/Tenants";
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
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/tenants" element={<Tenants />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/contracts/new" element={<ContractForm />} />
            <Route path="/rate" element={<Rates />} />
            <Route
              path="/permission"
              element={
                <RequireAuth roles={["admin"]}>
                  <Users />
                </RequireAuth>
              }
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
