from sqlalchemy import Column, Integer, String, Date, Numeric, DateTime, JSON, func
from database.db import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_path = Column(String(500))  # Added for PDF Preview
    invoice_number = Column(String(100))
    date = Column(Date)
    vendor_name = Column(String(255))
    total_amount = Column(Numeric(10, 2))
    sections_data = Column(JSON, nullable=True)  # Store multi-section breakdown
    
    # ✅ NEW: Zoho Sync Status Fields
    zoho_status = Column(String(50), default="pending")
    zoho_invoice_id = Column(String(100), nullable=True)
    zoho_message = Column(String(500), nullable=True)
    document_type = Column(String(50), default="sales") # sales or purchase

    created_at = Column(DateTime, server_default=func.now())

