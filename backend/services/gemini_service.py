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
        self.model_name = "gemini-2.5-flash"

        if api_key:
            try:
                print(f"DEBUG: Initializing Gemini model: {self.model_name}")
                self.client = genai.Client(api_key=api_key)
                self.model = True  # Mark as initialized
            except Exception as e:
                print(f"DEBUG: Gemini client init error: {e}")
                self.client = None
                self.model = None
        else:
            print("ERROR: Missing GEMINI_API_KEY")
            self.client = None
            self.model = None

    def _get_strict_prompt(self):
        return """
You are an advanced AI invoice extraction system. Analyze the given financial document carefully.

The document may contain:
- A MAIN product invoice (goods/items purchased)
- ADDITIONAL charges: Handling Fee, GT Charges, GTA, Delivery Fee, Transport, Service charges, Platform fee

Your job: Extract COMPLETE invoice data in STRICT JSON format.

---

EXTRACTION TARGETS:

1. invoice_number  → Invoice No, Bill No, Ref No, Document No, Order ID
2. invoice_date    → Invoice Date, Billing Date, Order Date (format: YYYY-MM-DD)
3. vendor_name     → Seller, Supplier, Sold By, Company Name
4. total_amount    → Grand Total = SUM of ALL breakdown amounts
5. breakdown       → Array of ALL financial sections found

---

BREAKDOWN RULES:

Each breakdown entry must have:
- "type": "SUPPLY" or "SERVICE"
- "description": short label (e.g., "Product Invoice", "GTA Handling Fee")
- "amount": numeric value (no currency symbol)

Classification:
- SUPPLY  → Product, Item, Goods, HSN Code present, main invoice total
- SERVICE → Handling Fee, GT Charges, GTA, Delivery, Transport, Freight, Service, Platform Fee, Commission

---

MULTI-PAGE / MULTI-SECTION RULES:
- Scan ALL pages of the document
- If multiple invoice sections exist → extract EACH as a separate breakdown entry
- DO NOT ignore secondary sections or small charges
- total_amount MUST equal the sum of all breakdown[].amount values
- If total_amount from doc differs from sum → recalculate and use calculated sum

---

STRICT OUTPUT FORMAT (return ONLY this JSON, no extra text):

{
  "invoice_number": "...",
  "invoice_date": "YYYY-MM-DD",
  "vendor_name": "...",
  "total_amount": 0.00,
  "breakdown": [
    {
      "type": "SUPPLY",
      "description": "...",
      "amount": 0.00
    },
    {
      "type": "SERVICE",
      "description": "...",
      "amount": 0.00
    }
  ]
}

---

RULES:
- Return ONLY valid JSON — no markdown, no explanation, no extra keys
- breakdown array must have AT LEAST 1 entry
- All amount values must be plain numbers (no ₹ or commas)
- If a field cannot be determined → use null
- total_amount must always equal sum(breakdown[].amount)
"""

    def _extract_json(self, content, raw_text=""):
        """Robust JSON extraction with multi-section breakdown support."""
        print(f"--- LOG: RAW LLM RESPONSE ---\n{content}\n-----------------------------")

        extracted_data = self._get_fallback_data()

        try:
            # 1. Clean and extract JSON block
            # Support both ```json ... ``` wrapped and raw JSON
            json_str = None

            # Try to find JSON inside code fences first
            fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
            if fence_match:
                json_str = fence_match.group(1)
            else:
                # Find outermost { ... }
                match = re.search(r"\{.*\}", content, re.DOTALL)
                if match:
                    json_str = match.group()

            if json_str:
                json_str = json_str.strip()
                try:
                    data = json.loads(json_str)
                    print(f"--- LOG: PARSED JSON ---\n{json.dumps(data, indent=2)}\n-------------------------")

                    # -- Map core fields --
                    extracted_data["invoice_number"] = data.get("invoice_number")
                    extracted_data["vendor_name"] = data.get("vendor_name")

                    # Support both "date" and "invoice_date" keys from AI
                    extracted_data["date"] = data.get("invoice_date") or data.get("date")

                    # -- total_amount --
                    amt = data.get("total_amount")
                    if amt is not None:
                        try:
                            extracted_data["total_amount"] = float(str(amt).replace(",", ""))
                        except (ValueError, TypeError):
                            extracted_data["total_amount"] = 0.0

                    # -- breakdown array --
                    breakdown_raw = data.get("breakdown")
                    if isinstance(breakdown_raw, list) and len(breakdown_raw) > 0:
                        normalized_breakdown = []
                        calculated_sum = 0.0

                        for item in breakdown_raw:
                            if not isinstance(item, dict):
                                continue

                            sec_type = str(item.get("type", "SUPPLY")).upper()
                            if sec_type not in ("SUPPLY", "SERVICE"):
                                # Reclassify unknown types
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

                        # Validate: total_amount must equal sum of breakdown
                        if calculated_sum > 0:
                            if abs(extracted_data["total_amount"] - calculated_sum) > 0.01:
                                print(f"WARNING: total_amount mismatch. AI said {extracted_data['total_amount']}, calculated {calculated_sum}. Using calculated.")
                                extracted_data["total_amount"] = round(calculated_sum, 2)

                except json.JSONDecodeError as je:
                    print(f"DEBUG: JSON parse error: {je}")
            else:
                print("DEBUG: No JSON structure found in LLM response.")

            # 2. FALLBACK LOGIC — If critical fields still missing
            if not extracted_data["total_amount"] or extracted_data["total_amount"] == 0:
                extracted_data["total_amount"] = self._fallback_extract_total(content if content else raw_text)

            if not extracted_data["date"]:
                extracted_data["date"] = self._fallback_extract_date(content if content else raw_text)

            if not extracted_data["invoice_number"]:
                extracted_data["invoice_number"] = self._fallback_extract_invoice_no(content if content else raw_text)

            # 3. If breakdown is empty but we have a total, create at least one SUPPLY entry
            if not extracted_data.get("breakdown") and extracted_data["total_amount"] > 0:
                extracted_data["breakdown"] = [{
                    "type": "SUPPLY",
                    "description": "Invoice Total",
                    "amount": extracted_data["total_amount"]
                }]

            # 4. VALIDATION
            is_valid = self._validate_extraction(extracted_data)
            if not is_valid:
                print("WARNING: Extraction failed validation (all fields null).")

            # Log missing fields
            missing = [k for k, v in extracted_data.items() if v is None or v == 0.0 or v == []]
            if missing:
                print(f"--- LOG: MISSING/EMPTY FIELDS ---: {', '.join(missing)}")

            return extracted_data

        except Exception as e:
            print(f"ERROR: Extraction process failed: {e}")
            return self._get_fallback_data()

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
            print("ERROR: Gemini client not initialized")
            return self._get_fallback_data()

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
                if "429" in str(e) and attempt < max_retries - 1:
                    print(f"WARNING: Gemini 429 (Rate Limit). Retrying in 15s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(15)
                    continue
                print(f"ERROR: Gemini text extraction failed: {e}")
                return self._get_fallback_data()

    def extract_from_pdf(self, file_bytes: bytes) -> dict:
        """Extract data directly from PDF bytes using Gemini with retry logic."""
        if not self.client:
            print("ERROR: Gemini client not initialized")
            return self._get_fallback_data()

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

                if not response or not hasattr(response, "text"):
                    print("DEBUG: Gemini returned empty or invalid response for PDF")
                    return self._get_fallback_data()

                return self._extract_json(response.text.strip())

            except Exception as e:
                if "429" in str(e) and attempt < max_retries - 1:
                    print(f"WARNING: Gemini 429 (Rate Limit). Retrying in 15s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(15)
                    continue
                # Raise exception here to be caught by the route for fallback
                if "429" in str(e):
                    raise e
                print(f"ERROR: Gemini PDF extraction failed: {e}")
                return self._get_fallback_data()

    def extract_from_image(self, file_bytes: bytes, mime_type: str) -> dict:
        """Extract data directly from image bytes using Gemini with retry logic."""
        if not self.client:
            print("ERROR: Gemini client not initialized")
            return self._get_fallback_data()

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

                if not response or not hasattr(response, "text"):
                    print("DEBUG: Gemini returned empty or invalid response for Image")
                    return self._get_fallback_data()

                return self._extract_json(response.text.strip())

            except Exception as e:
                if "429" in str(e) and attempt < max_retries - 1:
                    print(f"WARNING: Gemini 429 (Rate Limit). Retrying in 15s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(15)
                    continue
                print(f"ERROR: Gemini Image extraction failed: {e}")
                return self._get_fallback_data()

    def _get_fallback_data(self):
        return {
            "invoice_number": None,
            "date": None,
            "vendor_name": None,
            "total_amount": 0.0,
            "breakdown": []
        }