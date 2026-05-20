import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadInvoices } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Upload, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProcessingOverlay from './AI/ProcessingOverlay';
import { validateFile } from '../utils/validation';
import { formatFileSize } from '../utils/format';

const UploadForm = () => {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [currentStep, setCurrentStep] = useState('uploading');
    const [status, setStatus] = useState('pending');
    const [processingResults, setProcessingResults] = useState([]);
    const navigate = useNavigate();

    const onDrop = useCallback((acceptedFiles) => {
        const newFiles = [...files];
        
        acceptedFiles.forEach(f => {
            const error = validateFile(f);
            if (error) {
                toast.error(`${f.name}: ${error}`);
            } else if (newFiles.find(existing => existing.name === f.name && existing.size === f.size)) {
                toast.info(`${f.name} is already selected`);
            } else if (newFiles.length >= 100) {
                toast.warning("Maximum 100 files allowed");
            } else {
                newFiles.push(f);
            }
        });

        setFiles(newFiles);
        setStatus('pending');
    }, [files]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/msword': ['.doc'],
            'application/vnd.ms-excel': ['.xls'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png']
        },
        maxFiles: 100
    });

    const handleUpload = async () => {
        if (files.length === 0) return;

        setUploading(true);
        setCurrentStep('uploading');
        setStatus('active');

        try {
            const response = await uploadInvoices(files);
            const results = response.data;
            setProcessingResults(results);

            const failures = results.filter(r => r.status === 'failed');
            const successes = results.filter(r => r.status === 'processing' || r.status === 'success');
            const duplicates = results.filter(r => r.status === 'duplicate');

            if (duplicates.length > 0) {
                duplicates.forEach(d => toast.info(`${d.file}: ${d.error}`));
            }

            if (failures.length > 0) {
                toast.warning(`${successes.length} uploaded, ${failures.length} failed, ${duplicates.length} skipped.`);
            } else if (duplicates.length > 0 && successes.length === 0) {
                toast.info(`No new invoices uploaded. ${duplicates.length} duplicates detected.`);
                setTimeout(() => navigate('/history'), 2000);
            } else {
                // For bulk, we stay on the overlay to show real-time progress
                // The ProcessingOverlay now handles completion UI
                if (files.length === 1) {
                    setTimeout(() => {
                        setCurrentStep('completed');
                        setStatus('completed');
                        toast.success(`Successfully uploaded invoice! ✅`);
                        setTimeout(() => navigate('/history'), 1500);
                    }, 5000); // Give some time for the single file to process
                }
            }

        } catch (error) {
            console.error('Upload error:', error);
            setStatus('failed');
            setUploading(false);
            toast.error('Extraction Failed ❌ - ' + (error.response?.data?.detail || 'Server error'));
        }
    };

    const removeFile = (index, e) => {
        e.stopPropagation();
        const newFiles = [...files];
        newFiles.splice(index, 1);
        setFiles(newFiles);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="container py-5"
        >
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card glass-card p-4 p-md-5">
                        <div className="text-center mb-5">
                            <h2 className="fw-bold mb-2">Upload Your Invoices</h2>
                            <p className="text-muted">Process up to 100 documents at once with our powerful AI</p>
                        </div>

                        {!uploading ? (
                            <div className="upload-container">
                                <div 
                                    {...getRootProps()} 
                                    className={`dropzone ${isDragActive ? 'dropzone-active' : ''} mb-4`}
                                >
                                    <input {...getInputProps()} />
                                    <div className="d-flex flex-column align-items-center">
                                        <div className="bg-primary bg-opacity-10 p-4 rounded-circle mb-3">
                                            <Upload className="text-primary" size={40} />
                                        </div>
                                        {isDragActive ? (
                                            <p className="fs-5 fw-semibold text-primary">Drop them here!</p>
                                        ) : (
                                            <>
                                                <p className="fs-5 fw-semibold mb-1">Drag & drop your invoices here</p>
                                                <p className="text-muted small">Supports PDF, Word, Excel, Images (Max 100 files, 20MB each)</p>
                                                <button className="btn btn-outline-primary mt-2">Browse Files</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {files.length > 0 && (
                                        <div className="selected-files-list mb-4">
                                            <p className="small fw-bold text-muted text-uppercase mb-2">Selected Files ({files.length}/100)</p>
                                            {files.map((f, idx) => (
                                                <motion.div 
                                                    key={`${f.name}-${idx}`}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: 10 }}
                                                    className="selected-file bg-light p-2 rounded-3 d-flex align-items-center justify-content-between mb-2 border"
                                                >
                                                    <div className="d-flex align-items-center">
                                                        <div className="bg-white p-2 rounded border transition-all duration-300">
                                                            <FileText className="text-primary" size={18} />
                                                        </div>
                                                        <div className="ms-3">
                                                            <p className="mb-0 fw-semibold text-truncate small" style={{ maxWidth: '250px' }}>{f.name}</p>
                                                            <p className="mb-0 text-muted extra-small">{formatFileSize(f.size)}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        className="btn btn-link text-danger p-0 d-flex align-items-center border-0" 
                                                        onClick={(e) => removeFile(idx, e)}
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </AnimatePresence>

                                <button 
                                    className="btn btn-primary btn-lg w-100 py-3 fw-bold shadow-sm"
                                    disabled={files.length === 0}
                                    onClick={handleUpload}
                                >
                                    Start Bulk AI Extraction
                                </button>
                            </div>
                        ) : (
                            <ProcessingOverlay 
                                currentStep={currentStep} 
                                status={status} 
                                files={files} 
                                processingResults={processingResults}
                                onRetry={() => { setUploading(false); setStatus('pending'); setProcessingResults([]); }} 
                            />
                        )}
                    </div>
                </div>
            </div>
            
            {/* Background File Preview (Blurred) */}
            {uploading && files.length > 0 && (
                <div 
                    className="position-fixed top-0 start-0 w-100 h-100" 
                    style={{ 
                        zIndex: -2, 
                        opacity: 0.3, 
                        filter: 'blur(10px)',
                        pointerEvents: 'none'
                    }}
                >
                    {files[0].type.startsWith('image/') ? (
                        <img 
                            src={URL.createObjectURL(files[0])} 
                            alt="preview" 
                            className="w-100 h-100" 
                            style={{ objectFit: 'cover' }} 
                        />
                    ) : (
                        <div className="w-100 h-100 bg-light d-flex align-items-center justify-content-center">
                            <FileText size={400} className="text-primary opacity-10" />
                        </div>
                    )}
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                .selected-file {
                    border: 1px solid #e2e8f0;
                }
                .selected-files-list {
                    max-height: 300px;
                    overflow-y: auto;
                    padding-right: 5px;
                }
                .selected-files-list::-webkit-scrollbar {
                    width: 5px;
                }
                .selected-files-list::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                }
            `}} />
        </motion.div>
    );
};

export default UploadForm;
