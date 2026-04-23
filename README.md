# InvoiceXtract AI

InvoiceXtract AI is a full-stack web application designed to automate the extraction of structured data from invoice documents (PDF, Word, Excel) using OCR (Google Vision) and LLMs (Gemini).

## Features

- **Multi-Format Support**: Extract data from PDF, .docx, and .xlsx files.
- **AI-Powered Extraction**: Uses Gemini Pro for intelligent JSON data extraction.
- **OCR Integration**: Google Vision API for scanning image-based invoices.
- **Interactive Dashboard**: Real-time stats on processed invoices and total amounts.
- **Editable Results**: Review and correct extracted data before final storage.
- **History & Search**: Comprehensive logs with vendor filtering and search capabilities.

## Tech Stack

- **Frontend**: React, Bootstrap, Axios, React Router, React Icons.
- **Backend**: Python (FastAPI), SQLAlchemy, MySQL Connector.
- **AI/ML**: Google Generative AI (Gemini), Google Cloud Vision.
- **Database**: MySQL.

## Folder Structure

```text
InvoiceXtract-AI/
├── backend/
│   ├── database/        # DB Connection & Schema
│   ├── models/          # SQLAlchemy Models
│   ├── routes/          # FastAPI Endpoints
│   ├── services/        # OCR, Gemini, Parsers
│   ├── .env             # Environment variables
│   └── main.py          # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # React UI Components
│   │   ├── services/    # API integration
│   │   └── App.js       # Main Layout & Routing
│   └── package.json
└── README.md
```

## Setup Instructions

### Backend Setup

1. **Navigate to backend folder**:
   ```bash
   cd backend
   ```
2. **Create Virtual Environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
4. **Environment Variables**:
   Create a `.env` file based on `.env.example`:
   - `GEMINI_API_KEY`: Your Google AI Studio key.
   - `GOOGLE_APPLICATION_CREDENTIALS`: Path to your Google Cloud Service Account JSON for Vision API.
   - `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST`, `MYSQL_DB`: Your MySQL credentials.

5. **Run Server**:
   ```bash
   python -m uvicorn main:app --reload
   ```

### Frontend Setup

1. **Navigate to frontend folder**:
   ```bash
   cd frontend
   
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Run Application**:
   ```bash
   npm start
   ```

## Zoho Integration Setup

To sync your extracted invoices with Zoho Books, follow these steps to configure the OAuth2 integration:

### 1. Register a Zoho Client
1. Go to the [Zoho API Console](https://api-console.zoho.in/).
2. Click on **Add Client** and select **Server-based Applications**.
3. Fill in the details:
   - **Client Name**: InvoiceXtract AI
   - **Homepage URL**: `http://localhost:3000`
   - **Authorized Redirect URIs**: `http://localhost:8000/callback` (Required by Zoho but not actively used for this local flow).
4. Click **Create** to get your **Client ID** and **Client Secret**.

### 2. Generate a Grant Token
1. In the Zoho API Console, click on the client you just created.
2. Go to the **Self-Client** tab.
3. Enter the following Scope: `ZohoBooks.fullaccess.all`.
4. Set an expiry (e.g., 10 minutes) and click **View Code**.
5. Copy the generated **Grant Token**.

### 3. Generate a Refresh Token
Using a tool like Postman or `curl`, exchange the Grant Token for a Refresh Token:
```bash
curl -X POST "https://accounts.zoho.in/oauth/v2/token" \
-d "code={YOUR_GRANT_TOKEN}" \
-d "client_id={YOUR_CLIENT_ID}" \
-d "client_secret={YOUR_CLIENT_SECRET}" \
-d "grant_type=authorization_code"
```
From the JSON response, copy the `refresh_token`.

### 4. Find Your Organization ID
1. Log in to your [Zoho Books](https://books.zoho.in/) account.
2. Go to **Settings** (gear icon) > **Organization Profile**.
3. Copy the **Organization ID** listed at the top.

### 5. Update Environment Variables
Add these values to your `backend/.env` file:
```env
ZOHO_ORG_ID=your_org_id
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ACCESS_TOKEN=placeholder
```
> [!NOTE]
> The `ZOHO_ACCESS_TOKEN` is automatically managed and refreshed by the backend using the `ZOHO_REFRESH_TOKEN`.

#
 run python get_token.py to get a new link then copy paste that link in browser and copy paste the grant token from there to the get_token.py file and run it again to get the refresh token and access token.then add those in .env file and get_org.py .

 run python get_org.py to get the org id and add it in .env file

## How It Works

1. **Upload**: User uploads a file through the drag-and-drop interface.
2. **Parse**: The backend detects the file type.
   - Word: Extracted using `python-docx`.
   - Excel: Extracted using `pandas`.
   - PDF: Extracted directly or via OCR if scanned.
3. **AI Extraction**: Extracted text is sent to Gemini with a strict prompt to return JSON data.
4. **Validation**: The backend normalizes fields like dates and amounts.
5. **Storage**: Data is saved to MySQL and presented for review in the UI.

## Future Enhancements
- Support for batches of invoices.
- Export to CSV/Excel.
- User authentication and role-based access.

## Complete Workflow:
1. User uploads invoice (PDF/Word/Excel)

2. Frontend:
   - Shows upload progress
   - Sends file to backend

3. Backend:
   - Detects file type

4. Processing:
   - PDF → Gemini directly
   - Word/Excel → extract text → Gemini

5. Gemini:
   - Extracts invoice data
   - Returns JSON

6. Backend:
   - Validates data
   - Sends response to frontend

7. Frontend:
   - Auto-fills form
   - Shows PDF preview

8. User:
   - Edits data if needed
   - Clicks save

9. Backend:
   - Stores in MySQL

10. Dashboard:
   - Updates analytics

11. History Page:
   - Shows saved invoices
   - Search / filter / export


## Architecture (Frontend + Backend + AI):
                ┌───────────────────────┐
                │        Frontend       │
                │  (React + Bootstrap)  │
                └──────────┬────────────┘
                           │
                           ▼
                ┌────────────────────────┐
                │      FastAPI Backend   │
                │  (API + Business Logic)│
                └──────────┬────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
┌───────────────────────┐         ┌───────────────────────┐
│   File Processing     │         │     MySQL Database    │
│ (PDF/Word/Excel)      │         │ Store invoice data    │
└──────────┬────────────┘         └───────────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   Gemini API (LLM + OCR)     │
│ Extract structured data      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   Validation + Formatting    │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   Send Data to Frontend      │
└──────────────────────────────┘