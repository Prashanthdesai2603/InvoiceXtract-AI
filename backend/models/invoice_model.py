from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, JSON, func
from database.db import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_path = Column(String(500))  # Added for PDF Preview
    invoice_number = Column(String(100))
    order_id = Column(String(100), nullable=True)
    date = Column(Date)
    vendor_name = Column(String(255))
    customer_name = Column(String(255), nullable=True)
    document_type = Column(String(50), default="sales")
    total_amount = Column(Numeric(10, 2))
    sections_data = Column(JSON, nullable=True)  # Store multi-section breakdown
    
    # ✅ NEW: Zoho Sync Status Fields
    zoho_status = Column(String(50), default="pending")
    zoho_invoice_id = Column(String(100), nullable=True)
    zoho_message = Column(String(500), nullable=True)
    # ✅ NEW: Advanced Features
    confidence_score = Column(Integer, nullable=True) # 0-100
    category = Column(String(100), nullable=True)     # Office, Travel, etc.
    status = Column(String(50), default="completed")  # pending, processing, completed, failed
    current_step = Column(String(100), nullable=True)  # reading, extracting, validating, syncing, etc.
    logs = Column(JSON, nullable=True)                # Array of log objects {time, msg}
    file_hash = Column(String(64), nullable=True, index=True) # SHA-256 hash
    
    created_at = Column(DateTime, server_default=func.now())

