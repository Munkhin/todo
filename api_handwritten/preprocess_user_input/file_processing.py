# file -> text natively to avoid latency issues

import PyPDF2
from PIL import Image
import pytesseract

def file_to_text(file) -> str:
    """convert file to text based on file type (PDF or image)"""
    import os

    # get file extension
    if hasattr(file, "filename"):
        # uploaded file object
        file_path = file.filename
    elif isinstance(file, str):
        # file path string
        file_path = file
    else:
        return "[Error: unsupported file object type]"

    ext = os.path.splitext(file_path)[1].lower()

    # route to appropriate extraction function
    if ext == ".pdf":
        return extract_text_from_pdf(file if isinstance(file, str) else file)
    elif ext in [".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".gif"]:
        return extract_text_from_image(file if isinstance(file, str) else file)
    else:
        return f"[Error: file type {ext} not supported]"

def extract_text_from_pdf(file_path: str) -> str:
    """extract text from PDF file"""
    text = ""
    try:
        with open(file_path, "rb") as file:
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
