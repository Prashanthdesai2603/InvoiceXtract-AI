import cv2
import numpy as np
from PIL import Image
import io

class ImageEnhancer:
    @staticmethod
    def enhance(image_bytes: bytes) -> bytes:
        """
        Enhance image quality: improve brightness, remove noise, and auto-rotate.
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return image_bytes

            # 1. Auto-Rotate (Simple deskewing)
            img = ImageEnhancer._auto_rotate(img)

            # 2. Improve Brightness & Contrast (CLAHE - Contrast Limited Adaptive Histogram Equalization)
            lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            cl = clahe.apply(l)
            limg = cv2.merge((cl,a,b))
            img = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)

            # 3. Remove Noise (Denoising)
            img = cv2.fastNlMeansDenoisingColored(img, None, 10, 10, 7, 21)

            # Convert back to bytes
            is_success, buffer = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
            if is_success:
                return buffer.tobytes()
            
            return image_bytes
        except Exception as e:
            print(f"DEBUG: Image enhancement failed: {e}")
            return image_bytes

    @staticmethod
    def _auto_rotate(img):
        """
        Detect text orientation and rotate if necessary.
        This is a simplified version using edge detection and Hough lines.
        """
        try:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10)
            
            if lines is not None:
                angles = []
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    angle = np.arctan2(y2 - y1, x2 - x1) * 180.0 / np.pi
                    if abs(angle) < 45: # Only consider near-horizontal lines
                        angles.append(angle)
                
                if angles:
                    median_angle = np.median(angles)
                    if abs(median_angle) > 0.5:
                        (h, w) = img.shape[:2]
                        center = (w // 2, h // 2)
                        M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
                        img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            
            return img
        except:
            return img
