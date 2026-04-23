import requests

url = "https://accounts.zoho.in/oauth/v2/token"

data = {
    "grant_type": "refresh_token",
    "refresh_token": "1000.938aca7b12b438c6c5812c27be9116e8.6635cecaf35ecfb581026e6c2c3b982f",
    "client_id": "1000.0USA8J0VLSPQNP89QI1L1NQMOI07SB",
    "client_secret": "0555da92258309461fe05d261ba21b6b93b8501ccd"
}

response = requests.post(url, data=data)

print("Status Code:", response.status_code)
print(response.json())