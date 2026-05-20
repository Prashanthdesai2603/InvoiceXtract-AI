import os
from google.cloud import vision
from dotenv import load_dotenv

load_dotenv()

class OCRService:
    def __init__(self):
        self.creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        self._client = None

    @property
    def client(self):
        if self._client is not None:
            return self._client
        
        if self.creds_path and os.path.exists(self.creds_path):
            try:
                self._client = vision.ImageAnnotatorClient()
                print("DEBUG: OCR Client initialized successfully.")
                return self._client
            except Exception as e:
                print(f"ERROR: OCR Client initialization failed: {e}")
                return None
        return None


    def extract_text_from_image(self, content: bytes) -> str:
        """Performs OCR on image bytes. PDF processing is NOT supported here anymore."""
        if not self.client:
            print("ERROR: OCR client not initialized. Cannot process image.")
            return ""

        try:
            print("DEBUG: Starting OCR text detection...")
            image = vision.Image(content=content)
            response = self.client.text_detection(image=image)

            if response.error.message:
                print(f"ERROR: Vision API error: {response.error.message}")
                raise Exception(response.error.message)

            texts = response.text_annotations

            if texts:
                extracted_text = texts[0].description
                print(f"DEBUG: OCR Extraction successful. Character count: {len(extracted_text)}")
                return extracted_text

            print("DEBUG: OCR finished but no text was found in the image.")
            return ""

        except Exception as e:
            print(f"ERROR: OCR Exception: {e}")
            return ""