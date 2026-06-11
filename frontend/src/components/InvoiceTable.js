import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, deleteInvoice, bulkDeleteInvoices, downloadInvoiceFile, retryInvoice } from '../services/api';
import {
    Search,
    Filter,
    Download,
    FileSpreadsheet,
    Eye,
    ChevronLeft,
    ChevronRight,
    Building2,
    ArrowUpDown,
    Trash2,
    CheckCircle,
    AlertCircle,
    Clock,
    RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatDate } from '../utils/format';
import { toast } from 'react-toastify';
import Papa from 'papaparse';

const InvoiceTable = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);


    // Search and Filter State
    const [search, setSearch] = useState('');
    const [vendorFilter, setVendorFilter] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [amountRange, setAmountRange] = useState({ min: '', max: '' });
    const [showFilters, setShowFilters] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Selection State
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchInvoices = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const res = await getInvoices();
            setInvoices(res.data);
            
            // Check if any invoice is still "processing"
            const hasProcessing = res.data.some(inv => inv.status === 'processing');
            if (hasProcessing) {
                // Poll every 3 seconds if items are processing
                setTimeout(() => fetchInvoices(false), 3000);
            }
        } catch (err) {
            if (err.response?.status !== 401) {
                console.error(err);
                toast.error("Failed to load history.");
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            try {
                await deleteInvoice(id);
                toast.success('Invoice deleted successfully');
                setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
                fetchInvoices();
            } catch (err) {
                console.error(err);
                toast.error('Failed to delete invoice');
            }
        }
    };

    const handleRetry = async (id) => {
        try {
            await retryInvoice(id);
            toast.info('Retry started in background');
            fetchInvoices(false);
        } catch (err) {
            console.error(err);
            toast.error('Failed to start retry');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;

        if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected invoices? This action cannot be undone.`)) {
            try {
                await bulkDeleteInvoices(selectedIds);
                toast.success(`${selectedIds.length} invoices deleted successfully`);
                setSelectedIds([]);
                fetchInvoices();
            } catch (err) {
                console.error(err);
                toast.error('Failed to delete selected invoices');
            }
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(paginatedInvoices.map(inv => inv.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };



    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredInvoices = useMemo(() => {
        let filtered = invoices.filter(inv => {
            const matchesSearch =
                (inv.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
                    inv.vendor_name?.toLowerCase().includes(search.toLowerCase()));

            const matchesVendor = vendorFilter === '' || inv.vendor_name === vendorFilter;

            const matchesDate =
                (!dateRange.start || new Date(inv.date) >= new Date(dateRange.start)) &&
                (!dateRange.end || new Date(inv.date) <= new Date(dateRange.end));

            const amt = parseFloat(inv.total_amount) || 0;
            const matchesAmount =
                (!amountRange.min || amt >= parseFloat(amountRange.min)) &&
                (!amountRange.max || amt <= parseFloat(amountRange.max));

            return matchesSearch && matchesVendor && matchesDate && matchesAmount;
        });

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                if (sortConfig.key === 'total_amount') {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [invoices, search, vendorFilter, dateRange, amountRange, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(sortedAndFilteredInvoices.length / itemsPerPage);
    const paginatedInvoices = sortedAndFilteredInvoices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleExportCSV = () => {
        const csvData = sortedAndFilteredInvoices.map(inv => {
            const breakdown = inv.sections_data || [];
            const supplyTotal = breakdown.filter(s => s.type === 'SUPPLY').reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
            const serviceTotal = breakdown.filter(s => s.type === 'SERVICE').reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
            return {
                "Invoice Number": inv.invoice_number,
                "Vendor": inv.vendor_name,
                "Date": inv.date,
                "Total Amount": inv.total_amount,
                "Zoho Status": inv.zoho_status,
                "Zoho Invoice ID": inv.zoho_invoice_id,
                "Supply (SUPPLY)": supplyTotal || '',
                "Service/Handling (SERVICE)": serviceTotal || '',
                "Sections": breakdown.length || 1,
                "Status": inv.status || 'completed',
                "Category": inv.category || 'Others',
                "Confidence": inv.confidence_score ? `${inv.confidence_score}%` : 'N/A'
            };
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `invoices_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("CSV Export successful!");
    };

    const handleDownloadPDF = async (id, fileName) => {
        try {
            const response = await downloadInvoiceFile(id);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            toast.error("Failed to download file.");
        }
    };

    const uniqueVendors = useMemo(() => {
        return [...new Set(invoices.map(inv => inv.vendor_name).filter(Boolean))].sort();
    }, [invoices]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
            <div className="spinner spinner-dark" style={{ width: 28, height: 28, borderWidth: 3 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading invoices...</p>
        </div>
    );

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Invoice History</h1>
                    <p className="page-subtitle">{sortedAndFilteredInvoices.length} invoice{sortedAndFilteredInvoices.length !== 1 ? 's' : ''} total</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        <Filter size={15} />
                        Filters
                        {showFilters && <span className="badge" style={{ background: 'rgba(255,255,255,0.25)', color: 'white', borderColor: 'transparent', fontSize: 11 }}>On</span>}
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="btn btn-success"
                        disabled={sortedAndFilteredInvoices.length === 0}
                    >
                        <FileSpreadsheet size={15} />
                        Export CSV
                    </button>
                    <AnimatePresence>
                        {selectedIds.length > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={handleBulkDelete}
                                className="btn btn-danger"
                            >
                                <Trash2 size={15} />
                                Delete ({selectedIds.length})
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden', marginBottom: 16 }}
                    >
                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Vendor</label>
                                    <div className="input-with-icon">
                                        <Building2 size={14} className="input-icon-left" />
                                        <select
                                            className="form-input"
                                            style={{ paddingLeft: 36 }}
                                            value={vendorFilter}
                                            onChange={(e) => setVendorFilter(e.target.value)}
                                        >
                                            <option value="">All Vendors</option>
                                            {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Date From</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Date To</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Min Amount (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="form-input"
                                        value={amountRange.min}
                                        onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ margin: 0 }}>
                                    <label className="form-label">Max Amount (₹)</label>
                                    <input
                                        type="number"
                                        placeholder="Any"
                                        className="form-input"
                                        value={amountRange.max}
                                        onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div style={{ marginTop: 12, textAlign: 'right' }}>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: 'var(--danger-text)' }}
                                    onClick={() => {
                                        setVendorFilter('');
                                        setDateRange({ start: '', end: '' });
                                        setAmountRange({ min: '', max: '' });
                                    }}
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search */}
            <div className="search-bar" style={{ marginBottom: 16 }}>
                <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                    type="text"
                    placeholder="Search by Invoice # or Vendor name..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
            </div>

            {/* Table */}
            <div className="data-table-wrap">
                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 44, paddingLeft: 20 }}>
                                    <input
                                        type="checkbox"
                                        className="custom-checkbox"
                                        onChange={handleSelectAll}
                                        checked={paginatedInvoices.length > 0 && selectedIds.length === paginatedInvoices.length}
                                    />
                                </th>
                                <th>#</th>
                                <th>Status</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th className="sortable" onClick={() => handleSort('invoice_number')} style={{ minWidth: 140 }}>
                                    Invoice # <ArrowUpDown size={12} style={{ marginLeft: 4, opacity: 0.5 }} />
                                </th>
                                <th className="sortable" onClick={() => handleSort('vendor_name')} style={{ minWidth: 200 }}>
                                    Vendor <ArrowUpDown size={12} style={{ marginLeft: 4, opacity: 0.5 }} />
                                </th>
                                <th className="sortable" onClick={() => handleSort('date')} style={{ minWidth: 110 }}>
                                    Date <ArrowUpDown size={12} style={{ marginLeft: 4, opacity: 0.5 }} />
                                </th>
                                <th className="sortable" onClick={() => handleSort('total_amount')} style={{ minWidth: 120 }}>
                                    Amount <ArrowUpDown size={12} style={{ marginLeft: 4, opacity: 0.5 }} />
                                </th>
                                <th style={{ minWidth: 140 }}>Zoho Status</th>
                                <th style={{ minWidth: 140 }}>Sections</th>
                                <th style={{ textAlign: 'right', paddingRight: 20 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedInvoices.map((inv, index) => {
                                const slNo = (currentPage - 1) * itemsPerPage + index + 1;
                                const breakdown = inv.sections_data || [];
                                const sectionCount = breakdown.length;
                                const hasService = breakdown.some(s => s.type === 'SERVICE');
                                return (
                                    <tr key={inv.id} className={selectedIds.includes(inv.id) ? 'selected' : ''}>
                                        <td style={{ paddingLeft: 20 }}>
                                            <input
                                                type="checkbox"
                                                className="custom-checkbox"
                                                checked={selectedIds.includes(inv.id)}
                                                onChange={() => handleSelectOne(inv.id)}
                                            />
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{slNo}</td>
                                        <td>
                                            {inv.status === 'processing' ? (
                                                <span className="badge badge-info">
                                                    <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                                                    Processing
                                                </span>
                                            ) : inv.status === 'failed' ? (
                                                <span className="badge badge-danger">
                                                    <AlertCircle size={10} /> Failed
                                                </span>
                                            ) : (
                                                <span className="badge badge-success">
                                                    <CheckCircle size={10} /> Ready
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${inv.document_type === 'purchase' ? 'badge-neutral' : 'badge-brand'}`} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {inv.document_type || 'sales'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}>
                                            {inv.category || 'Others'}
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{inv.invoice_number || '—'}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{inv.vendor_name || '—'}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(inv.date)}</td>
                                        <td style={{ fontWeight: 700 }}>{formatCurrency(inv.total_amount)}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {inv.zoho_status === 'synced' && (
                                                    <span className="badge badge-success"><CheckCircle size={10} /> Synced</span>
                                                )}
                                                {inv.zoho_status === 'pending' && (
                                                    <span className="badge badge-warning"><Clock size={10} /> Pending</span>
                                                )}
                                                {inv.zoho_status === 'failed' && (
                                                    <span className="badge badge-danger" title={`Failure: ${inv.zoho_message || 'Unknown'}`} style={{ cursor: 'help' }}>
                                                        <AlertCircle size={10} /> Failed
                                                    </span>
                                                )}
                                                {inv.zoho_invoice_id && (
                                                    <a
                                                        href={`https://books.zoho.in/app#/${inv.document_type === 'purchase' ? 'bills' : 'invoices'}/${inv.zoho_invoice_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{ color: 'var(--brand-500)', fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                                                        title="View in Zoho Books"
                                                    >
                                                        <Eye size={11} /> Zoho
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {sectionCount > 1 ? (
                                                <span className="badge badge-brand">
                                                    {sectionCount} {hasService ? '· SUPPLY+SERVICE' : 'sections'}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: 16 }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                                {(inv.status === 'failed' || inv.zoho_status === 'failed') && (
                                                    <button
                                                        className="btn btn-ghost btn-icon"
                                                        title="Retry Processing"
                                                        onClick={() => handleRetry(inv.id)}
                                                        style={{ color: 'var(--warning-text)' }}
                                                    >
                                                        <RefreshCw size={14} />
                                                    </button>
                                                )}
                                                <Link to={`/result/${inv.id}`} className="btn btn-ghost btn-icon" title="View Details">
                                                    <Eye size={14} />
                                                </Link>
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    title="Download PDF"
                                                    onClick={() => handleDownloadPDF(inv.id, inv.file_name)}
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-icon"
                                                    title="Delete Invoice"
                                                    style={{ color: 'var(--danger-text)' }}
                                                    onClick={() => handleDelete(inv.id)}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={12}>
                                        <div className="empty-state">
                                            <div className="empty-state-icon">
                                                <Search size={22} />
                                            </div>
                                            <p style={{ fontWeight: 600, margin: '0 0 4px', color: 'var(--text-secondary)' }}>
                                                No matching invoices
                                            </p>
                                            <p style={{ fontSize: 13, margin: 0 }}>
                                                Try adjusting your filters or search terms
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div style={{
                        padding: '14px 20px',
                        borderTop: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-subtle)',
                        gap: 12,
                        flexWrap: 'wrap'
                    }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, sortedAndFilteredInvoices.length)} of {sortedAndFilteredInvoices.length}
                        </span>
                        <div className="pagination">
                            <button
                                className="page-btn"
                                onClick={() => setCurrentPage(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {[...Array(Math.min(totalPages, 7))].map((_, i) => {
                                const page = i + 1;
                                return (
                                    <button
                                        key={page}
                                        className={`page-btn ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            {totalPages > 7 && <span style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>}
                            <button
                                className="page-btn"
                                onClick={() => setCurrentPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                .sortable { cursor: pointer; }
                .sortable:hover { color: var(--text-primary) !important; }
            `}</style>
        </motion.div>
    );
};

export default InvoiceTable;
