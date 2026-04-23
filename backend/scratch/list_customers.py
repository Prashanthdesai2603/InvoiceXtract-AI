import requests

ACCESS_TOKEN = "1000.b7a5e70a837c0e74eff4c6c7499b11dc.5bdc4c2026db5e3210ae4a6b223cfd05"
ORG_ID = "60070130526"

def list_customers():
    url = "https://www.zohoapis.in/books/v3/contacts"
    headers = {
        "Authorization": f"Zoho-oauthtoken {ACCESS_TOKEN}"
    }
    params = {
        "organization_id": ORG_ID,
        "contact_type": "customer"
    }
    response = requests.get(url, headers=headers, params=params)
    data = response.json()
    if response.status_code == 200:
        contacts = data.get('contacts', [])
        for contact in contacts:
            print(f"Name: {contact.get('contact_name')}, ID: {contact.get('contact_id')}")
    else:
        print(data)

if __name__ == "__main__":
    list_customers()
