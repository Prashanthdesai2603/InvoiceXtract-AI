import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import UploadForm from './components/UploadForm';
import ResultView from './components/ResultView';
import InvoiceTable from './components/InvoiceTable';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
    const location = useLocation();
    const isAuthPage = location.pathname === '/' || location.pathname === '/signup';

    return (
        <div className="app-shell">
            <Sidebar />
            <div className={`main-content ${isAuthPage ? '' : ''}`}
                style={isAuthPage ? { marginLeft: 0, width: '100%' } : {}}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />

                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <div className="page-container">
                                <Dashboard />
                            </div>
                        </ProtectedRoute>
                    } />

                    <Route path="/upload" element={
                        <ProtectedRoute>
                            <div className="page-container">
                                <UploadForm />
                            </div>
                        </ProtectedRoute>
                    } />

                    <Route path="/result/:id" element={
                        <ProtectedRoute>
                            <div className="page-container">
                                <ResultView />
                            </div>
                        </ProtectedRoute>
                    } />

                    <Route path="/history" element={
                        <ProtectedRoute>
                            <div className="page-container">
                                <InvoiceTable />
                            </div>
                        </ProtectedRoute>
                    } />

                    {/* Redirect unknown routes */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>

            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                theme="colored"
                toastStyle={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13.5px',
                    borderRadius: '10px',
                }}
            />
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <Router>
                    <AppContent />
                </Router>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;
