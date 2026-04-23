import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoice, saveInvoice, deleteInvoice } from '../services/api';
import { toast } from 'react-toastify';
import { ArrowLeft, Share2, ClipboardCheck } from 'lucide-react';
import { motion } from 'framer-motion';

import ResultForm from './ResultForm';
import PDFPreview from './PDFPreview';

const ResultView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await getInvoice(id);
                setData(res.data);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load invoice data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSave = async (updatedData) => {
        setSaving(true);
        try {
            // Ensure ID is present in updatedData for the /save endpoint
            const payload = { ...updatedData, id: id };
            const response = await saveInvoice(payload);
            
            // Update local state with the response from server (which includes Zoho status)
            setData(response.data);
            toast.success('Invoice Saved & Synced Successfully! 💾');
            
            // Optionally redirect after save
            setTimeout(() => navigate('/history'), 1500);
        } catch (err) {
            console.error(err);
            toast.error("Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
            return;
        }

        setSaving(true); // Using saving state for deletion too
        try {
            await deleteInvoice(id);
            toast.success('Invoice deleted successfully! 🗑️');
            navigate('/history');
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete invoice.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
            <div className="spinner-border text-primary mb-4" role="status" style={{ width: '3rem', height: '3rem' }}></div>
            <h4 className="fw-semibold text-muted">Retrieving extracted data...</h4>
        </div>
    );

    if (!data) return (
        <div className="container mt-5 text-center py-5 glass-card">
            <h3 className="text-danger">Invoice not found</h3>
            <p>The document you are looking for might have been deleted.</p>
            <button className="btn btn-primary" onClick={() => navigate('/history')}>Go to History</button>
        </div>
    );

    return (
        <div className="container-fluid py-4 min-vh-100 bg-transparent">
            <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 px-2"
            >
                <div>
                    <button onClick={() => navigate(-1)} className="btn btn-link text-muted p-0 text-decoration-none d-flex align-items-center mb-1">
                        <ArrowLeft size={16} className="me-1" /> Back to Dashboard
                    </button>
                    <h2 className="fw-bold mb-0 d-flex align-items-center">
                        <ClipboardCheck className="text-primary me-2" />
                        Verification Pipeline
                    </h2>
                </div>
                <div className="d-flex gap-3">
                    <button className="btn btn-outline-secondary d-flex align-items-center rounded-pill px-3">
                        <Share2 size={18} className="me-2" /> Share
                    </button>
                </div>
            </motion.div>

            <div className="row g-4">
                {/* LEFT SIDE: PDF PREVIEW */}
                <div className="col-lg-7">
                    <PDFPreview 
                        invoiceId={id} 
                        fileName={data.file_name} 
                    />
                </div>

                {/* RIGHT SIDE: SMART FORM */}
                <div className="col-lg-5">
                    <ResultForm 
                        initialData={data} 
                        onSave={handleSave} 
                        onDelete={handleDelete}
                        saving={saving} 
                    />
                </div>
            </div>
        </div>
    );
};

export default ResultView;
