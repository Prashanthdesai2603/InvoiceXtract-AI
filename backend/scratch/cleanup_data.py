import sys
import os

# Add the parent directory to sys.path so we can import model and database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db import SessionLocal
from models.invoice_model import Invoice

def cleanup_empty_records():
    db = SessionLocal()
    try:
        # Delete records where all key fields are NULL or empty/zero
        deleted_count = db.query(Invoice).filter(
            (Invoice.invoice_number == None) | (Invoice.invoice_number == ""),
            (Invoice.vendor_name == None) | (Invoice.vendor_name == ""),
            (Invoice.total_amount == None) | (Invoice.total_amount == 0)
        ).delete(synchronize_session=False)
        
        db.commit()
        print(f"Successfully deleted {deleted_count} blank/pending records.")
    except Exception as e:
        db.rollback()
        print(f"Error during cleanup: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_empty_records()
