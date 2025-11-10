import numpy as np

# ------------------- Embedding model setup -------------------

_model = None
_embedding_available = None

def _initialize_model():
    """Lazy initialization of sentence-transformers model"""
    global _model, _embedding_available

    if _embedding_available is not None:
        return _embedding_available

    try:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer('all-MiniLM-L6-v2')
        _embedding_available = True
        print("Sentence-transformers model loaded successfully")
    except Exception as e:
        print(f"Warning: Could not load sentence-transformers model: {e}")
        print("Falling back to keyword-based matching")
        _embedding_available = False

    return _embedding_available

def get_embedding(text):
    """
    Get embedding for a single text using sentence-transformers.

    Args:
        text: String to embed

    Returns:
        numpy array of embedding, or None if embeddings unavailable
    """
    if not _initialize_model():
        return None

    try:
        embedding = _model.encode(text, convert_to_numpy=True)
        return embedding
    except Exception as e:
        print(f"Warning: Embedding failed: {e}")
        return None

def embed_batch(texts):
    """
    Embed multiple texts in a batch (more efficient than one-by-one).

    Args:
        texts: List of strings to embed

    Returns:
        numpy matrix where each row is an embedding, or None if unavailable
    """
    if not _initialize_model():
        return None

    try:
        embeddings = _model.encode(texts, convert_to_numpy=True)
        return embeddings
    except Exception as e:
        print(f"Warning: Batch embedding failed: {e}")
        return None

def is_embedding_available():
    """Check if embedding functionality is available"""
    return _initialize_model()
