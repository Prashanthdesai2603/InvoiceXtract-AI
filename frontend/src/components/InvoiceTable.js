import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, deleteInvoice, bulkDeleteInvoices, PDF_VIEW_URL, downloadInvoiceFile } from '../services/api';
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
    Clock
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
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const res = await getInvoices();
            setInvoices(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load history.");
        } finally {
            setLoading(false);
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
                "Status": inv.total_amount ? "Processed" : "Pending"
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
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
            <div className="spinner-border text-primary"></div>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-4"
        >
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <h2 className="fw-bold mb-0">Invoice History</h2>
                <div className="d-flex gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`btn d-flex align-items-center ${showFilters ? 'btn-primary' : 'btn-outline-secondary'}`}
                    >
                        <Filter size={18} className="me-2" /> Filters
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="btn btn-outline-success d-flex align-items-center"
                        disabled={sortedAndFilteredInvoices.length === 0}
                    >
                        <FileSpreadsheet size={18} className="me-2" /> Export CSV
                    </button>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="btn btn-danger d-flex align-items-center"
                        >
                            <Trash2 size={18} className="me-2" /> Delete ({selectedIds.length})
                        </button>
                    )}
                </div>
            </div>

            {/* Filters Section */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-4"
                    >
                        <div className="card glass-card p-4">
                            <div className="row g-3">
                                <div className="col-md-3">
                                    <label className="form-label small fw-bold text-uppercase">Vendor</label>
                                    <div className="input-group input-group-sm">
                                        <span className="input-group-text bg-transparent border-end-0"><Building2 size={14} /></span>
                                        <select
                                            className="form-select border-start-0"
                                            value={vendorFilter}
                                            onChange={(e) => setVendorFilter(e.target.value)}
                                        >
                                            <option value="">All Vendors</option>
                                            {uniqueVendors.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="col-md-5">
                                    <label className="form-label small fw-bold text-uppercase">Date Range</label>
                                    <div className="d-flex gap-2">
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        />
                                        <span className="align-self-center text-muted">-</span>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label small fw-bold text-uppercase">Amount Range</label>
                                    <div className="d-flex gap-2">
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-transparent border-end-0">₹</span>
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                className="form-control border-start-0"
                                                value={amountRange.min}
                                                onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
                                            />
                                        </div>
                                        <span className="align-self-center text-muted">-</span>
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-transparent border-end-0">₹</span>
                                            <input
                                                type="number"
                                                placeholder="Max"
                                                className="form-control border-start-0"
                                                value={amountRange.max}
                                                onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 text-end">
                                    <button
                                        className="btn btn-link text-muted btn-sm"
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
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Bar */}
            <div className="card glass-card mb-4 p-2 bg-white bg-opacity-50">
                <div className="input-group">
                    <span className="input-group-text bg-transparent border-0"><Search size={18} className="text-muted" /></span>
                    <input
                        type="text"
                        className="form-control border-0 bg-transparent"
                        placeholder="Search by Invoice #, Vendor Name..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="card glass-card overflow-hidden shadow-sm">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light bg-opacity-75">
                            <tr>
                                <th className="ps-4 py-3 border-0" style={{ width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        className="form-check-input cursor-pointer"
                                        onChange={handleSelectAll}
                                        checked={paginatedInvoices.length > 0 && selectedIds.length === paginatedInvoices.length}
                                    />
                                </th>
                                <th className="py-3 border-0">Sl. No.</th>
                                <th className="py-3 border-0 cursor-pointer" onClick={() => handleSort('invoice_number')}>
                                    <div className="d-flex align-items-center">
                                        Invoice # <ArrowUpDown size={14} className="ms-1 opacity-50" />
                                    </div>
                                </th>
                                <th className="py-3 border-0 cursor-pointer" onClick={() => handleSort('vendor_name')}>
                                    <div className="d-flex align-items-center">
                                        Vendor <ArrowUpDown size={14} className="ms-1 opacity-50" />
                                    </div>
                                </th>
                                <th className="py-3 border-0 cursor-pointer" onClick={() => handleSort('date')}>
                                    <div className="d-flex align-items-center">
                                        Date <ArrowUpDown size={14} className="ms-1 opacity-50" />
                                    </div>
                                </th>
                                <th className="py-3 border-0 cursor-pointer" onClick={() => handleSort('total_amount')}>
                                    <div className="d-flex align-items-center">
                                        Amount <ArrowUpDown size={14} className="ms-1 opacity-50" />
                                    </div>
                                </th>
                                <th className="py-3 border-0">Zoho Status</th>
                                <th className="py-3 border-0">Sections</th>
                                <th className="text-end pe-4 py-3 border-0">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedInvoices.map((inv, index) => {
                                const slNo = (currentPage - 1) * itemsPerPage + index + 1;
                                const breakdown = inv.sections_data || [];
                                const sectionCount = breakdown.length;
                                const hasService = breakdown.some(s => s.type === 'SERVICE');
                                return (
                                    <tr key={inv.id} className={selectedIds.includes(inv.id) ? 'table-active' : ''}>
                                        <td className="ps-4">
                                            <input
                                                type="checkbox"
                                                className="form-check-input cursor-pointer"
                                                checked={selectedIds.includes(inv.id)}
                                                onChange={() => handleSelectOne(inv.id)}
                                            />
                                        </td>
                                        <td className="text-muted small">{slNo}</td>
                                        <td className="fw-medium">{inv.invoice_number || '---'}</td>
                                        <td>{inv.vendor_name || '---'}</td>
                                        <td className="text-muted">{formatDate(inv.date)}</td>
                                        <td className="fw-bold">{formatCurrency(inv.total_amount)}</td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                {inv.zoho_status === "synced" && (
                                                    <span
                                                        className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 d-inline-flex align-items-center"
                                                        title={inv.zoho_message}
                                                        style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                                    >
                                                        <CheckCircle size={12} className="me-1" /> Synced
                                                    </span>
                                                )}
                                                {inv.zoho_status === "pending" && (
                                                    <span
                                                        className="badge bg-warning bg-opacity-10 text-warning border border-warning border-opacity-25 d-inline-flex align-items-center"
                                                        title={inv.zoho_message}
                                                        style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                                    >
                                                        <Clock size={12} className="me-1" /> Pending
                                                    </span>
                                                )}
                                                {inv.zoho_status === "failed" && (
                                                    <span
                                                        className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 d-inline-flex align-items-center"
                                                        title={inv.zoho_message}
                                                        style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                                                    >
                                                        <AlertCircle size={12} className="me-1" /> Failed
                                                    </span>
                                                )}

                                                {inv.zoho_invoice_id && (
                                                    <a
                                                        href={`https://books.zoho.in/app#/invoices/${inv.zoho_invoice_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-primary d-flex align-items-center text-decoration-none small"
                                                        title="View in Zoho Books"
                                                    >
                                                        <Eye size={12} className="me-1" /> Zoho
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {sectionCount > 1 ? (
                                                <span className="badge rounded-pill" style={{
                                                    background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(20,184,166,0.15))',
                                                    color: '#4f46e5',
                                                    border: '1px solid rgba(99,102,241,0.3)',
                                                    fontWeight: 700,
                                                    fontSize: '0.7rem',
                                                    padding: '4px 10px'
                                                }}>
                                                    {sectionCount} {hasService ? '· SUPPLY+SERVICE' : 'sections'}
                                                </span>
                                            ) : (
                                                <span className="text-muted small">—</span>
                                            )}
                                        </td>
                                        <td className="text-end pe-4">
                                            <div className="d-flex justify-content-end gap-1">

                                                <Link to={`/result/${inv.id}`} className="btn btn-sm btn-outline-primary rounded-circle p-2" title="View Details">
                                                    <Eye size={16} />
                                                </Link>
                                                <button
                                                    className="btn btn-sm btn-outline-secondary rounded-circle p-2"
                                                    title="Download PDF"
                                                    onClick={() => handleDownloadPDF(inv.id, inv.file_name)}
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger rounded-circle p-2"
                                                    title="Delete Invoice"
                                                    onClick={() => handleDelete(inv.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {paginatedInvoices.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="text-center py-5">
                                        <div className="text-muted py-4">
                                            <p className="fs-4 mb-0">No matching invoices found</p>
                                            <p className="small">Try adjusting your filters or search terms</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="card-footer bg-white py-3 d-flex justify-content-between align-items-center">
                        <span className="text-muted small">
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedAndFilteredInvoices.length)} of {sortedAndFilteredInvoices.length} entries
                        </span>
                        <nav>
                            <ul className="pagination pagination-sm mb-0">
                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(currentPage - 1)}>
                                        <ChevronLeft size={16} />
                                    </button>
                                </li>
                                {[...Array(totalPages)].map((_, i) => (
                                    <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setCurrentPage(i + 1)}>{i + 1}</button>
                                    </li>
                                ))}
                                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setCurrentPage(currentPage + 1)}>
                                        <ChevronRight size={16} />
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .cursor-pointer { cursor: pointer; }
                .pagination .page-link { border: none; color: #64748b; margin: 0 2px; border-radius: 6px; }
                .pagination .page-item.active .page-link { background: var(--primary-gradient); color: white; }
            `}} />
        </motion.div>
    );
};

export default InvoiceTable;
