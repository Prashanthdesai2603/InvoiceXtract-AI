import os
import uuid
import shutil

class FileService:
    UPLOAD_DIR = os.path.join(os.getcwd(), "uploads")

    @classmethod
    def save_file(cls, file_content: bytes, original_filename: str) -> str:
        """
        Saves file to disk and returns the relative path.
        """
        if not os.path.exists(cls.UPLOAD_DIR):
            os.makedirs(cls.UPLOAD_DIR)

        # Generate unique filename to avoid collisions
        unique_id = uuid.uuid4().hex
        ext = os.path.splitext(original_filename)[1]
        filename = f"{unique_id}{ext}"
        file_path = os.path.join(cls.UPLOAD_DIR, filename)

        with open(file_path, "wb") as f:
            f.write(file_content)

        return f"uploads/{filename}"

    @classmethod
    def get_full_path(cls, relative_path: str) -> str:
        """
        Returns absolute path from relative path.
        """
        return os.path.join(os.getcwd(), relative_path)
