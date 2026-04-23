import React, { useState, useEffect } from 'react';
import { FileText, Expand, Download, Loader2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { PDF_VIEW_URL, downloadInvoiceFile } from '../services/api';

const PDFPreview = ({ invoiceId, fileName }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        const fetchPreview = async () => {
            setLoading(true);
            setError(false);
            try {
                const response = await downloadInvoiceFile(invoiceId);
                const blob = new Blob([response.data], { type: response.headers['content-type'] });
                const url = window.URL.createObjectURL(blob);
                setPreviewUrl(url);
            } catch (err) {
                console.error("Error fetching PDF preview:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        if (invoiceId) {
            fetchPreview();
        }

        return () => {
            if (previewUrl) {
                window.URL.revokeObjectURL(previewUrl);
            }
        };
    }, [invoiceId]);

    const handleDownload = () => {
        if (!previewUrl) return;
        const link = document.createElement('a');
        link.href = previewUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card glass-card border-0 h-100 flex-column"
        >
            <div className="card-header bg-white bg-opacity-10 border-bottom py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0 fw-bold d-flex align-items-center">
                    <FileText size={20} className="text-danger me-2" />
                    Document Preview
                </h5>
                <div className="d-flex gap-2">
                    <button 
                        onClick={handleDownload} 
                        className="btn btn-sm btn-outline-secondary rounded-pill px-3 d-flex align-items-center"
                        disabled={!previewUrl}
                    >
                        <Download size={14} className="me-1" /> Download
                    </button>
                </div>
            </div>
            <div className="card-body p-0 position-relative flex-grow-1 overflow-hidden" style={{ minHeight: '600px' }}>
                {loading && !error && (
                    <div className="position-absolute top-50 start-50 translate-middle text-center z-index-10">
                        <Loader2 className="spinner-border text-primary mb-3" size={40} style={{ animation: 'spin 1.5s linear infinite' }} />
                        <p className="text-muted fw-medium">Loading document...</p>
                    </div>
                )}
                
                {error ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-4">
                        <AlertTriangle size={48} className="text-warning mb-3" />
                        <h5 className="fw-bold">Preview Unavailable</h5>
                        <p className="text-muted">We couldn't load the PDF preview. You can still download the file to view it.</p>
                    </div>
                ) : (
                    <iframe 
                        src={`${previewUrl}#toolbar=0`}
                        width="100%" 
                        height="100%" 
                        onLoad={() => setLoading(false)}
                        onError={() => { setLoading(false); setError(true); }}
                        className="border-0"
                        title="Invoice Preview"
                    />
                )}
            </div>
            <div className="card-footer bg-light bg-opacity-50 border-0 py-2">
                <div className="text-center small text-muted font-monospace">
                    {fileName}
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </motion.div>
    );
};

export default PDFPreview;
