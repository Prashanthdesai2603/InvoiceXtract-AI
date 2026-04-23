import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, LogOut, LayoutDashboard, Upload, History, FileText } from 'lucide-react';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { darkMode, toggleDarkMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();

    const isAuthPage = location.pathname === '/' || location.pathname === '/signup';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className={`navbar navbar-expand-lg ${darkMode ? 'navbar-dark bg-dark' : 'navbar-light bg-white'} shadow-sm sticky-top mb-4`}>
            <div className="container">
                <Link className="navbar-brand d-flex align-items-center fw-bold text-primary" to={user ? "/dashboard" : "/"}>
                    <FileText className="me-2" />
                    <span>InvoiceXtract AI</span>
                </Link>

                {/* Only show full navbar features if logged in and NOT on an auth page */}
                {!isAuthPage && user ? (
                    <>
                        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div className="collapse navbar-collapse" id="navbarNav">
                            <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center" to="/dashboard">
                                        <LayoutDashboard size={18} className="me-1" /> Dashboard
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center" to="/upload">
                                        <Upload size={18} className="me-1" /> Upload
                                    </Link>
                                </li>
                                <li className="nav-item">
                                    <Link className="nav-link d-flex align-items-center" to="/history">
                                        <History size={18} className="me-1" /> History
                                    </Link>
                                </li>
                            </ul>
                            <div className="ms-auto d-flex align-items-center gap-3">
                                <button 
                                    className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`}
                                    onClick={toggleDarkMode}
                                    style={{ width: '38px', height: '38px' }}
                                    title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                                >
                                    {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                                </button>

                                <div className="d-flex align-items-center gap-3">
                                    <span className={`small fw-semibold ${darkMode ? 'text-light' : 'text-dark'} d-none d-md-inline`}>
                                        Hi, {user.username}
                                    </span>
                                    <button className="btn btn-outline-danger btn-sm d-flex align-items-center px-3" onClick={handleLogout}>
                                        <LogOut size={18} className="me-2" /> Logout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    // On Login/Signup, show only theme toggle
                    <div className="ms-auto">
                         <button 
                            className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center ${darkMode ? 'btn-outline-light' : 'btn-outline-dark'}`}
                            onClick={toggleDarkMode}
                            style={{ width: '38px', height: '38px' }}
                        >
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
