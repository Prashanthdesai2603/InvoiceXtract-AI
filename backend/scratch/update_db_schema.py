import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def update_db():
    try:
        conn = mysql.connector.connect(
            user=os.getenv("MYSQL_USER"),
            password=os.getenv("MYSQL_PASSWORD"),
            host=os.getenv("MYSQL_HOST"),
            database=os.getenv("MYSQL_DB")
        )
        cursor = conn.cursor()
        
        print("Checking for missing columns...")
        
        # Add confidence_score
        try:
            cursor.execute("ALTER TABLE invoices ADD COLUMN confidence_score INT NULL")
            print("Added confidence_score column")
        except mysql.connector.Error as err:
            if err.errno == 1060: # Duplicate column name
                print("confidence_score column already exists")
            else:
                raise err

        # Add category
        try:
            cursor.execute("ALTER TABLE invoices ADD COLUMN category VARCHAR(100) NULL")
            print("Added category column")
        except mysql.connector.Error as err:
            if err.errno == 1060:
                print("category column already exists")
            else:
                raise err

        # Add status
        try:
            cursor.execute("ALTER TABLE invoices ADD COLUMN status VARCHAR(50) DEFAULT 'completed'")
            print("Added status column")
        except mysql.connector.Error as err:
            if err.errno == 1060:
                print("status column already exists")
            else:
                raise err
        
        conn.commit()
        print("Database schema updated successfully!")
        
    except Exception as e:
        print(f"Error updating database: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    update_db()
