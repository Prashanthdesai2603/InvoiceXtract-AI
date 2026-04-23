from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from database.db import engine, Base
from routes import invoice_routes, auth_routes
from models.user_model import User  # Ensure User is imported for metadata
from models.invoice_model import Invoice
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="InvoiceXtract AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:2003", "http://127.0.0.1:2003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Auth"])
app.include_router(invoice_routes.router, prefix="/api", tags=["Invoices"])

@app.get("/")
def read_root():
    return {"message": "Welcome to InvoiceXtract AI API"}

@app.get("/callback")
async def callback(request: Request):
    code = request.query_params.get("code")
    return {
        "message": "Authorization successful",
        "code": code
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

