import os
from services.gemini_service import GeminiService
from dotenv import load_dotenv

load_dotenv()

def test_gemini():
    service = GeminiService()
    print(f"Testing Gemini with model: {service.model_name}")
    try:
        data = service.extract_invoice_data("Invoice Number: INV-123\nDate: 2024-01-01\nVendor: Test Corp\nTotal: 1000")
        print("Success!")
        print(data)
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    test_gemini()
