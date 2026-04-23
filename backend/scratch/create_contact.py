import requests

ACCESS_TOKEN = "1000.b7a5e70a837c0e74eff4c6c7499b11dc.5bdc4c2026db5e3210ae4a6b223cfd05"
ORG_ID = "60070130526"

def create_contact(name):
    url = "https://www.zohoapis.in/books/v3/contacts"
    headers = {
        "Authorization": f"Zoho-oauthtoken {ACCESS_TOKEN}"
    }
    payload = {
        "contact_name": name,
        "contact_type": "customer"
    }
    params = {
        "organization_id": ORG_ID
    }
    response = requests.post(url, headers=headers, json=payload, params=params)
    return response.json()

if __name__ == "__main__":
    print(create_contact("Test Vendor"))
