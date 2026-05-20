import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import UploadForm from './components/UploadForm';
import ResultView from './components/ResultView';
import InvoiceTable from './components/InvoiceTable';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';

function AppContent() {
    return (
        <div className="App min-vh-100 transition-all duration-300">
            <Navbar />
            <main className="container-fluid px-md-5 pb-5">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    
                    {/* Protected Routes */}
                    <Route path="/dashboard" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/upload" element={
                        <ProtectedRoute>
                            <UploadForm />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/result/:id" element={
                        <ProtectedRoute>
                            <ResultView />
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/history" element={
                        <ProtectedRoute>
                            <InvoiceTable />
                        </ProtectedRoute>
                    } />
                    
                    {/* Redirect unknown routes */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
            <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
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
