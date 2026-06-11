from google.genai._interactions.types import code_execution_result_content_param
import requests
import os
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()

CLIENT_ID = os.getenv("ZOHO_CLIENT_ID")
CLIENT_SECRET = os.getenv("ZOHO_CLIENT_SECRET")
REDIRECT_URI = "http://localhost:8000/callback"

def get_tokens(auth_code):
    url = "https://accounts.zoho.in/oauth/v2/token"
    
    data = {
        "grant_type": "authorization_code",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uri": REDIRECT_URI,
        "code": auth_code
    }

    print(f"Exchanging code for tokens...")
    response = requests.post(url, data=data)
    
    if response.status_code == 200:
        res_data = response.json()
        print("\n--- NEW TOKENS RECEIVED ---")
        print(f"Access Token: {res_data.get('access_token')}")
        print(f"Refresh Token: {res_data.get('refresh_token')}")
        print("---------------------------\n")
        print("Please update your .env file with these values.")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    # The URL to get the code:
    print(f"\n1. Go to this URL in your browser:")
    print(f"https://accounts.zoho.in/oauth/v2/auth?scope=ZohoBooks.fullaccess.all&client_id={CLIENT_ID}&response_type=code&access_type=offline&redirect_uri={REDIRECT_URI}")
    
    auth_code = input("\n2. Enter the 'code' from the URL after redirect: ").strip()
    if auth_code:
        get_tokens(auth_code)
    else:
        print("No code entered. Exiting.")
        
