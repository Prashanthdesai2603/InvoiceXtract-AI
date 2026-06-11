import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    FileText,
    LayoutDashboard,
    Upload,
    History,
    LogOut,
    Sun,
    Moon,
    Menu,
    X,
    Zap
} from 'lucide-react';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { darkMode, toggleDarkMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isAuthPage = location.pathname === '/' || location.pathname === '/signup';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/upload',    icon: Upload,          label: 'Upload' },
        { to: '/history',   icon: History,         label: 'History' },
    ];

    const getInitials = (name) => {
        if (!name) return 'U';
        return name.slice(0, 2).toUpperCase();
    };

    // On auth pages render nothing
    if (isAuthPage) return null;

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay ${mobileOpen ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
                {/* Logo */}
                <NavLink
                    to="/dashboard"
                    className="sidebar-logo"
                    onClick={() => setMobileOpen(false)}
                    style={{ textDecoration: 'none' }}
                >
                    <div className="sidebar-logo-icon">
                        <FileText size={16} color="white" />
                    </div>
                    <div>
                        <div className="sidebar-logo-text">InvoiceXtract</div>
                        <div className="sidebar-logo-sub">AI Platform</div>
                    </div>
                </NavLink>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <div className="sidebar-section-label">Main</div>

                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) =>
                                `sidebar-nav-item ${isActive ? 'active' : ''}`
                            }
                            onClick={() => setMobileOpen(false)}
                        >
                            <Icon size={17} className="nav-icon" />
                            {label}
                        </NavLink>
                    ))}

                    <div className="sidebar-section-label" style={{ marginTop: 12 }}>Account</div>

                    <button
                        className="sidebar-nav-item"
                        onClick={toggleDarkMode}
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                        {darkMode
                            ? <Sun size={17} className="nav-icon" />
                            : <Moon size={17} className="nav-icon" />
                        }
                        {darkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>

                    <button
                        className="sidebar-nav-item"
                        style={{ color: 'var(--danger-text)' }}
                        onClick={handleLogout}
                    >
                        <LogOut size={17} className="nav-icon" style={{ opacity: 1, color: 'var(--danger-text)' }} />
                        Logout
                    </button>
                </nav>

                {/* User */}
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">{getInitials(user?.username)}</div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div className="sidebar-username">{user?.username}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                <Zap size={10} style={{ marginRight: 3 }} />
                                Pro Plan
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile topbar */}
            <div
                className="topbar"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 98,
                    display: 'none',
                }}
                id="mobile-topbar"
            >
                <button
                    className="mobile-menu-btn"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <div className="topbar-title">InvoiceXtract AI</div>
                <button className="theme-toggle" onClick={toggleDarkMode}>
                    {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                </button>
            </div>

            <style>{`
                @media (max-width: 900px) {
                    #mobile-topbar { display: flex !important; }
                }
            `}</style>
        </>
    );
};

export default Sidebar;
