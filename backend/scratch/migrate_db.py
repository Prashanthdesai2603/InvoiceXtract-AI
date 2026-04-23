from sqlalchemy import text
from database.db import engine

def migrate():
    with engine.connect() as conn:
        print("Starting manual migration...")
        
        # Check existing columns
        result = conn.execute(text("DESCRIBE invoices"))
        columns = [row[0] for row in result]
        print(f"Current columns: {columns}")
        
        # Add columns if they don't exist
        if 'zoho_status' not in columns:
            print("Adding zoho_status column...")
            conn.execute(text("ALTER TABLE invoices ADD COLUMN zoho_status VARCHAR(50) DEFAULT 'pending'"))
        
        if 'zoho_invoice_id' not in columns:
            print("Adding zoho_invoice_id column...")
            conn.execute(text("ALTER TABLE invoices ADD COLUMN zoho_invoice_id VARCHAR(100) NULL"))
            
        if 'zoho_message' not in columns:
            print("Adding zoho_message column...")
            conn.execute(text("ALTER TABLE invoices ADD COLUMN zoho_message VARCHAR(500) NULL"))
        
        # In MySQL, we need to commit manual changes if using some isolation levels, 
        # but ALTER TABLE usually commits implicitly.
        # SQLAlchemy connection might need commit() if in a transaction.
        # In newer SQLAlchemy, you might need conn.commit() if using conn.begin()
        
        print("Migration completed or already up to date.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"Error: {e}")
