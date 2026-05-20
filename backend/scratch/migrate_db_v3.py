import os
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

def migrate():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("MYSQL_HOST", "localhost"),
            user=os.getenv("MYSQL_USER", "root"),
            password=os.getenv("MYSQL_PASSWORD", ""),
            database=os.getenv("MYSQL_DB", "invoice_xtract_db")
        )
        cursor = conn.cursor()
        
        # Add current_step and logs
        columns = [
            ("current_step", "VARCHAR(100)"),
            ("logs", "JSON")
        ]
        
        for col_name, col_type in columns:
            try:
                cursor.execute(f"ALTER TABLE invoices ADD COLUMN {col_name} {col_type} AFTER status")
                print(f"Added column {col_name}")
            except mysql.connector.Error as err:
                if err.errno == 1060: # Duplicate column name
                    print(f"Column {col_name} already exists")
                else:
                    print(f"Error adding {col_name}: {err}")

        conn.commit()
        cursor.close()
        conn.close()
        print("Migration completed successfully")
    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    migrate()
