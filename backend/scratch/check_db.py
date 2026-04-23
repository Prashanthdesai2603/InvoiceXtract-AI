from sqlalchemy import text
from database.db import engine

def check_structure():
    with engine.connect() as conn:
        print("Checking invoices table columns...")
        result = conn.execute(text("DESCRIBE invoices"))
        for row in result:
            print(row)

if __name__ == "__main__":
    try:
        check_structure()
    except Exception as e:
        print(f"Error: {e}")
