import requests
from datetime import date

ACCESS_TOKEN = "1000.b7a5e70a837c0e74eff4c6c7499b11dc.5bdc4c2026db5e3210ae4a6b223cfd05"
ORG_ID = "60070130526"

def test_create_invoice():
    url = "https://www.zohoapis.in/books/v3/invoices"
    headers = {
        "Authorization": f"Zoho-oauthtoken {ACCESS_TOKEN}"
    }
    payload = {
        "customer_name": "Test Vendor",
        "date": "2026-04-20",
        "line_items": [
            {
                "name": "Test Item",
                "rate": 100.0,
                "quantity": 1
            }
        ]
    }
    params = {
        "organization_id": ORG_ID
    }
    response = requests.post(url, headers=headers, json=payload, params=params)
    print(response.json())

if __name__ == "__main__":
    test_create_invoice()
