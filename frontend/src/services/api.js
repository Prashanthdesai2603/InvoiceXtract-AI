import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to add the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to handle unauthorized errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('userData');
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/' && window.location.pathname !== '/signup') {
                window.location.href = '/';
            }
        }
        return Promise.reject(error);
    }
);

/**
 * Upload one or multiple invoices
 */
export const uploadInvoices = (files) => {
    const formData = new FormData();
    if (Array.isArray(files)) {
        files.forEach((file) => formData.append('files', file));
    } else {
        formData.append('files', files); 
    }
    
    return api.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

/**
 * Get all invoices
 */
export const getInvoices = () => {
    return api.get('/invoices');
};

/**
 * Get a single invoice by ID
 */
export const getInvoice = (id) => {
    return api.get(`/invoice/${id}`);
};

/**
 * Update invoice details
 */
export const updateInvoice = (id, data) => {
    return api.put(`/invoice/${id}`, data);
};

/**
 * Save/Update invoice details (New sync endpoint)
 */
export const saveInvoice = (data) => {
    return api.post('/invoice/save', data);
};

/**
 * Delete an invoice
 */
export const deleteInvoice = (id) => {
    return api.delete(`/invoice/${id}`);
};

/**
 * Delete multiple invoices
 */
export const bulkDeleteInvoices = (ids) => {
    return api.post('/invoices/bulk-delete', ids);
};



/**
 * Authentication
 */
export const loginUser = (credentials) => {
    return api.post('/auth/login', credentials);
};

export const signupUser = (userData) => {
    return api.post('/auth/signup', userData);
};

/**
 * Export invoices as blob
 */
export const exportInvoices = () => {
    return api.get('/export', { responseType: 'blob' });
};

/**
 * Download invoice file (PDF/Image)
 */
export const downloadInvoiceFile = (id) => {
    return api.get(`/file/${id}`, { responseType: 'blob' });
};

// Base URL for viewing PDFs (direct link)
export const PDF_VIEW_URL = `${API_BASE_URL}/file`;

export default api;
