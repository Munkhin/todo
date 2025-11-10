import os
import numpy as np
from openai import OpenAI

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ------------------- Embedding functions -------------------

def get_openai_embedding(text, model="text-embedding-3-small"):
    """Get embedding from OpenAI API"""
    response = client.embeddings.create(
        model=model,
        input=text
    )
    return np.array(response.data[0].embedding)

def embed(texts):
    """Embed multiple texts and return numpy matrix"""
    if isinstance(texts, str):
        texts = [texts]
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return np.vstack([np.array(emb.embedding) for emb in response.data])

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
    user_vec = get_openai_embedding(user_input)
    user_vec /= np.linalg.norm(user_vec)

    matched_tasks = []
    for task in tasks:
        # Use description if available (from app), otherwise fall back to topic (from database)
        task_text = task.get("description") or task.get("topic", "")
        if not task_text:
            continue

        task_vec = get_openai_embedding(task_text)
        task_vec /= np.linalg.norm(task_vec)
        if cosine_similarity(user_vec, task_vec) >= similarity_threshold:
            matched_tasks.append(task)

    return matched_tasks