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

def get_or_create_contact(name, contact_type="customer"):
    """Finds a contact by name or creates a new one as customer or vendor.
       Handles contacts that exist as one type but need to be used as both."""
    search_url = "https://www.zohoapis.in/books/v3/contacts"
    params = {
        "organization_id": ORG_ID,
        "contact_name": name
    }
    
    try:
        # 1. Search for contact
        search_res = make_zoho_request("GET", search_url, params=params)
        
        if search_res.status_code == 200:
            search_data = search_res.json()
            contacts = search_data.get('contacts', [])
            if contacts:
                contact = contacts[0]
                contact_id = contact['contact_id']
                
                # Check if it already has the required role
                has_role = False
                if contact_type == "customer" and contact.get('is_customer'):
                    has_role = True
                elif contact_type == "vendor" and contact.get('is_vendor'):
                    has_role = True
                
                if has_role:
                    print(f"DEBUG: Found existing Zoho {contact_type}: {name} (ID: {contact_id})")
                    return contact_id
                else:
                    # Upgrade existing contact to have the new role
                    print(f"DEBUG: Contact {name} exists but is not a {contact_type}. Upgrading...")
                    update_url = f"https://www.zohoapis.in/books/v3/contacts/{contact_id}"
                    
                    # We only enable the required role, Zoho usually preserves existing ones
                    update_payload = {
                        "is_customer": True if contact_type == "customer" else contact.get('is_customer', True),
                        "is_vendor": True if contact_type == "vendor" else contact.get('is_vendor', False)
                    }
                    # If we don't know the state of the other flag, it's safer to just send the one we want to enable
                    # However, Zoho PUT often requires all mandatory fields or might overwrite.
                    # A safer way is to just send the specific flag we want to set to true.
                    safe_payload = {
                        "is_vendor": True if contact_type == "vendor" else contact.get('is_vendor', False),
                        "is_customer": True if contact_type == "customer" else contact.get('is_customer', True)
                    }
                    
                    update_res = make_zoho_request("PUT", update_url, json=safe_payload, params={"organization_id": ORG_ID})
                    if update_res.status_code == 200:
                        print(f"DEBUG: Successfully upgraded {name} to {contact_type}")
                        return contact_id
                    else:
                        print(f"ERROR upgrading Zoho contact: {update_res.text}")
                        return contact_id
        
        # 2. Create if not found
        print(f"DEBUG: Zoho contact not found. Creating new {contact_type}: {name}")
        create_url = "https://www.zohoapis.in/books/v3/contacts"
        payload = {
            "contact_name": name,
            "contact_type": contact_type
        }
        create_res = make_zoho_request("POST", create_url, json=payload, params={"organization_id": ORG_ID})
        
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
    """Creates a Sales Invoice in Zoho Books"""
    url = "https://www.zohoapis.in/books/v3/invoices"

    invoice_date = data.get("date")
    if hasattr(invoice_date, "strftime"):
        invoice_date = invoice_date.strftime("%Y-%m-%d")
    elif isinstance(invoice_date, str) and "T" in invoice_date:
        invoice_date = invoice_date.split("T")[0]

    vendor_name = data.get("vendor_name") or "Unknown Vendor"
    customer_id = get_or_create_contact(vendor_name, contact_type="customer")
    
    if not customer_id:
        return {"error": "Could not determine Zoho customer ID"}

    # Map breakdown to line items
    line_items = []
    breakdown = data.get("breakdown") or data.get("sections_data") or []
    
    if breakdown:
        for item in breakdown:
            rate = float(item.get("amount", 0))
            if item.get("type") == "DISCOUNT":
                rate = -abs(rate)
                
            line_items.append({
                "name": item.get("description") or f"{item.get('type')} Item",
                "rate": rate,
                "quantity": 1
            })
    else:
        line_items.append({
            "name": "Invoice Item",
            "rate": float(data.get("total_amount", 0)),
            "quantity": 1
        })

    payload = {
        "customer_id": customer_id,
        "invoice_number": data.get("invoice_number"),
        "date": invoice_date,
        "line_items": line_items,
        "ignore_auto_number_generation": True
    }

    try:
        response = make_zoho_request("POST", url, json=payload, params={"organization_id": ORG_ID, "ignore_auto_number_generation": "true"})
        return response.json()
    except Exception as e:
        print(f"Zoho API Error: {e}")
        return {"error": str(e)}

def update_zoho_invoice(invoice_data, zoho_invoice_id):
    """Updates an existing Sales Invoice in Zoho Books."""
    url = f"https://www.zohoapis.in/books/v3/invoices/{zoho_invoice_id}"
    
    invoice_date = invoice_data.get("date")
    if hasattr(invoice_date, "strftime"):
        invoice_date = invoice_date.strftime("%Y-%m-%d")
    elif isinstance(invoice_date, str) and "T" in invoice_date:
        invoice_date = invoice_date.split("T")[0]

    # Map breakdown to line items
    line_items = []
    breakdown = invoice_data.get("breakdown") or invoice_data.get("sections_data") or []
    
    if breakdown:
        for item in breakdown:
            rate = float(item.get("amount", 0))
            if item.get("type") == "DISCOUNT":
                rate = -abs(rate)
                
            line_items.append({
                "name": item.get("description") or f"{item.get('type')} Item",
                "rate": rate,
                "quantity": 1
            })
    else:
        line_items.append({
            "name": "Updated Invoice Item",
            "rate": float(invoice_data.get("total_amount", 0)),
            "quantity": 1
        })

    payload = {
        "date": invoice_date,
        "line_items": line_items
    }

    try:
        response = make_zoho_request("PUT", url, json=payload, params={"organization_id": ORG_ID})
        return response.json()
    except Exception as e:
        print(f"Zoho Update API Error: {e}")
        return {"error": str(e)}

def create_bill(data):
    """Creates a Purchase Bill in Zoho Books"""
    url = "https://www.zohoapis.in/books/v3/bills"

    bill_date = data.get("date")
    if hasattr(bill_date, "strftime"):
        bill_date = bill_date.strftime("%Y-%m-%d")
    elif isinstance(bill_date, str) and "T" in bill_date:
        bill_date = bill_date.split("T")[0]

    vendor_name = data.get("vendor_name") or "Unknown Vendor"
    vendor_id = get_or_create_contact(vendor_name, contact_type="vendor")
    
    if not vendor_id:
        return {"error": "Could not determine Zoho vendor ID"}

    # Map breakdown to line items
    line_items = []
    breakdown = data.get("breakdown") or data.get("sections_data") or []
    
    if breakdown:
        for item in breakdown:
            rate = float(item.get("amount", 0))
            if item.get("type") == "DISCOUNT":
                rate = -abs(rate)
                
            line_items.append({
                "name": item.get("description") or f"{item.get('type')} Item",
                "rate": rate,
                "quantity": 1,
                "account_id": "" # Zoho will use default if empty
            })
    else:
        line_items.append({
            "name": "Purchase Item",
            "rate": float(data.get("total_amount", 0)),
            "quantity": 1,
            "account_id": ""
        })

    payload = {
        "vendor_id": vendor_id,
        "bill_number": data.get("invoice_number") or f"BILL-{int(datetime.now().timestamp())}",
        "date": bill_date,
        "line_items": line_items,
        "ignore_auto_number_generation": True
    }

    try:
        response = make_zoho_request("POST", url, json=payload, params={"organization_id": ORG_ID, "ignore_auto_number_generation": "true"})
        return response.json()
    except Exception as e:
        print(f"Zoho Bill API Error: {e}")
        return {"error": str(e)}

def update_zoho_bill(bill_data, zoho_bill_id):
    """Updates an existing Purchase Bill in Zoho Books."""
    url = f"https://www.zohoapis.in/books/v3/bills/{zoho_bill_id}"
    
    bill_date = bill_data.get("date")
    if hasattr(bill_date, "strftime"):
        bill_date = bill_date.strftime("%Y-%m-%d")
    elif isinstance(bill_date, str) and "T" in bill_date:
        bill_date = bill_date.split("T")[0]

    # Map breakdown to line items
    line_items = []
    breakdown = bill_data.get("breakdown") or bill_data.get("sections_data") or []
    
    if breakdown:
        for item in breakdown:
            rate = float(item.get("amount", 0))
            if item.get("type") == "DISCOUNT":
                rate = -abs(rate)
                
            line_items.append({
                "name": item.get("description") or f"{item.get('type')} Item",
                "rate": rate,
                "quantity": 1
            })
    else:
        line_items.append({
            "name": "Updated Purchase Item",
            "rate": float(bill_data.get("total_amount", 0)),
            "quantity": 1
        })

    payload = {
        "bill_number": bill_data.get("invoice_number"),
        "date": bill_date,
        "line_items": line_items
    }

    try:
        response = make_zoho_request("PUT", url, json=payload, params={"organization_id": ORG_ID})
        return response.json()
    except Exception as e:
        print(f"Zoho Bill Update Error: {e}")
        return {"error": str(e)}

def delete_zoho_invoice(zoho_invoice_id):
    """Deletes a Sales Invoice in Zoho Books"""
    url = f"https://www.zohoapis.in/books/v3/invoices/{zoho_invoice_id}"
    try:
        response = make_zoho_request("DELETE", url, params={"organization_id": ORG_ID})
        return response.json()
    except Exception as e:
        print(f"Zoho Invoice Delete Error: {e}")
        return {"error": str(e)}

def delete_zoho_bill(zoho_bill_id):
    """Deletes a Purchase Bill in Zoho Books"""
    url = f"https://www.zohoapis.in/books/v3/bills/{zoho_bill_id}"
    try:
        response = make_zoho_request("DELETE", url, params={"organization_id": ORG_ID})
        return response.json()
    except Exception as e:
        print(f"Zoho Bill Delete Error: {e}")
        return {"error": str(e)}