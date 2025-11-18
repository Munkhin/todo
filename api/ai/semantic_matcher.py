import os
from collections.abc import Sequence
from typing import Any

import numpy as np
from openai import OpenAI

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _normalize_query_text(value: Any) -> str:
    """Ensure embeddings always receive a string payload."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, Sequence):
        return "\n".join(str(item) for item in value)
    raise TypeError("Task matching text must be a string or list of strings.")


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
    normalized = texts
    if isinstance(normalized, str):
        normalized = [normalized]
    elif isinstance(normalized, Sequence):
        normalized = [str(item) for item in normalized]
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=normalized
    )
    return np.vstack([np.array(emb.embedding) for emb in response.data])


def cosine_similarity(vec1, vec2):
    """Compute cosine similarity between two vectors"""
    return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))


# ------------------- Semantic task search -------------------

def match_tasks(user_text, tasks, similarity_threshold=0.75):
    """
    Filter tasks semantically matching the user input.

    Args:
        user_text: String/list describing task to delete
        tasks: List of dicts, each with "title" or "description" key
        similarity_threshold: Min cosine similarity to consider a match

    Returns:
        List of matched tasks
    """
    normalized_text = _normalize_query_text(user_text)

    user_vec = get_openai_embedding(normalized_text)
    user_vec /= np.linalg.norm(user_vec)

    matched_tasks = []
    for task in tasks:
        # Use title or description for matching
        task_text = task.get("title") or task.get("description", "")
        if not task_text:
            continue

        task_vec = get_openai_embedding(task_text)
        task_vec /= np.linalg.norm(task_vec)
        if cosine_similarity(user_vec, task_vec) >= similarity_threshold:
            matched_tasks.append(task)

    return matched_tasks
