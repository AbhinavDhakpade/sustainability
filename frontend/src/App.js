import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Companies from "@/pages/Companies";
import Users from "@/pages/Users";
import LCA from "@/pages/LCA";
import ESG from "@/pages/ESG";
import Traceability from "@/pages/Traceability";
import Carbon from "@/pages/Carbon";
import MapPage from "@/pages/MapPage";
import AIDraft from "@/pages/AIDraft";
import Plans from "@/pages/Plans";
import { BillingSuccess, BillingCancel } from "@/pages/Billing";
import Flagship from "@/pages/Flagship";
import PublicFlagship from "@/pages/PublicFlagship";
import PublicTrace from "@/pages/PublicTrace";
import AuditTrail from "@/pages/AuditTrail";
import { Toaster } from "@/components/ui/sonner";
import { RegionProvider } from "@/contexts/RegionContext";
import Settings from "@/pages/Settings";
import { ForgotPassword, ResetPassword } from "@/pages/PasswordReset";

function App() {
  return (
    <AuthProvider>
      <Toaster position="bottom-right" richColors />
      <RegionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/r/:slug" element={<PublicFlagship />} />
          <Route path="/trace/:id" element={<PublicTrace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/companies" element={<ProtectedRoute roles={["super_admin"]}><Companies /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute roles={["super_admin", "company_admin"]}><Users /></ProtectedRoute>} />
          <Route path="/lca" element={<ProtectedRoute><LCA /></ProtectedRoute>} />
          <Route path="/esg" element={<ProtectedRoute><ESG /></ProtectedRoute>} />
          <Route path="/traceability" element={<ProtectedRoute><Traceability /></ProtectedRoute>} />
          <Route path="/carbon" element={<ProtectedRoute><Carbon /></ProtectedRoute>} />
          <Route path="/map" element={<ProtectedRoute><MapPage /></ProtectedRoute>} />
          <Route path="/ai" element={<ProtectedRoute><AIDraft /></ProtectedRoute>} />
          <Route path="/flagship" element={<ProtectedRoute><Flagship /></ProtectedRoute>} />
          <Route path="/plans"element={<ProtectedRoute><Plans /></ProtectedRoute>} />
          <Route path="/billing/success" element={<ProtectedRoute><BillingSuccess /></ProtectedRoute>} />
          <Route path="/billing/cancel" element={<ProtectedRoute><BillingCancel /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute roles={["super_admin", "company_admin", "auditor"]}><AuditTrail /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      </RegionProvider>
    </AuthProvider>
  );
}

export default App;
