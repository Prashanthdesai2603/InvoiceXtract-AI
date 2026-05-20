# InvoiceXtract AI

InvoiceXtract AI is a full-stack web application designed to automate the extraction of structured data from invoice documents (PDF, Word, Excel) using OCR (Google Vision) and LLMs (Gemini).

## Features

- **Multi-Format Support**: Extract data from PDF, .docx, and .xlsx files.
- **Bulk AI Processing**: Upload and process up to 100 invoices simultaneously.
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

- [ ] AI-Powered Fraud Detection
- [ ] Automated Line-Item Reconciliation

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

```mermaid
graph TD
    A[User / Invoice Document] -->|Upload| B[React Frontend]
    B -->|REST API| C[FastAPI Backend]
    C -->|OCR / Vision| D[Google Vision API]
    D -->|Text Extraction| E[Gemini 1.5 Flash AI]
    E -->|Structured JSON| F[Validation Layer]
    F -->|Persistence| G[(MySQL Database)]
    F -->|Sync| H[Zoho Books API]
    H -->|Automated Accounting| I[Zoho Bills/Invoices]
    B -->|Analytics| J[Dashboard Charts]
```

---

## 🚀 Complete Installation Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Prashanthdesai2603/InvoiceXtract-AI.git
cd InvoiceXtract-AI
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### 4. Running the Project
**Terminal 1 (Backend):**
```bash
cd backend
python -m uvicorn main:app --reload
```
**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
DATABASE_URL=mysql+pymysql://user:password@localhost/invoice_db

# Security
SECRET_KEY=your_super_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Configuration
GEMINI_API_KEY=your_gemini_api_key

# Zoho Integration
ZOHO_CLIENT_ID=your_client_id
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=your_refresh_token
ZOHO_ORGANIZATION_ID=your_org_id
```

---

## 🤖 Gemini AI Setup
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Create a new API Key.
3. Add it to your `.env` as `GEMINI_API_KEY`.
4. The system uses **Gemini 1.5 Flash** for rapid, accurate document parsing and field extraction.

---

## 🏢 Zoho Books Integration Setup

### Step 1: Zoho Developer Console
1. Go to [Zoho Developer Console](https://api-console.zoho.in/).
2. Click **Add Client** → **Self Client**.
3. Note your **Client ID** and **Client Secret**.

### Step 2: Generate Refresh Token
1. In the Self Client tab, click **Generate Code**.
2. Scopes: `ZohoBooks.fullaccess.all`.
3. Time Duration: 10 minutes.
4. Run the helper script:
```bash
cd backend
python get_token.py
```
5. Follow the prompts to generate and save your `ZOHO_REFRESH_TOKEN`.

### Step 3: Get Organization ID
Run the utility script to fetch your Org ID:
```bash
python get_org.py
```

---

## 📁 Folder Structure Explanation

### `backend/`
- `main.py`: Application entry point and middleware configuration.
- `routes/`: API endpoint definitions (Auth, Invoices, Zoho).
- `services/`: Business logic (Gemini extraction, Zoho API management).
- `models/`: SQLAlchemy database models.
- `database/`: DB connection and session management.
- `uploads/`: Temporary storage for processed documents.

### `frontend/`
- `src/components/`: Reusable UI modules (AI Processing Card, Tables).
- `src/pages/`: Main application views (Dashboard, History).
- `src/services/`: API communication layer (Axios instances).
- `src/context/`: Global state management (Auth/Theme).

---

## 🛠️ Essential Terminal Commands

| Command | Description |
|:---|:---|
| `python -m uvicorn main:app --reload` | Start backend development server |
| `npm start` | Start React frontend |
| `python get_token.py` | Generate Zoho Refresh Token |
| `python get_org.py` | Fetch Zoho Organization ID |
| `python test_refresh.py` | Verify Zoho API connectivity |

---

## 🔒 Security & Best Practices
- **.env Protection**: Never commit your `.env` file. It is included in `.gitignore`.
- **Token Rotation**: System automatically refreshes Access Tokens using the Refresh Token.
- **Data Integrity**: Multi-layer validation ensures only clean data reaches Zoho Books.

---

## 🚀 Future Roadmap
- [ ] AI-Powered Fraud Detection
- [ ] Automated Line-Item Reconciliation
- [ ] Bulk Export to ERP (SAP/Oracle)
- [ ] Multi-Currency Intelligence
- [ ] Mobile App for On-the-go Scanning

---

## 🤝 Contribution Guide
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/AmazingFeature`).
3. Commit changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---
**Developed with ❤️ by the InvoiceXtract AI Team**
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