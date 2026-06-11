import requests

ACCESS_TOKEN = "1000.96a43de43bd8a96357b1b193818b914b.14f0dc6dfd1d1716e8cecc26adc0a8be"

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
   