import requests

ACCESS_TOKEN = ""

headers = {
    "Authorization": f"Zoho-oauthtoken {ACCESS_TOKEN}"
}

url = "https://www.zohoapis.in/books/v3/organizations"

response = requests.get(url, headers=headers)
if response.status_code == 200:
    orgs = response.json().get('organizations', [])
    for org in orgs:
        print(f"Name: {org.get('name')}, ID: {org.get('organization_id')}")
else:
    print(response.json())