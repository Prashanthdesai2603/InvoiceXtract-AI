import React, { useState, useEffect } from 'react';
import { getInvoices } from '../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
    TrendingUp, FileText, IndianRupee, ArrowRight,
    CheckCircle, Clock, Upload, BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '../utils/format';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

const BRAND_COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#64748b'];

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                boxShadow: 'var(--shadow-lg)'
            }}>
                {label && <p style={{ margin: '0 0 4px', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>}
                {payload.map((p, i) => (
                    <p key={i} style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 700 }}>
                        {p.name}: {typeof p.value === 'number' && p.name !== 'Invoices' ? formatCurrency(p.value) : p.value}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    const [stats, setStats] = useState({ count: 0, totalAmount: 0, processed: 0 });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [barData, setBarData] = useState([]);
    const [pieData, setPieData] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getInvoices();
            const data = res.data;

            const total = data.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
            const processed = data.filter(inv => inv.status !== 'processing' && inv.status !== 'failed').length;
            setStats({ count: data.length, totalAmount: total, processed });
            setRecentInvoices(data.slice(0, 6));
            processCharts(data);
        } catch (error) {
            if (error.response?.status !== 401) toast.error('Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const processCharts = (data) => {
        // Bar chart — monthly invoices
        const monthCounts = {};
        data.forEach(inv => {
            if (!inv.date) return;
            const month = new Date(inv.date).toLocaleString('default', { month: 'short' });
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        });
        setBarData(Object.entries(monthCounts).map(([month, count]) => ({ month, Invoices: count })));

        // Pie chart — vendor distribution
        const vendorCounts = {};
        data.forEach(inv => {
            const vendor = inv.vendor_name || 'Unknown';
            vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
        });
        const sorted = Object.entries(vendorCounts).sort(([, a], [, b]) => b - a);
        const top = sorted.slice(0, 5);
        const otherCount = sorted.slice(5).reduce((sum, [, c]) => sum + c, 0);
        if (otherCount > 0) top.push(['Others', otherCount]);
        setPieData(top.map(([name, value]) => ({ name, value })));
    };

    useEffect(() => { fetchData(); }, []); // eslint-disable-line

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
    };
    const itemVariants = { hidden: { y: 16, opacity: 0 }, visible: { y: 0, opacity: 1 } };

    const statCards = [
        {
            label: 'Total Invoices',
            value: stats.count,
            icon: FileText,
            iconBg: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
            iconColor: '#4338ca',
            footer: 'All-time extractions',
        },
        {
            label: 'Total Value',
            value: formatCurrency(stats.totalAmount),
            icon: IndianRupee,
            iconBg: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
            iconColor: '#065f46',
            footer: 'Across all invoices',
        },
        {
            label: 'Processed',
            value: stats.processed,
            icon: CheckCircle,
            iconBg: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            iconColor: '#1e40af',
            footer: `${stats.count > 0 ? Math.round((stats.processed / stats.count) * 100) : 0}% success rate`,
        },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
                <div className="spinner spinner-dark" style={{ width: 28, height: 28, borderWidth: 3 }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Analytics Dashboard</h1>
                    <p className="page-subtitle">Your invoice processing overview</p>
                </div>
                <Link to="/upload" className="btn btn-primary">
                    <Upload size={15} />
                    New Upload
                </Link>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                {statCards.map((card, i) => (
                    <motion.div key={i} variants={itemVariants}>
                        <div className="stat-card">
                            <div className="stat-icon-wrap" style={{ background: card.iconBg }}>
                                <card.icon size={20} style={{ color: card.iconColor }} />
                            </div>
                            <div className="stat-label">{card.label}</div>
                            <div className="stat-value">{card.value}</div>
                            <div className="stat-footer">
                                <TrendingUp size={12} style={{ color: 'var(--success-text)' }} />
                                {card.footer}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 24 }}>
                {/* Bar Chart */}
                <motion.div variants={itemVariants}>
                    <div className="chart-card" style={{ height: '100%' }}>
                        <div className="chart-title">
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <BarChart3 size={16} style={{ color: 'var(--brand-500)' }} />
                                Monthly Volume
                            </span>
                        </div>
                        <div className="chart-subtitle">Number of invoices processed per month</div>
                        <div style={{ height: 260 }}>
                            {barData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} barSize={28}>
                                        <XAxis
                                            dataKey="month"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'Inter' }}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fontSize: 12, fill: 'var(--text-muted)', fontFamily: 'Inter' }}
                                            allowDecimals={false}
                                        />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)', radius: 6 }} />
                                        <Bar dataKey="Invoices" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                                        <defs>
                                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#6366f1" />
                                                <stop offset="100%" stopColor="#a855f7" />
                                            </linearGradient>
                                        </defs>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                    No data available yet
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Pie Chart */}
                <motion.div variants={itemVariants}>
                    <div className="chart-card" style={{ height: '100%' }}>
                        <div className="chart-title">Vendor Distribution</div>
                        <div className="chart-subtitle">Top vendors by invoice count</div>
                        <div style={{ height: 260 }}>
                            {pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="42%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {pieData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={BRAND_COLORS[index % BRAND_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend
                                            iconType="circle"
                                            iconSize={8}
                                            formatter={(value) => (
                                                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'Inter' }}>{value}</span>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                    No data available yet
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recent Invoices */}
            <motion.div variants={itemVariants}>
                <div className="data-table-wrap">
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Extractions</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Latest processed invoices</div>
                        </div>
                        <Link to="/history" className="btn btn-secondary btn-sm">
                            View all <ArrowRight size={13} />
                        </Link>
                    </div>

                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Vendor</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentInvoices.length > 0 ? recentInvoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td style={{ fontWeight: 600 }}>{inv.invoice_number || '—'}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{inv.vendor_name || '—'}</td>
                                    <td style={{ color: 'var(--text-muted)' }}>{formatDate(inv.date)}</td>
                                    <td style={{ fontWeight: 700 }}>{formatCurrency(inv.total_amount)}</td>
                                    <td>
                                        {inv.status === 'processing' ? (
                                            <span className="badge badge-info">
                                                <Clock size={10} /> Processing
                                            </span>
                                        ) : inv.status === 'failed' ? (
                                            <span className="badge badge-danger">Failed</span>
                                        ) : (
                                            <span className="badge badge-success">
                                                <CheckCircle size={10} /> Ready
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <Link to={`/result/${inv.id}`} className="btn btn-ghost btn-sm">
                                            Review <ArrowRight size={12} />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon">
                                                <FileText size={24} />
                                            </div>
                                            <p style={{ fontWeight: 600, margin: '0 0 6px', color: 'var(--text-secondary)' }}>No invoices yet</p>
                                            <p style={{ fontSize: 13, margin: '0 0 14px' }}>Upload your first document to get started</p>
                                            <Link to="/upload" className="btn btn-primary btn-sm">
                                                <Upload size={13} /> Upload Document
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            <style>{`
                @media (max-width: 900px) {
                    .charts-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </motion.div>
    );
};

export default Dashboard;
