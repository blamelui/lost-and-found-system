import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ReportLost from './pages/ReportLost';
import ReportFound from './pages/ReportFound';
import ClaimItem from './pages/ClaimItem';
import MyClaims from './pages/MyClaims';
import Search from './pages/Search';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-[#A0B0D0]">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public pages — no sidebar */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Everything inside AppLayout gets the sidebar + topbar */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/claims" element={<MyClaims />} />
        <Route path="/items/:id/claim" element={<ClaimItem />} />
        <Route path="/report-lost" element={<ReportLost />} />
        <Route path="/report-found" element={<ReportFound />} />
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}