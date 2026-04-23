import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { LogIn } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            if (email === 'admin@invoicextract.ai' && password === 'admin123') {
                login('fake-jwt-token');
                toast.success('Login successful!');
                navigate('/dashboard');
            } else {
                toast.error('Invalid credentials. Use admin@invoicextract.ai / admin123');
            }
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '80vh' }}>
            <div className="card shadow-lg p-4" style={{ maxWidth: '400px', width: '100%', borderRadius: '15px', border: 'none' }}>
                <div className="text-center mb-4">
                    <div className="bg-primary d-inline-block p-3 rounded-circle mb-3 bg-opacity-10">
                        <LogIn size={32} className="text-primary" />
                    </div>
                    <h2 className="fw-bold">Welcome Back</h2>
                    <p className="text-muted">Enter your credentials to access InvoiceXtract AI</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label fw-semibold">Email address</label>
                        <input
                            type="email"
                            className="form-control form-control-lg"
                            placeholder="admin@invoicextract.ai"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label fw-semibold">Password</label>
                        <input
                            type="password"
                            className="form-control form-control-lg"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary btn-lg w-100 fw-bold"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm me-2"></span>
                        ) : null}
                        Login
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <p className="small text-muted mb-0">Demo credentials:</p>
                    <code className="small">admin@invoicextract.ai / admin123</code>
                </div>
            </div>
        </div>
    );
};

export default Login;
