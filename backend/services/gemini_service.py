import os
import time
from google import genai
from google.genai import types
import json
import re
from dotenv import load_dotenv

load_dotenv()

class GeminiService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        # Dynamic model selection
        self.model_name = os.getenv("GEMINI_MODEL")
        self.client = None
        self.model = None

        if api_key:
            try:
                self.client = genai.Client(api_key=api_key)
                
                # If no model specified in .env, discover best available
                if not self.model_name:
                    preferred = [
                        "gemini-3.1-flash-lite-preview", 
                        "gemini-3-flash-preview", 
                        "gemini-2.5-flash-lite",
                        "gemini-2.0-flash", 
                        "gemini-1.5-flash", 
                        "gemini-flash-latest"
                    ]

                    available_models = [m.name.replace("models/", "") for m in self.client.models.list()]
                    
                    for p in preferred:
                        if p in available_models:
                            self.model_name = p
                            break
                    
                    if not self.model_name:
                        self.model_name = available_models[0] if available_models else "gemini-1.5-flash"

                print(f"DEBUG: Initializing Gemini model: {self.model_name}")
                self.model = True
            except Exception as e:
                print(f"DEBUG: Gemini client init error: {e}")
                self.client = None
                self.model = None
        else:
            print("ERROR: Missing GEMINI_API_KEY")

    def _get_strict_prompt(self):
        return """
You are a highly precise financial AI. Analyze the provided document (PDF, Image, or Text) with extreme care.
CRITICAL: The document may contain MULTIPLE separate invoice sections, bills, or annexures (e.g., Product Tax Invoice, GT Charges, Transport Bill, Service Annexure).

YOUR MANDATORY TASK:
1. Scan the entire document from top to bottom.
2. Identify EVERY unique section that contributes to the total transaction.
3. Extract COMPLETE data for EACH identified section.
4. If multiple sections belong to the same Order (same Order ID or Order Number), ensure you capture that Order ID for each.
5. Categorize line items into 'breakdown' (e.g., SUPPLY, SERVICE, TAX, DISCOUNT, FEE).

---

EXTRACTION TARGETS FOR EACH ITEM:
1. invoice_number  → Specific Invoice No/Bill No for this section
2. order_id        → The parent Order ID or Order Number (CRITICAL for grouping)
3. invoice_date    → Date of issue (YYYY-MM-DD)
4. vendor_name     → Full name of the Seller/Supplier
5. customer_name   → Full name of the Buyer/Recipient
6. total_amount    → Final payable amount for THIS section
7. document_type   → "Sales Invoice", "Purchase Invoice", "Receipt", "Credit Note", "Delivery Challan", "Transport Bill", "Service Annexure"
8. category        → "Office Expense", "Travel", "IT Equipment", "Food & Beverage", "Utilities", "Rent", "Marketing", "Others"
9. confidence_score → 0-100
10. breakdown       → Array of {type: "SUPPLY"|"SERVICE"|"TAX"|"DISCOUNT"|"FEE", description: "...", amount: 0.00}

---

STRICT OUTPUT FORMAT:
Return ONLY a JSON ARRAY of objects. Each object represents one distinct section found.

[
  {
    "invoice_number": "...",
    "order_id": "...",
    "invoice_date": "YYYY-MM-DD",
    "vendor_name": "...",
    "customer_name": "...",
    "total_amount": 0.00,
    "document_type": "...",
    "category": "...",
    "confidence_score": 95,
    "breakdown": [
      { "type": "SUPPLY", "description": "Laptop Product", "amount": 41117.00 },
      { "type": "SERVICE", "description": "GT Charges", "amount": 1123.00 },
      { "type": "TAX", "description": "IGST 18%", "amount": 6272.00 }
    ]
  },
  ... (more objects if more sections exist)
]

RULES:
- DO NOT skip any section. Even small transport bills or charge sheets must be extracted.
- If an order has multiple pages with different bills, return them as separate objects but keep the same order_id.
- Return ONLY valid JSON. No markdown blocks. No explanations.
"""

    def _extract_json(self, content, raw_text="") -> list:
        """Robust JSON extraction supporting a list of invoices."""
        print(f"--- LOG: RAW LLM RESPONSE ---\n{content}\n-----------------------------")

        try:
            # 1. Clean and extract JSON block
            json_str = None
            fence_match = re.search(r"```(?:json)?\s*(\[.*?\]|\{.*?\})\s*```", content, re.DOTALL)
            if fence_match:
                json_str = fence_match.group(1)
            else:
                match = re.search(r"(\[.*\]|\{.*\})", content, re.DOTALL)
                if match:
                    json_str = match.group()

            if not json_str:
                print("DEBUG: No JSON structure found in LLM response.")
                return [self._get_fallback_data()]

            data = json.loads(json_str.strip())
            
            # Ensure data is a list
            if isinstance(data, dict):
                data = [data]
            elif not isinstance(data, list):
                print(f"DEBUG: Unexpected data type from JSON: {type(data)}")
                return [self._get_fallback_data()]

            results = []
            for item in data:
                extracted_item = self._process_single_item(item, content if content else raw_text)
                results.append(extracted_item)

            return results

        except Exception as e:
            print(f"ERROR: Extraction process failed: {e}")
            return [self._get_fallback_data()]

    def _process_single_item(self, data, context_text) -> dict:
        """Processes a single invoice object from the AI response."""
        extracted_data = self._get_fallback_data()
        
        # -- Map core fields --
        extracted_data["invoice_number"] = data.get("invoice_number")
        extracted_data["order_id"] = data.get("order_id")
        extracted_data["vendor_name"] = data.get("vendor_name")
        extracted_data["customer_name"] = data.get("customer_name")
        extracted_data["date"] = data.get("invoice_date") or data.get("date")

        # -- total_amount --
        amt = data.get("total_amount")
        if amt is not None:
            try:
                extracted_data["total_amount"] = float(str(amt).replace(",", ""))
            except (ValueError, TypeError):
                extracted_data["total_amount"] = 0.0

        # -- document_type & category & confidence --
        extracted_data["document_type"] = data.get("document_type", "Sales Invoice")
        extracted_data["category"] = data.get("category", "Others")
        extracted_data["confidence_score"] = data.get("confidence_score", 0)

        # -- breakdown array --
        breakdown_raw = data.get("breakdown")
        if isinstance(breakdown_raw, list) and len(breakdown_raw) > 0:
            normalized_breakdown = []
            calculated_sum = 0.0

            for item in breakdown_raw:
                if not isinstance(item, dict):
                    continue

                sec_type = str(item.get("type", "SUPPLY")).upper()
                if sec_type not in ("SUPPLY", "SERVICE", "TAX", "DISCOUNT", "FEE"):
                    sec_type = "SERVICE" if any(
                        kw in str(item.get("description", "")).upper()
                        for kw in ["HANDLING", "GTA", "DELIVERY", "TRANSPORT", "FREIGHT", "SERVICE", "FEE", "COMMISSION", "PLATFORM"]
                    ) else "SUPPLY"

                sec_desc = str(item.get("description", "")).strip() or sec_type.capitalize()

                try:
                    sec_amt = float(str(item.get("amount", 0)).replace(",", ""))
                except (ValueError, TypeError):
                    sec_amt = 0.0

                calculated_sum += sec_amt
                normalized_breakdown.append({
                    "type": sec_type,
                    "description": sec_desc,
                    "amount": sec_amt
                })

            extracted_data["breakdown"] = normalized_breakdown
            if calculated_sum > 0 and abs(extracted_data["total_amount"] - calculated_sum) > 0.01:
                extracted_data["total_amount"] = round(calculated_sum, 2)

        # Fallbacks for critical fields (only if context_text is small enough or specifically for this item)
        # Note: Fallbacks might be tricky with multiple items, but we'll try
        if not extracted_data["total_amount"] or extracted_data["total_amount"] == 0:
             # Try to find amount in the item's own context if available
             pass 

        if not extracted_data.get("breakdown") and extracted_data["total_amount"] > 0:
            extracted_data["breakdown"] = [{
                "type": "SUPPLY",
                "description": "Invoice Total",
                "amount": extracted_data["total_amount"]
            }]

        return extracted_data

    def _fallback_extract_total(self, text):
        """Detect largest number → possible total_amount."""
        try:
            numbers = re.findall(r"(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)", text)
            clean_numbers = []
            for n in numbers:
                try:
                    val = float(n.replace(",", ""))
                    clean_numbers.append(val)
                except:
                    continue

            if clean_numbers:
                filtered_numbers = [n for n in clean_numbers if n < 10000000]
                if filtered_numbers:
                    return max(filtered_numbers)
        except:
            pass
        return 0.0

    def _fallback_extract_date(self, text):
        """Detect patterns for dates."""
        patterns = [
            r"(\d{4}-\d{2}-\d{2})",                                                      # YYYY-MM-DD
            r"(\d{2}-\d{2}-\d{4})",                                                      # DD-MM-YYYY
            r"(\d{2}/\d{2}/\d{4})",                                                      # DD/MM/YYYY
            r"(\d{2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s\d{4})" # 20 Jan 2024
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    def _fallback_extract_invoice_no(self, text):
        """Detect invoice-like strings (alphanumeric)."""
        labels = ["Invoice No", "Bill No", "Ref No", "Document No", "Order ID", "No:"]
        for label in labels:
            match = re.search(rf"{label}\s*[:\-]?\s*([A-Z0-9\-/]+)", text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None

    def _validate_extraction(self, data):
        """Validate the extracted data."""
        field_values = [data["invoice_number"], data["vendor_name"], data["date"]]
        if all(v is None for v in field_values) and data["total_amount"] == 0.0:
            return False

        if data["total_amount"] > 0 and data["total_amount"] < 10:
            print(f"ALERT: Suspiciously low total_amount found: {data['total_amount']}")

        return True

    def extract_invoice_data(self, text: str) -> dict:
        """Extract data from raw text with retry logic."""
        if not self.client:
            raise ValueError("Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.")

        max_retries = 5
        for attempt in range(max_retries):
            try:
                full_prompt = f"{self._get_strict_prompt()}\n\nText to extract from:\n{text}"
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=full_prompt
                )

                if not response or not hasattr(response, "text"):
                    print("DEBUG: Gemini returned empty or invalid response for text")
                    return self._get_fallback_data()

                return self._extract_json(response.text.strip(), raw_text=text)

            except Exception as e:
                if any(err in str(e) for err in ["429", "503"]) and attempt < max_retries - 1:
                    wait_time = 15 if "429" in str(e) else 5
                    print(f"WARNING: Gemini {e}. Retrying in {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                print(f"ERROR: Gemini text extraction failed: {e}")
                return self._get_fallback_data()

    def extract_from_pdf(self, file_bytes: bytes) -> dict:
        """Extract data directly from PDF bytes using Gemini with retry logic."""
        if not self.client:
            raise ValueError("Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.")

        max_retries = 5
        for attempt in range(max_retries):
            try:
                print(f"DEBUG: Sending PDF directly to Gemini (Attempt {attempt+1}/{max_retries})...")
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[
                        types.Part.from_text(text=self._get_strict_prompt()),
                        types.Part.from_bytes(data=file_bytes, mime_type="application/pdf")
                    ]
                )

                if not response or not response.candidates:
                    print(f"DEBUG: Gemini returned no candidates (Attempt {attempt+1})")
                    continue

                # Check safety ratings or finish reason if text is missing
                candidate = response.candidates[0]
                if candidate.finish_reason and candidate.finish_reason != "STOP":
                    print(f"WARNING: Gemini finish reason: {candidate.finish_reason}")
                
                try:
                    content = response.text.strip()
                    return self._extract_json(content)
                except Exception as text_error:
                    print(f"ERROR: Could not retrieve text from Gemini response: {text_error}")
                    print(f"DEBUG: Candidate content: {candidate.content}")
                    continue

            except Exception as e:
                if any(err in str(e) for err in ["429", "503"]) and attempt < max_retries - 1:
                    wait_time = 15 if "429" in str(e) else 5
                    print(f"WARNING: Gemini {e}. Retrying in {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue
                
                # Critical errors should be raised
                if any(err in str(e) for err in ["403", "401", "PERMISSION_DENIED", "API_KEY_INVALID", "leaked"]):
                    print(f"CRITICAL ERROR: Gemini API authentication failed: {e}")
                    raise e

                print(f"ERROR: Gemini PDF extraction failed: {e}")
                return self._get_fallback_data()

    def extract_from_image(self, file_bytes: bytes, mime_type: str) -> dict:
        """Extract data directly from image bytes using Gemini with retry logic."""
        if not self.client:
            raise ValueError("Gemini API Key is missing. Please add GEMINI_API_KEY to your .env file.")

        max_retries = 5
        for attempt in range(max_retries):
            try:
                print(f"DEBUG: Sending Image directly to Gemini (Attempt {attempt+1}/{max_retries})...")
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=[
                        types.Part.from_text(text=self._get_strict_prompt()),
                        types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
                    ]
                )

                if not response or not response.candidates:
                    print(f"DEBUG: Gemini returned no candidates (Attempt {attempt+1})")
                    continue

                candidate = response.candidates[0]
                if candidate.finish_reason and candidate.finish_reason != "STOP":
                    print(f"WARNING: Gemini finish reason: {candidate.finish_reason}")

                try:
                    content = response.text.strip()
                    return self._extract_json(content)
                except Exception as text_error:
                    print(f"ERROR: Could not retrieve text from Gemini response: {text_error}")
                    print(f"DEBUG: Candidate content: {candidate.content}")
                    continue

            except Exception as e:
                if any(err in str(e) for err in ["429", "503"]) and attempt < max_retries - 1:
                    wait_time = 15 if "429" in str(e) else 5
                    print(f"WARNING: Gemini {e}. Retrying in {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(wait_time)
                    continue

                # Critical errors should be raised
                if any(err in str(e) for err in ["403", "401", "PERMISSION_DENIED", "API_KEY_INVALID", "leaked"]):
                    print(f"CRITICAL ERROR: Gemini API authentication failed: {e}")
                    raise e

                print(f"ERROR: Gemini Image extraction failed: {e}")
                return self._get_fallback_data()

    def _get_fallback_data(self):
        return {
            "invoice_number": None,
            "order_id": None,
            "date": None,
            "vendor_name": None,
            "customer_name": None,
            "total_amount": 0.0,
            "document_type": "Sales Invoice",
            "category": "Others",
            "confidence_score": 0,
            "breakdown": []
        }