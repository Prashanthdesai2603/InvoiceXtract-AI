from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
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


# ✅ NEW: Zoho import
from services.zoho_service import create_invoice, update_zoho_invoice, create_bill, update_zoho_bill

import os
import pandas as pd
from io import BytesIO
from typing import List

router = APIRouter()
ocr_service = OCRService()
gemini_service = GeminiService()

@router.post("/upload")
async def upload_invoices(
    files: List[UploadFile] = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    results = []
    
    for file in files:
        file_content = await file.read()
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if len(file_content) > 10 * 1024 * 1024:
            results.append({"file": file.filename, "status": "failed", "error": "File too large (Max 10MB)"})
            continue

        print(f"DEBUG: Processing file: {file.filename}")
        
        try:
            # 1. Save file for preview
            saved_path = FileService.save_file(file_content, file.filename)
            
            # 2. Extract Data with Fallback
            extracted_data = None
            try:
                if file_extension == ".pdf":
                    extracted_data = gemini_service.extract_from_pdf(file_content)
                elif file_extension in [".jpg", ".jpeg", ".png"]:
                    extracted_data = gemini_service.extract_from_image(file_content, file.content_type)
                elif file_extension in [".docx", ".xlsx", ".xls"]:
                    raw_text = FileParser.extract_text(file_content, file_extension)
                    if raw_text:
                        extracted_data = gemini_service.extract_invoice_data(raw_text)
            except Exception as e:
                # Fallback to Text-based extraction if Direct PDF failed due to Rate Limit
                if file_extension == ".pdf":
                    print("DEBUG: PDF Modal Extraction failed (Rate Limit). Falling back to Text Parsing...")
                    text = FileParser.extract_text(file_content, file_extension)
                    if text:
                        extracted_data = gemini_service.extract_invoice_data(text)
                
                if not extracted_data:
                    results.append({
                        "file": file.filename, 
                        "status": "failed", 
                        "error": "AI service busy, please retry later."
                    })
                    continue
            
            print("DEBUG: Extracted Data:", extracted_data)

            # 3. Validation & Warnings
            warnings = ValidationService.validate(extracted_data)
            normalized_data = ValidationService.normalize_data(extracted_data)
            doc_type = extracted_data.get("document_type", "sales")

            print(f"DEBUG: Normalized Data (Type: {doc_type}):", normalized_data)

            # Prevent saving if all key fields are empty
            is_empty = not any([
                normalized_data.get("invoice_number"),
                normalized_data.get("vendor_name"),
                normalized_data.get("total_amount")
            ])
            
            if is_empty:
                results.append({
                    "file": file.filename,
                    "status": "failed",
                    "error": "Extraction failed: No valid data found. AI service might be busy."
                })
                continue

            # ✅ NEW: Send to Zoho based on type
            zoho_response = None
            zoho_status = "pending"
            zoho_invoice_id = None
            zoho_message = f"Pending sync to Zoho ({doc_type})"

            try:
                if doc_type == "purchase":
                    zoho_response = create_bill(normalized_data)
                else:
                    zoho_response = create_invoice(normalized_data)
                    
                print("Zoho Response:", zoho_response)
                
                if zoho_response and zoho_response.get("code") == 0:
                    zoho_status = "synced"
                    # Bills use "bill_id", Invoices use "invoice_id"
                    zoho_invoice_id = (zoho_response.get("invoice", {}).get("invoice_id") or 
                                       zoho_response.get("bill", {}).get("bill_id"))
                    zoho_message = f"Successfully synced to Zoho as {doc_type}"
                elif zoho_response and "message" in zoho_response:
                    zoho_status = "failed"
                    zoho_message = zoho_response.get("message")
                elif zoho_response and "error" in zoho_response:
                    zoho_status = "failed"
                    zoho_message = zoho_response.get("error")
            except Exception as zoho_error:
                print("Zoho Error:", zoho_error)
                zoho_status = "failed"
                zoho_message = str(zoho_error)

            # 4. Save to DB
            breakdown = normalized_data.get("breakdown") or []

            new_invoice = Invoice(
                file_name=file.filename,
                file_type=file_extension,
                file_path=saved_path,
                invoice_number=normalized_data.get("invoice_number"),
                date=normalized_data.get("date"),
                vendor_name=normalized_data.get("vendor_name"),
                total_amount=normalized_data.get("total_amount"),
                sections_data=breakdown if breakdown else None,
                document_type=doc_type,
                zoho_status=zoho_status,
                zoho_invoice_id=zoho_invoice_id,
                zoho_message=zoho_message
            )
            db.add(new_invoice)
            db.commit()
            db.refresh(new_invoice)

            results.append({
                "file": file.filename,
                "status": "success",
                "id": new_invoice.id,
                "extracted_data": {
                    **normalized_data,
                    "sections_data": breakdown
                },
                "warnings": warnings,
                "zoho_status": zoho_status,
                "zoho_invoice_id": zoho_invoice_id,
                "zoho_message": zoho_message
            })

        except Exception as e:
            print(f"ERROR processing {file.filename}: {e}")
            results.append({"file": file.filename, "status": "failed", "error": str(e)})

    return results

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
    
    try:
        db.commit()
        return {"message": f"Successfully deleted {deleted_count} invoices"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

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