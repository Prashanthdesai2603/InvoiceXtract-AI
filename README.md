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
   uvicorn main:app --reload
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