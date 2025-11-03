# file_processor.py
import PyPDF2
from PIL import Image
import pytesseract

def extract_text_from_pdf(file_path: str) -> str:
    """extract text from PDF file"""
    text = ""
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            for page in reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"Error extracting PDF: {e}")
        text = "[PDF extraction failed]"
    return text

def extract_text_from_image(file_path: str) -> str:
    """extract text from image using OCR (requires pytesseract)"""
    try:
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        print(f"Error extracting image text: {e}")
        return "[Image OCR not configured or failed]"
