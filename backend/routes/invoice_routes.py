from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from datetime import datetime
from sqlalchemy.orm import Session
from database.db import get_db
from models.invoice_model import Invoice
from services.file_parser import FileParser
from services.ocr_service import OCRService
from services.gemini_service import GeminiService
from services.validation_service import ValidationService
from services.file_service import FileService
from utils.auth import get_current_user
from models.user_model import User


from services.zoho_service import create_invoice, update_zoho_invoice, create_bill, update_zoho_bill, delete_zoho_invoice, delete_zoho_bill
from utils.image_enhancer import ImageEnhancer
from services.consolidation_service import ConsolidationService

import os
import pandas as pd
from io import BytesIO
from typing import List
from fastapi import BackgroundTasks
import hashlib

router = APIRouter()
ocr_service = OCRService()
gemini_service = GeminiService()

@router.post("/upload")
async def upload_invoices(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = []
    
    for file in files:
        file_content = await file.read()
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if len(file_content) > 20 * 1024 * 1024:
            results.append({"file": file.filename, "status": "failed", "error": "File too large (Max 20MB)"})
            continue

        # 0. Check File Hash for immediate duplicate detection
        file_hash = hashlib.sha256(file_content).hexdigest()
        existing_file = db.query(Invoice).filter(Invoice.file_hash == file_hash).first()
        if existing_file:
            print(f"DEBUG: Exact file duplicate detected for: {file.filename}")
            results.append({
                "file": file.filename, 
                "status": "duplicate", 
                "error": "This file has already been uploaded.",
                "id": existing_file.id
            })
            continue

        print(f"DEBUG: Initializing entry for: {file.filename}")
        
        # 1. Save file for preview
        saved_path = FileService.save_file(file_content, file.filename)
        
        # 2. Create Initial DB Record with "processing" status
        new_invoice = Invoice(
            file_name=file.filename,
            file_type=file_extension,
            file_path=saved_path,
            file_hash=file_hash,
            status="processing",
            zoho_status="pending"
        )
        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)

        # 3. Add to Background Tasks
        background_tasks.add_task(
            process_invoice_task, 
            new_invoice.id, 
            file_content, 
            file_extension, 
            file.content_type, 
            db
        )

        results.append({
            "file": file.filename,
            "status": "processing",
            "id": new_invoice.id
        })

    return results

async def process_invoice_task(invoice_id: int, file_content: bytes, file_extension: str, content_type: str, db: Session):
    """Background task to process invoice extraction and Zoho sync."""
    try:
        # Re-fetch invoice in this session
        from database.db import SessionLocal
        inner_db = SessionLocal()
        invoice = inner_db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return

        def log_step(step, msg):
            print(f"DEBUG [{invoice_id}]: {msg}")
            timestamp = datetime.now().strftime("%H:%M:%S")
            current_logs = invoice.logs or []
            current_logs.append({"time": timestamp, "msg": msg})
            invoice.logs = current_logs
            invoice.current_step = step
            inner_db.commit()

        log_step("reading", f"Starting background process for {invoice.file_name}")

        # 1. Image Enhancement (if image)
        processed_content = file_content
        if file_extension in [".jpg", ".jpeg", ".png"]:
            log_step("reading", "Enhancing image for better AI visibility...")
            processed_content = ImageEnhancer.enhance(file_content)
        
        # 2. Extraction
        extraction_results = []
        log_step("extracting", "AI is scanning document layout...")
        try:
            if file_extension == ".pdf":
                log_step("extracting", "Reading PDF pages and text layers...")
                extraction_results = gemini_service.extract_from_pdf(processed_content)
            elif file_extension in [".jpg", ".jpeg", ".png"]:
                try:
                    extraction_results = gemini_service.extract_from_image(processed_content, content_type)
                except Exception as gem_e:
                    print(f"DEBUG: Direct image extraction failed: {gem_e}. Trying OCR fallback...")
                    raw_text = ocr_service.extract_text_from_image(processed_content)
                    if raw_text:
                        extraction_results = gemini_service.extract_invoice_data(raw_text)
                    else:
                        raise gem_e
            elif file_extension in [".docx", ".xlsx", ".xls"]:
                raw_text = FileParser.extract_text(processed_content, file_extension)
                if raw_text:
                    extraction_results = gemini_service.extract_invoice_data(raw_text)
        except Exception as e:
            if file_extension == ".pdf":
                text = FileParser.extract_text(processed_content, file_extension)
                if text:
                    extraction_results = gemini_service.extract_invoice_data(text)
            
        if not extraction_results:
            log_step("failed", "AI extraction failed to find invoice data")
            invoice.status = "failed"
            invoice.zoho_message = "Extraction failed: AI service error or no data found."
            inner_db.commit()
            return

        # 2.5 Consolidate sections
        log_step("extracting", f"Analyzing {len(extraction_results)} document sections...")
        extraction_results = ConsolidationService.consolidate(extraction_results)
        log_step("extracting", f"Identified {len(extraction_results)} unique invoice(s)")

        # 3. Process each extracted invoice
        for index, extracted_data in enumerate(extraction_results):
            try:
                # For the first item, we use the existing invoice record.
                # For subsequent items, we create new records.
                if index == 0:
                    current_inv = invoice
                else:
                    current_inv = Invoice(
                        file_name=invoice.file_name,
                        file_type=invoice.file_type,
                        file_path=invoice.file_path,
                        file_hash=invoice.file_hash,
                        status="processing",
                        zoho_status="pending"
                    )
                    inner_db.add(current_inv)
                    inner_db.commit()
                    inner_db.refresh(current_inv)

                # Validation & Normalization
                log_step("validating", "Validating extracted fields and amounts...")
                ValidationService.validate(extracted_data)
                normalized_data = ValidationService.normalize_data(extracted_data)
                
                log_step("validating", "Detecting document type and accounting categories...")
                doc_type_raw = extracted_data.get("document_type", "Sales Invoice")
                is_purchase = any(kw in str(doc_type_raw).lower() for kw in ["purchase", "bill", "receipt", "delivery challan"])
                doc_type_internal = "purchase" if is_purchase else "sales"

                # Duplicate Detection (Invoice # + Vendor)
                invoice_no = normalized_data.get("invoice_number")
                vendor = normalized_data.get("vendor_name")
                is_duplicate = False
                if invoice_no and vendor:
                    log_step("validating", f"Checking for duplicates: {invoice_no}")
                    existing = inner_db.query(Invoice).filter(
                        Invoice.invoice_number == invoice_no,
                        Invoice.vendor_name == vendor,
                        Invoice.id != current_inv.id
                    ).first()
                    if existing:
                        log_step("failed", f"Duplicate detected: {invoice_no} already exists")
                        is_duplicate = True
                        current_inv.status = "failed"
                        current_inv.zoho_status = "failed"
                        current_inv.zoho_message = "Duplicate detected: This invoice number and vendor already exist. Sync rejected."
                
                # Save extraction results
                current_inv.invoice_number = invoice_no
                current_inv.order_id = normalized_data.get("order_id")
                current_inv.date = normalized_data.get("date")
                current_inv.vendor_name = vendor
                current_inv.customer_name = normalized_data.get("customer_name")
                current_inv.total_amount = normalized_data.get("total_amount")
                current_inv.sections_data = normalized_data.get("breakdown")
                current_inv.document_type = doc_type_internal
                current_inv.category = extracted_data.get("category", "Others")
                current_inv.confidence_score = extracted_data.get("confidence_score", 0)

                if not is_duplicate:
                    # Zoho Sync
                    log_step("syncing", f"Connecting to Zoho for {doc_type_internal} sync...")
                    zoho_response = None
                    try:
                        if doc_type_internal == "purchase":
                            zoho_response = create_bill(normalized_data)
                        else:
                            zoho_response = create_invoice(normalized_data)
                        
                        if zoho_response and zoho_response.get("code") == 0:
                            log_step("syncing", "Zoho synchronization successful ✅")
                            current_inv.zoho_status = "synced"
                            current_inv.zoho_invoice_id = (zoho_response.get("invoice", {}).get("invoice_id") or 
                                               zoho_response.get("bill", {}).get("bill_id"))
                            current_inv.zoho_message = f"Successfully synced to Zoho as {doc_type_internal}"
                        else:
                            current_inv.zoho_status = "failed"
                            current_inv.zoho_message = zoho_response.get("message") or zoho_response.get("error") or "Zoho sync failed"
                    except Exception as ze:
                        log_step("failed", f"Zoho sync error: {str(ze)}")
                        current_inv.zoho_status = "failed"
                        current_inv.zoho_message = str(ze)

                log_step("finalizing", "Saving consolidated record to database...")
                current_inv.status = "completed"
                inner_db.commit()
                log_step("completed", "Invoice processing complete")

            except Exception as item_e:
                print(f"ERROR processing item {index}: {item_e}")
                inner_db.rollback()
                # Continue to next item if one fails

    except Exception as e:
        print(f"ERROR in process_invoice_task: {e}")
        try:
            invoice.status = "failed"
            invoice.zoho_message = str(e)
            inner_db.commit()
        except:
            pass
    finally:
        inner_db.close()

@router.post("/invoice/retry/{invoice_id}")
async def retry_invoice(
    invoice_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retry processing for a failed invoice"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if not invoice.file_path or not os.path.exists(invoice.file_path):
        raise HTTPException(status_code=400, detail="Original file not found for retry")

    with open(invoice.file_path, "rb") as f:
        file_content = f.read()

    invoice.status = "processing"
    invoice.zoho_status = "pending"
    db.commit()

    background_tasks.add_task(
        process_invoice_task, 
        invoice.id, 
        file_content, 
        invoice.file_type, 
        f"image/{invoice.file_type[1:]}" if invoice.file_type in [".jpg", ".png"] else "application/pdf",
        db
    )

    return {"message": "Retry started in background", "id": invoice.id}

@router.get("/invoices")
async def get_all_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch all invoices ordered by newest first"""
    try:
        invoices = db.query(Invoice).order_by(Invoice.created_at.desc()).all()
        return invoices
    except Exception as e:
        print(f"Error fetching invoices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoice/{invoice_id}")
async def get_invoice(
    invoice_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch a single invoice by ID"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.put("/invoice/{invoice_id}")
async def update_invoice(
    invoice_id: int, 
    data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update invoice details and sync with Zoho"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update fields from data
    for key, value in data.items():
        if hasattr(invoice, key):
            setattr(invoice, key, value)
    
    # ✅ NEW: Zoho Sync Logic
    try:
        doc_type = invoice.document_type or "sales"
        if invoice.zoho_invoice_id:
            print(f"Updating existing Zoho {doc_type}: {invoice.zoho_invoice_id}...")
            if doc_type == "purchase":
                zoho_response = update_zoho_bill(data, invoice.zoho_invoice_id)
            else:
                zoho_response = update_zoho_invoice(data, invoice.zoho_invoice_id)
        else:
            print(f"Creating new Zoho {doc_type}...")
            if doc_type == "purchase":
                zoho_response = create_bill(data)
            else:
                zoho_response = create_invoice(data)
            
        print("Zoho Sync Response:", zoho_response)
        
        if zoho_response and zoho_response.get("code") == 0:
            invoice.zoho_status = "synced"
            invoice.zoho_message = f"Updated in Zoho as {doc_type} successfully"
            if not invoice.zoho_invoice_id:
                # Bills use "bill_id", Invoices use "invoice_id"
                invoice.zoho_invoice_id = (zoho_response.get("invoice", {}).get("invoice_id") or 
                                          zoho_response.get("bill", {}).get("bill_id"))
        else:
            error_msg = zoho_response.get("message") or zoho_response.get("error") or "Unknown Zoho error"
            invoice.zoho_status = "failed"
            invoice.zoho_message = error_msg
    except Exception as e:
        print(f"Zoho Sync Exception: {e}")
        invoice.zoho_status = "failed"
        invoice.zoho_message = str(e)

    try:
        db.commit()
        db.refresh(invoice)
        return invoice
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoice/save")
async def save_invoice(
    data: dict, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Alias for update_invoice to match frontend requirement"""
    invoice_id = data.get("id")
    if not invoice_id:
        raise HTTPException(status_code=400, detail="Invoice ID is required")
    return await update_invoice(invoice_id, data, db, current_user)

@router.delete("/invoice/{invoice_id}")
async def delete_invoice(
    invoice_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an invoice and its associated file"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Delete the physical file if it exists
    if invoice.file_path and os.path.exists(invoice.file_path):
        try:
            os.remove(invoice.file_path)
        except Exception as file_error:
            print(f"Error deleting file {invoice.file_path}: {file_error}")

    # ✅ NEW: Delete from Zoho if synced
    if invoice.zoho_invoice_id:
        try:
            print(f"DEBUG: Deleting {invoice.document_type} from Zoho: {invoice.zoho_invoice_id}")
            if invoice.document_type == "purchase":
                delete_zoho_bill(invoice.zoho_invoice_id)
            else:
                delete_zoho_invoice(invoice.zoho_invoice_id)
        except Exception as zoho_e:
            print(f"Error deleting from Zoho: {zoho_e}")

    try:
        db.delete(invoice)
        db.commit()
        return {"message": "Invoice and associated file deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoices/bulk-delete")
async def bulk_delete_invoices(
    invoice_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete multiple invoices and their associated files"""
    invoices = db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).all()
    
    if not invoices:
        return {"message": "No invoices found for the given IDs"}
    
    deleted_count = 0
    for invoice in invoices:
        # Delete physical file
        if invoice.file_path and os.path.exists(invoice.file_path):
            try:
                os.remove(invoice.file_path)
            except Exception as e:
                print(f"Error deleting file {invoice.file_path}: {e}")
        
        db.delete(invoice)
        deleted_count += 1
        
        # ✅ NEW: Delete from Zoho if synced
        if invoice.zoho_invoice_id:
            try:
                print(f"DEBUG: Deleting {invoice.document_type} from Zoho: {invoice.zoho_invoice_id}")
                if invoice.document_type == "purchase":
                    delete_zoho_bill(invoice.zoho_invoice_id)
                else:
                    delete_zoho_invoice(invoice.zoho_invoice_id)
            except Exception as zoho_e:
                print(f"Error deleting from Zoho: {zoho_e}")
    
    try:
        db.commit()
        return {"message": f"Successfully deleted {deleted_count} invoices"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoices/status")
async def get_invoices_status(
    invoice_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the status of multiple invoices by ID with logs and extraction data"""
    invoices = db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).all()
    return [
        {
            "id": inv.id, 
            "status": inv.status, 
            "current_step": inv.current_step,
            "file_name": inv.file_name,
            "logs": inv.logs or [],
            "extraction": {
                "vendor_name": inv.vendor_name,
                "invoice_number": inv.invoice_number,
                "date": inv.date,
                "total_amount": float(inv.total_amount) if inv.total_amount else 0,
                "category": inv.category,
                "breakdown": inv.sections_data
            } if inv.status != 'pending' else None
        } for inv in invoices
    ]

@router.get("/file/{invoice_id}")
async def view_pdf(
    invoice_id: int, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Serve the invoice file for preview or download"""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice or not invoice.file_path:
        raise HTTPException(status_code=404, detail="Invoice or file path not found")
    
    if not os.path.exists(invoice.file_path):
        raise HTTPException(status_code=404, detail=f"File not found on server at {invoice.file_path}")

    # Determine media type based on extension
    ext = os.path.splitext(invoice.file_path)[1].lower()
    media_types = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png'
    }
    media_type = media_types.get(ext, 'application/octet-stream')
    
    return FileResponse(invoice.file_path, media_type=media_type)

@router.get("/export")
async def export_invoices_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export all invoices as a CSV file"""
    invoices = db.query(Invoice).all()
    
    # Simple CSV generation using pandas
    data = []
    for inv in invoices:
        data.append({
            "Invoice Number": inv.invoice_number,
            "Vendor": inv.vendor_name,
            "Date": inv.date,
            "Total Amount": float(inv.total_amount) if inv.total_amount else 0.0,
            "Zoho Status": inv.zoho_status,
            "Zoho Invoice ID": inv.zoho_invoice_id,
            "File Name": inv.file_name,
            "Created At": inv.created_at
        })
    
    df = pd.DataFrame(data)
    stream = BytesIO()
    df.to_csv(stream, index=False)
    stream.seek(0)
    
    return StreamingResponse(
        stream, 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=invoices_export_{pd.Timestamp.now().strftime('%Y%m%d')}.csv"}
    )