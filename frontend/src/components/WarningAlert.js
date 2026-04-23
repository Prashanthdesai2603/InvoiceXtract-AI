import React from 'react';

const WarningAlert = ({ warnings }) => {
    if (!warnings || warnings.length === 0) return null;

    return (
        <div className="alert alert-warning shadow-sm mb-4" role="alert">
            <div className="d-flex align-items-center">
                <i className="bi bi-exclamation-triangle-fill flex-shrink-0 me-2"></i>
                <div>
                    <h6 className="alert-heading fw-bold mb-1">Extraction Warnings</h6>
                    <ul className="mb-0 small">
                        {warnings.map((warning, index) => (
                            <li key={index}>{warning}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default WarningAlert;
