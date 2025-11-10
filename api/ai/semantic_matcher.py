import requests
import numpy as np
from requests.exceptions import ConnectionError, Timeout

# ------------------- Embedding functions -------------------

def get_ollama_embedding(text, model="nomic-embed-text"):
    """Get embedding from Ollama API with error handling"""
    try:
        url = "http://localhost:11434/api/embeddings"
        payload = {"model": model, "prompt": text}
        response = requests.post(url, json=payload, timeout=5)
        response.raise_for_status()
        return np.array(response.json()["embedding"])
    except (ConnectionError, Timeout) as e:
        # Ollama is not available - return None to trigger fallback
        return None
    except Exception as e:
        # Other errors (API errors, invalid response, etc.)
        print(f"Warning: Ollama embedding failed: {e}")
        return None

def embed(texts):
    """Embed multiple texts and return numpy matrix"""
    return np.vstack([get_ollama_embedding(t) for t in texts])

def cosine_similarity(vec1, vec2):
    """Compute cosine similarity between two vectors"""
    return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))

# ------------------- Semantic task search -------------------

def match_tasks_keyword_fallback(user_input, tasks):
    """
    Simple keyword-based matching when embeddings are unavailable.

    Args:
        user_input: String describing task to delete
        tasks: List of dicts, each with "description" or "topic" key

    Returns:
        List of matched tasks
    """
    user_keywords = set(user_input.lower().split())
    matched_tasks = []

    for task in tasks:
        task_text = task.get("description") or task.get("topic", "")
        if not task_text:
            continue

        task_keywords = set(task_text.lower().split())
        # Check if any keywords overlap
        if user_keywords & task_keywords:
            matched_tasks.append(task)

    return matched_tasks

def match_tasks(user_input, tasks, similarity_threshold=0.75):
    """
    Filter tasks semantically matching the user input.

    Args:
        user_input: String describing task to delete
        tasks: List of dicts, each with "description" or "topic" key
        similarity_threshold: Min cosine similarity to consider a match

    Returns:
        List of matched tasks
    """
    user_vec = get_ollama_embedding(user_input)

    # Fallback to keyword matching if embeddings unavailable
    if user_vec is None:
        print("Warning: Using keyword-based fallback for task matching (Ollama unavailable)")
        return match_tasks_keyword_fallback(user_input, tasks)

    user_vec /= np.linalg.norm(user_vec)

    matched_tasks = []
    for task in tasks:
        # Use description if available (from app), otherwise fall back to topic (from database)
        task_text = task.get("description") or task.get("topic", "")
        if not task_text:
            continue

        task_vec = get_ollama_embedding(task_text)
        if task_vec is None:
            # If embedding fails, skip this task
            continue

        task_vec /= np.linalg.norm(task_vec)
        if cosine_similarity(user_vec, task_vec) >= similarity_threshold:
            matched_tasks.append(task)

    return matched_tasks