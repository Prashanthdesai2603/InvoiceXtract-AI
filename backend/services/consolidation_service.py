import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ConsolidationService:
    @staticmethod
    def consolidate(extraction_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Intelligently groups and merges related invoice sections into consolidated entries.
        
        Grouping Rules:
        If invoices share:
        - same Order ID / Order Number
        - same customer/vendor
        - same uploaded PDF (implicit since we process the list from one PDF)
        
        Then treat them as ONE invoice set.
        """
        if not extraction_results:
            return []

        if len(extraction_results) == 1:
            return extraction_results

        # Grouping dictionary: key is a tuple of grouping attributes
        # (order_id, vendor_name)
        groups: Dict[tuple, List[Dict[str, Any]]] = {}

        for item in extraction_results:
            order_id = item.get("order_id") or item.get("invoice_number")
            
            # Group primarily by Order ID. If multiple vendors exist in one PDF for same Order,
            # we merge them as requested (e.g. Product Vendor + Transport Vendor).
            norm_order = str(order_id).strip().upper() if order_id else "UNKNOWN"
            
            group_key = norm_order
            
            if group_key not in groups:
                groups[group_key] = []
            groups[group_key].append(item)

        consolidated_results = []

        for group_key, items in groups.items():
            if len(items) == 1:
                consolidated_results.append(items[0])
                continue

            # Merge items in this group
            logger.info(f"Consolidating {len(items)} items for Order {group_key}")
            
            # 1. Determine the "Primary" item (usually the one with the highest amount or 'Sales Invoice' type)
            items.sort(key=lambda x: float(x.get("total_amount", 0)), reverse=True)
            base = items[0].copy()
            
            merged_breakdown = []
            
            # 2. Collect all breakdowns
            for item in items:
                item_breakdown = item.get("breakdown", [])
                for section in item_breakdown:
                    merged_breakdown.append(section.copy())
            
            # 3. Sum total amount
            total_sum = sum(float(s.get("amount", 0)) for s in merged_breakdown)
            
            base["breakdown"] = merged_breakdown
            base["total_amount"] = round(total_sum, 2)
            
            # 4. Join invoice numbers if they differ
            invoice_numbers = []
            for item in items:
                inv_no = item.get("invoice_number")
                if inv_no and str(inv_no).strip() and str(inv_no).strip() not in invoice_numbers:
                    invoice_numbers.append(str(inv_no).strip().rstrip(','))
            
            if len(invoice_numbers) > 1:
                base["invoice_number"] = "/".join(invoice_numbers) # Use slash instead of comma
            elif len(invoice_numbers) == 1:
                base["invoice_number"] = invoice_numbers[0]
            
            # 5. Join vendors if they differ? Or keep the primary? 
            # User example showed "Laptop Product" and "GT Charges" as sections.
            # We'll keep the primary vendor (usually the product seller) but maybe add a note?
            # For now, base (the one with highest amount) has the vendor.
            
            # Confidence score: average
            scores = [item.get("confidence_score", 0) for item in items]
            base["confidence_score"] = int(sum(scores) / len(scores))
            
            consolidated_results.append(base)

        return consolidated_results
