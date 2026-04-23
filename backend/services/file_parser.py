import os
import fitz  # PyMuPDF
from docx import Document
import pandas as pd
from io import BytesIO

class FileParser:
    @staticmethod
    def extract_text(file_content: bytes, file_extension: str) -> str:
        if file_extension.lower() == ".pdf":
            return FileParser._parse_pdf(file_content)
        elif file_extension.lower() == ".docx":
            return FileParser._parse_docx(file_content)
        elif file_extension.lower() == ".xlsx" or file_extension.lower() == ".xls":
            return FileParser._parse_excel(file_content)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")

    @staticmethod
    def _parse_pdf(file_content: bytes) -> str:
        text = ""
        with fitz.open(stream=file_content, filetype="pdf") as doc:
            for page in doc:
                text += page.get_text()
        return text

    @staticmethod
    def _parse_docx(file_content: bytes) -> str:
        doc = Document(BytesIO(file_content))
        return "\n".join([para.text for para in doc.paragraphs])

    @staticmethod
    def _parse_excel(file_content: bytes) -> str:
        df = pd.read_excel(BytesIO(file_content))
        return df.to_string()
