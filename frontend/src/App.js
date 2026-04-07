import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerDashboard from './pages/CustomerDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import AdminDashboard from './pages/AdminDashboard';
import DemandDetail from './pages/DemandDetail';
import ProfilePage from './pages/ProfilePage';
import { PaymentSuccess, PaymentCancelled, PricingPage } from './pages/PaymentPage';
import TermsPage from './pages/TermsPage';
import ContactPage from './pages/ContactPage';
import RecurringPaymentsPage from './pages/RecurringPaymentsPage';
import EmailVerificationPage from './pages/EmailVerificationPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error('Auth error:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email: email.trim().toLowerCase(), password });
    const { access_token, user: userData } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(userData);
    // Auto-claim any quick demands matching this user's email
    try {
      await axios.post(`${API}/demands/claim`, {}, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
    } catch (e) { /* ignore claim errors */ }
    return userData;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API}/auth/register`, { ...userData, email: userData.email.trim().toLowerCase() });
    // Registration now returns verification info, not a token
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Protected Route
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/prihlaseni" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Dashboard Router - redirects to appropriate dashboard
const DashboardRouter = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/prihlaseni" />;
  
  switch (user.role) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'supplier':
      return <Navigate to="/dodavatel" replace />;
    case 'customer_supplier':
      return <Navigate to="/zakaznik" replace />;
    case 'customer':
    default:
      return <Navigate to="/zakaznik" replace />;
  }
};

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/prihlaseni" element={<LoginPage />} />
          <Route path="/registrace" element={<RegisterPage />} />
          <Route path="/overit-email/:token" element={<EmailVerificationPage />} />
          <Route path="/cenik" element={<PricingPage />} />
          
          {/* Payment routes */}
          <Route path="/platba/uspech" element={<PaymentSuccess />} />
          <Route path="/platba/zruseno" element={<PaymentCancelled />} />
          
          {/* Legal routes */}
          <Route path="/obchodni-podminky" element={<TermsPage />} />
          <Route path="/kontakt" element={<ContactPage />} />
          <Route path="/podminky-opakovanych-plateb" element={<RecurringPaymentsPage />} />
          
          {/* Dashboard router */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          } />
          
          {/* Customer routes */}
          <Route path="/zakaznik/*" element={
            <ProtectedRoute roles={['customer', 'customer_supplier', 'admin']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          
          {/* Supplier routes */}
          <Route path="/dodavatel/*" element={
            <ProtectedRoute roles={['supplier', 'customer_supplier', 'admin']}>
              <SupplierDashboard />
            </ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin/*" element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Shared routes */}
          <Route path="/zakazka/:id" element={
            <ProtectedRoute>
              <DemandDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/profil" element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } />
          
          <Route path="/profil/:id" element={<ProfilePage />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
