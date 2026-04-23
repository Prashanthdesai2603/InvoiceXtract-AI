/**
 * Validates invoice form data
 * @param {Object} data 
 * @returns {Object} errors
 */
export const validateInvoice = (data) => {
    const errors = {};

    if (!data.vendor_name || data.vendor_name.trim() === '') {
        errors.vendor_name = 'Vendor name is required';
    }

    if (!data.invoice_number || data.invoice_number.trim() === '') {
        errors.invoice_number = 'Invoice number is required';
    }

    if (!data.date) {
        errors.date = 'Date is required';
    }

    if (data.total_amount === undefined || data.total_amount === '' || isNaN(parseFloat(data.total_amount))) {
        errors.total_amount = 'Valid total amount is required';
    } else if (parseFloat(data.total_amount) < 0) {
        errors.total_amount = 'Amount cannot be negative';
    }

    return errors;
};

/**
 * Validates file for upload
 * @param {File} file 
 * @returns {string|null} error message or null
 */
export const validateFile = (file) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.ms-excel',
        'image/jpeg',
        'image/png',
        'image/jpg'
    ];
    
    const maxSize = 20 * 1024 * 1024; // 20MB

    if (!allowedTypes.includes(file.type)) {
        return 'Invalid file type. Please upload PDF, Word, Excel, or Image files.';
    }

    if (file.size > maxSize) {
        return 'File size exceeds 20MB limit.';
    }

    return null;
};
