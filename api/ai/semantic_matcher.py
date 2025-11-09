import requests
import numpy as np

# ------------------- Embedding functions -------------------

def get_ollama_embedding(text, model="nomic-embed-text"):
    """Get embedding from Ollama API"""
    url = "http://localhost:11434/api/embeddings"
    payload = {"model": model, "prompt": text}
    response = requests.post(url, json=payload)
    response.raise_for_status()
    return np.array(response.json()["embedding"])

def embed(texts):
    """Embed multiple texts and return numpy matrix"""
    return np.vstack([get_ollama_embedding(t) for t in texts])

def cosine_similarity(vec1, vec2):
    """Compute cosine similarity between two vectors"""
    return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))

# ------------------- Semantic task search -------------------

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
    user_vec /= np.linalg.norm(user_vec)

    matched_tasks = []
    for task in tasks:
        # Use description if available (from app), otherwise fall back to topic (from database)
        task_text = task.get("description") or task.get("topic", "")
        if not task_text:
            continue

        task_vec = get_ollama_embedding(task_text)
        task_vec /= np.linalg.norm(task_vec)
        if cosine_similarity(user_vec, task_vec) >= similarity_threshold:
            matched_tasks.append(task)

    return matched_tasks