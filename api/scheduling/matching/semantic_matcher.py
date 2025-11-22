import os
import numpy as np
from openai import OpenAI

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def get_openai_embedding(text: str, model="text-embedding-3-small"):

    """Get embeddings for text string"""

    response = client.embeddings.create(
        model=model,
        input=text
    )
    return np.array(response.data[0].embedding)


def cosine_similarity(vec1, vec2):

    """Compute cosine similarity between two vectors."""

    return float(np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2)))


def match_tasks(user_text: str, tasks, similarity_threshold=0.75):
    """
    Filter tasks semantically matching the user input.

    Args:
        user_text: String describing task to delete.
        tasks: List of dicts, each with "title" or "description".
        similarity_threshold: Min cosine similarity to consider a match.

    Returns:
        List of matched tasks.
    """

    user_vec = get_openai_embedding(user_text)
    user_vec /= np.linalg.norm(user_vec)

    matched_tasks = []

    for task in tasks:
        task_text = task.get("title")
        if not task_text:
            continue

        task_vec = get_openai_embedding(task_text)
        task_vec /= np.linalg.norm(task_vec)

        if cosine_similarity(user_vec, task_vec) >= similarity_threshold:
            matched_tasks.append(task)

    return matched_tasks
