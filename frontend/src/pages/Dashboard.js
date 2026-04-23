import React, { useState, useEffect } from 'react';
import { getInvoices } from '../services/api';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    FileText,
    IndianRupee,
    ArrowRight,
    LayoutDashboard,
    PieChart as PieChartIcon,
    BarChart3,
    ClipboardCheck,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate } from '../utils/format';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Dashboard = () => {
    const [stats, setStats] = useState({ count: 0, totalAmount: 0 });
    const [recentInvoices, setRecentInvoices] = useState([]);
    const [chartData, setChartData] = useState({ bar: null, pie: null });
    const [loading, setLoading] = useState(true);


    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getInvoices();
            const data = res.data;

            // Basic Stats
            const total = data.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
            setStats({ count: data.length, totalAmount: total });
            setRecentInvoices(data.slice(0, 5));

            // ... chart processing logic ...
            processChartData(data);
        } catch (error) {
            console.error("Dashboard data fetch error:", error);
            toast.error("Failed to fetch dashboard data");
        } finally {
            setLoading(false);
        }
    };

    const processChartData = (data) => {
        // Process Bar Chart Data (Monthly count)
        const monthCounts = {};
        data.forEach(inv => {
            if (!inv.date) return;
            const date = new Date(inv.date);
            const month = date.toLocaleString('default', { month: 'short' });
            monthCounts[month] = (monthCounts[month] || 0) + 1;
        });

        const barData = {
            labels: Object.keys(monthCounts),
            datasets: [{
                label: 'Invoices per Month',
                data: Object.values(monthCounts),
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: '#6366f1',
                borderWidth: 1,
                borderRadius: 5,
            }]
        };

        // Process Pie Chart Data (Vendor distribution)
        const vendorCounts = {};
        data.forEach(inv => {
            const vendor = inv.vendor_name || 'Unknown';
            vendorCounts[vendor] = (vendorCounts[vendor] || 0) + 1;
        });

        const sortedVendors = Object.entries(vendorCounts)
            .sort(([, a], [, b]) => b - a);

        const topVendors = sortedVendors.slice(0, 5);
        const otherCount = sortedVendors.slice(5).reduce((sum, [, count]) => sum + count, 0);

        if (otherCount > 0) topVendors.push(['Others', otherCount]);

        const pieData = {
            labels: topVendors.map(([name]) => name),
            datasets: [{
                data: topVendors.map(([, count]) => count),
                backgroundColor: [
                    'rgba(99, 102, 241, 0.7)',
                    'rgba(168, 85, 247, 0.7)',
                    'rgba(236, 72, 153, 0.7)',
                    'rgba(244, 63, 94, 0.7)',
                    'rgba(249, 115, 22, 0.7)',
                    'rgba(100, 116, 139, 0.7)',
                ],
                borderWidth: 1,
            }]
        };

        setChartData({ bar: barData, pie: pieData });
    };

    useEffect(() => {
        fetchData();
    }, []);



    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    if (loading) return (
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <div className="spinner-border text-primary"></div>
        </div>
    );

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="py-4"
        >
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold mb-0 d-flex align-items-center">
                    <LayoutDashboard className="me-2 text-primary" />
                    Analytics Dashboard
                </h2>
                <Link to="/upload" className="btn btn-primary d-flex align-items-center px-4 fw-bold shadow-sm">
                    <FileText size={18} className="me-2" /> New Upload
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="row g-4 mb-5">
                <motion.div variants={itemVariants} className="col-md-6 col-lg-3">
                    <div className="card glass-card h-100 p-3 stat-card shadow-sm border-0">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <p className="text-muted small fw-bold text-uppercase mb-1">Total Invoices</p>
                                <h3 className="fw-bold mb-0">{stats.count}</h3>
                            </div>
                            <div className="bg-primary bg-opacity-10 p-2 rounded">
                                <FileText className="text-primary" size={24} />
                            </div>
                        </div>
                        <div className="mt-3 small text-success d-flex align-items-center">
                            <TrendingUp size={14} className="me-1" />
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="col-md-6 col-lg-3">
                    <div className="card glass-card h-100 p-3 stat-card shadow-sm border-0">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <p className="text-muted small fw-bold text-uppercase mb-1">Total Amount</p>
                                <h3 className="fw-bold mb-0">{formatCurrency(stats.totalAmount)}</h3>
                            </div>
                            <div className="bg-success bg-opacity-10 p-2 rounded">
                                <IndianRupee className="text-success" size={24} />
                            </div>
                        </div>
                        <div className="mt-3 small text-success d-flex align-items-center">
                            <TrendingUp size={14} className="me-1" />
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="col-md-6 col-lg-3">
                    <div className="card glass-card h-100 p-3 stat-card shadow-sm border-0">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <p className="text-muted small fw-bold text-uppercase mb-1">Processed</p>
                                <h3 className="fw-bold mb-0">{stats.count}</h3>
                            </div>
                            <div className="bg-info bg-opacity-10 p-2 rounded">
                                <ClipboardCheck size={24} className="text-info" />
                            </div>
                        </div>
                        <div className="mt-3 small text-muted">100% processing rate</div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="row g-4 mb-5">
                <motion.div variants={itemVariants} className="col-lg-8">
                    <div className="card glass-card p-4 h-100 shadow-sm border-0">
                        <h5 className="fw-bold mb-4 d-flex align-items-center">
                            <BarChart3 size={20} className="text-primary me-2" />
                            Monthly Volume
                        </h5>
                        <div style={{ height: '300px' }}>
                            {chartData.bar ? (
                                <Bar
                                    data={chartData.bar}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            y: { beginAtZero: true, grid: { display: false } },
                                            x: { grid: { display: false } }
                                        }
                                    }}
                                />
                            ) : (
                                <div className="h-100 d-flex align-items-center justify-content-center text-muted">No data available</div>
                            )}
                        </div>
                    </div>
                </motion.div>
                <motion.div variants={itemVariants} className="col-lg-4">
                    <div className="card glass-card p-4 h-100 shadow-sm border-0">
                        <h5 className="fw-bold mb-4 d-flex align-items-center">
                            <PieChartIcon size={20} className="text-secondary me-2" />
                            Vendor Distribution
                        </h5>
                        <div style={{ height: '300px' }}>
                            {chartData.pie ? (
                                <Pie
                                    data={chartData.pie}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6 } } }
                                    }}
                                />
                            ) : (
                                <div className="h-100 d-flex align-items-center justify-content-center text-muted">No data available</div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Recent Invoices Table */}
            <motion.div variants={itemVariants} className="card glass-card overflow-hidden shadow-sm border-0">
                <div className="card-header bg-white bg-opacity-10 py-3 d-flex justify-content-between align-items-center border-0">
                    <h5 className="mb-0 fw-bold">Recent Extractions</h5>
                    <Link to="/history" className="text-primary text-decoration-none small fw-bold d-flex align-items-center">
                        View All <ArrowRight size={14} className="ms-1" />
                    </Link>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light bg-opacity-50">
                            <tr>
                                <th className="ps-4 border-0">Invoice #</th>
                                <th className="border-0">Vendor</th>
                                <th className="border-0">Date</th>
                                <th className="border-0">Amount</th>

                                <th className="text-end pe-4 border-0">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentInvoices.map((inv) => (
                                <tr key={inv.id}>
                                    <td className="ps-4 fw-medium">{inv.invoice_number || '---'}</td>
                                    <td>{inv.vendor_name || '---'}</td>
                                    <td>{formatDate(inv.date)}</td>
                                    <td className="fw-bold">{formatCurrency(inv.total_amount)}</td>

                                    <td className="text-end pe-4">
                                        <div className="d-flex justify-content-end gap-2">
                                            <Link to={`/result/${inv.id}`} className="btn btn-sm btn-light border">Review</Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {recentInvoices.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <div className="mb-2">No invoices processed yet.</div>
                                        <Link to="/upload" className="btn btn-sm btn-primary">Upload First Document</Link>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default Dashboard;
