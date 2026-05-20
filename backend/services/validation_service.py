import re
from datetime import datetime

class ValidationService:
    @staticmethod
    def validate(data: dict) -> list:
        """
        Validates extracted invoice data and returns a list of warnings.
        Handles both core fields and the new breakdown[] array.
        """
        warnings = []

        # 1. Check Missing Core Fields
        if not data.get("invoice_number"):
            warnings.append("Invoice number missing")

        if not data.get("vendor_name"):
            warnings.append("Vendor name missing")

        if not data.get("date"):
            warnings.append("Invoice date missing")

        if not data.get("total_amount"):
            warnings.append("Total amount missing")

        # 2. Validate Amount
        amount = data.get("total_amount")
        if amount is not None:
            try:
                val = float(amount)
                if val <= 0:
                    warnings.append("Total amount must be greater than zero")
                elif val < 10:
                    warnings.append("Suspicious: Total amount is very low (< 10)")
            except (ValueError, TypeError):
                warnings.append("Invalid amount format")

        # 3. Validate Date Format
        date_val = data.get("date")
        if date_val:
            try:
                if isinstance(date_val, str):
                    datetime.strptime(date_val, "%Y-%m-%d")
            except ValueError:
                warnings.append("Invalid date format (Expected YYYY-MM-DD)")

        # 4. Validate breakdown (new multi-section field)
        breakdown = data.get("breakdown")
        if breakdown is None or (isinstance(breakdown, list) and len(breakdown) == 0):
            warnings.append("No breakdown sections found — extraction may be incomplete")
        elif isinstance(breakdown, list):
            section_sum = sum(
                float(str(s.get("amount", 0)).replace(",", ""))
                for s in breakdown
                if s.get("amount") is not None
            )
            total = float(amount or 0)
            if total > 0 and abs(section_sum - total) > 0.50:
                warnings.append(
                    f"Breakdown sum (₹{section_sum:.2f}) does not match total_amount (₹{total:.2f})"
                )

        return warnings

    @staticmethod
    def normalize_data(data: dict) -> dict:
        """
        Normalizes types for database storage.
        Handles core fields + new breakdown[] array.
        """
        # 1. Date normalization
        if data.get("date"):
            try:
                if isinstance(data["date"], str):
                    # Handle multiple formats
                    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
                        try:
                            dt = datetime.strptime(data["date"], fmt)
                            data["date"] = dt.date()
                            break
                        except ValueError:
                            continue
                    else:
                        data["date"] = None
            except Exception:
                data["date"] = None

        # 2. total_amount normalization
        if data.get("total_amount") is not None:
            try:
                amount_str = str(data["total_amount"])
                amount_clean = re.sub(r'[^\d.]', '', amount_str)
                data["total_amount"] = float(amount_clean) if amount_clean else None
            except Exception:
                data["total_amount"] = None

        # 3. Normalize breakdown[] array (new multi-section data)
        breakdown = data.get("breakdown")
        if isinstance(breakdown, list):
            normalized_breakdown = []
            for sec in breakdown:
                if not isinstance(sec, dict):
                    continue

                # Normalize section type
                sec_type = str(sec.get("type", "SUPPLY")).strip().upper()
                if sec_type not in ("SUPPLY", "SERVICE", "TAX", "DISCOUNT", "FEE"):
                    sec_type = "SUPPLY"

                # Normalize section description
                sec_desc = str(sec.get("description", "")).strip()

                # Normalize section amount
                try:
                    amt_raw = str(sec.get("amount", 0))
                    amt_clean = re.sub(r'[^\d.]', '', amt_raw)
                    sec_amt = float(amt_clean) if amt_clean else 0.0
                except Exception:
                    sec_amt = 0.0

                normalized_breakdown.append({
                    "type": sec_type,
                    "description": sec_desc,
                    "amount": sec_amt
                })

            data["breakdown"] = normalized_breakdown
        else:
            data["breakdown"] = []

        return data
