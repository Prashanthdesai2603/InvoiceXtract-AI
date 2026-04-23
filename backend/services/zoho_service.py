import os
import requests
from datetime import date, datetime
from dotenv import load_dotenv

load_dotenv()

# Global token variables (can be updated by refresh logic)
ACCESS_TOKEN = os.getenv("ZOHO_ACCESS_TOKEN")
ORG_ID = os.getenv("ZOHO_ORG_ID")
CLIENT_ID = os.getenv("ZOHO_CLIENT_ID")
CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET")
REFRESH_TOKEN = os.getenv("ZOHO_REFRESH_TOKEN")

def refresh_access_token():
    """Refreshes the Zoho access token using the refresh token."""
    global ACCESS_TOKEN
    print("DEBUG: Refreshing Zoho Access Token...")
    url = "https://accounts.zoho.in/oauth/v2/token"

    if not all([CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN]):
        print("ERROR: Missing Zoho credentials (Client ID, Secret, or Refresh Token) in .env")
        return None

    data = {
        "grant_type": "refresh_token",
        "refresh_token": REFRESH_TOKEN,
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET
    }

    try:
        response = requests.post(url, data=data)
        res_data = response.json()
        
        if "access_token" in res_data:
            ACCESS_TOKEN = res_data["access_token"]
            print("DEBUG: Zoho Access Token refreshed successfully.")
            return ACCESS_TOKEN
        else:
            print(f"ERROR: Failed to refresh Zoho token: {res_data}")
            return None
    except Exception as e:
        print(f"EXCEPTION during Zoho token refresh: {e}")
        return None

def make_zoho_request(method, url, **kwargs):
    """Wrapper for requests to handle 401 errors and auto-refresh token."""
    global ACCESS_TOKEN
    
    # Ensure headers exist and have the token
    if 'headers' not in kwargs:
        kwargs['headers'] = {}
    
    kwargs['headers']["Authorization"] = f"Zoho-oauthtoken {ACCESS_TOKEN}"
    
    try:
        response = requests.request(method, url, **kwargs)
        
        # If unauthorized, try to refresh token and retry once
        if response.status_code == 401:
            print("DEBUG: Zoho Access Token expired (401). Attempting refresh...")
            new_token = refresh_access_token()
            if new_token:
                # Update header with new token and retry
                kwargs['headers']["Authorization"] = f"Zoho-oauthtoken {new_token}"
                print("DEBUG: Retrying Zoho API call with new token...")
                response = requests.request(method, url, **kwargs)
        
        return response
    except Exception as e:
        print(f"EXCEPTION in make_zoho_request: {e}")
        raise e

def get_or_create_contact(name):
    """Finds a contact by name or creates a new one."""
    search_url = "https://www.zohoapis.in/books/v3/contacts"
    params = {
        "organization_id": ORG_ID,
        "contact_name": name
    }
    
    try:
        # 1. Search for contact
        search_res = make_zoho_request("GET", search_url, params=params)
        print("Zoho Search Response:", search_res.text)
        
        if search_res.status_code == 200:
            search_data = search_res.json()
            contacts = search_data.get('contacts', [])
            if contacts:
                print(f"DEBUG: Found existing Zoho contact: {name} (ID: {contacts[0]['contact_id']})")
                return contacts[0]['contact_id']
        
        # 2. Create if not found
        print(f"DEBUG: Zoho contact not found. Creating new contact: {name}")
        create_url = "https://www.zohoapis.in/books/v3/contacts"
        payload = {
            "contact_name": name,
            "contact_type": "customer"
        }
        create_res = make_zoho_request("POST", create_url, json=payload, params={"organization_id": ORG_ID})
        print("Zoho Create Contact Response:", create_res.text)
        
        if create_res.status_code in (200, 201):
            create_data = create_res.json()
            contact_id = create_data.get('contact', {}).get('contact_id')
            return contact_id
        else:
            print(f"ERROR creating Zoho contact: {create_res.text}")
            return None
            
    except Exception as e:
        print(f"EXCEPTION in get_or_create_contact: {e}")
        return None

def create_invoice(data):
    url = "https://www.zohoapis.in/books/v3/invoices"

    # Ensure date is a string for JSON serialization (YYYY-MM-DD)
    invoice_date = data.get("date")
    if hasattr(invoice_date, "strftime"):
        invoice_date = invoice_date.strftime("%Y-%m-%d")
    elif isinstance(invoice_date, str) and "T" in invoice_date:
        invoice_date = invoice_date.split("T")[0]

    # Get or create customer ID
    vendor_name = data.get("vendor_name") or "Unknown Vendor"
    customer_id = get_or_create_contact(vendor_name)
    
    if not customer_id:
        print("ERROR: Could not determine Zoho customer ID. Invoice creation aborted.")
        return {"error": "Could not determine Zoho customer ID"}

    payload = {
        "customer_id": customer_id,
        "date": invoice_date,
        "line_items": [
            {
                "name": "Invoice Item",
                "rate": float(data.get("total_amount", 0)),
                "quantity": 1
            }
        ]
    }

    params = {
        "organization_id": ORG_ID
    }

    print("Sending data to Zoho:", payload)

    try:
        response = make_zoho_request("POST", url, json=payload, params=params)
        print("Zoho Create Invoice Response:", response.text)
        return response.json()
    except Exception as e:
        print(f"Zoho API Error: {e}")
        return {"error": str(e)}


def update_zoho_invoice(invoice_data, zoho_invoice_id):
    """Updates an existing invoice in Zoho Books."""
    url = f"https://www.zohoapis.in/books/v3/invoices/{zoho_invoice_id}"
    
    # Ensure date is a string for JSON serialization (YYYY-MM-DD)
    invoice_date = invoice_data.get("date")
    if hasattr(invoice_date, "strftime"):
        invoice_date = invoice_date.strftime("%Y-%m-%d")
    elif isinstance(invoice_date, str) and "T" in invoice_date:
        invoice_date = invoice_date.split("T")[0]

    payload = {
        "customer_name": invoice_data.get("vendor_name"),
        "date": invoice_date,
        "line_items": [
            {
                "name": "Updated Invoice Item",
                "rate": float(invoice_data.get("total_amount", 0)),
                "quantity": 1
            }
        ]
    }

    print("Sending updated data to Zoho:", payload)
    
    params = {
        "organization_id": ORG_ID
    }

    try:
        response = make_zoho_request("PUT", url, json=payload, params=params)
        print("Zoho Update Response:", response.json())
        return response.json()
    except Exception as e:
        print(f"Zoho Update API Error: {e}")
        return {"error": str(e)}