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
    """Embed multiple texts and return numpy matrix, returns None if any embedding fails"""
    embeddings = [get_ollama_embedding(t) for t in texts]
    if any(e is None for e in embeddings):
        return None
    return np.vstack(embeddings)

# ------------------- Intent setup -------------------

# Example intent categories (extend freely)
intent_examples = {
    "recommend-slots": ["when should i study math?", "what's the best time for me to do this?"],
    "schedule-tasks": ["schedule a meeting from 5 to 6", "add a coding session from 4 to 5", "upload the tasks here"],
    "delete-tasks": ["remove the previous task", "clear all my tasks", "delete tomorrow's tasks"],
    "reschedule": ["move my task forward by 2 hours", "delegate this to tomorrow", "reassign this task to somewhere next week", "plan my tasks again", "I dont like to do math in the morning"],
    "check-calendar": ["when am I free tomorrow afternoon?", "whats scheduled tomorrow?", "what are my tasks next month?"],
    "update-preferences": ["Limit study blocks to 90 minutes max and insert at least 15-minute breaks.",
                           "From now on, keep my Sundays free. I want that day for rest.",
                           "Try not to schedule any study sessions after 9 p.m. I'm usually tired by then."
                           "I'm more focused in the morning, so please put my hardest subjects before noon."
                           ]
}

# Precompute mean embeddings per intent (if Ollama is available)
intent_vectors = {}
ollama_available = True

try:
    for intent, examples in intent_examples.items():
        embedded = embed(examples)
        if embedded is None:
            # Ollama not available, skip embeddings
            ollama_available = False
            break
        vec = embedded.mean(axis=0)
        vec /= np.linalg.norm(vec)
        intent_vectors[intent] = vec
except Exception as e:
    print(f"Warning: Could not precompute intent embeddings: {e}")
    ollama_available = False

if not ollama_available:
    print("Warning: Ollama unavailable - intent classification will use keyword-based fallback")

# ------------------- Classification -------------------

def classify_intent_keyword_fallback(text: str, intents: list[str]) -> list[str]:
    """
    Keyword-based intent classification fallback when embeddings unavailable.

    Args:
        text: User input message
        intents: List of intent names (must be keys in intent_examples)

    Returns:
        List of detected intent strings
    """
    text_lower = text.lower()
    detected = []

    # Define keyword patterns for each intent
    keyword_patterns = {
        "recommend-slots": ["when should", "best time", "recommend", "suggest time"],
        "schedule-tasks": ["schedule", "add", "create", "upload", "meeting", "session"],
        "delete-tasks": ["delete", "remove", "clear", "cancel"],
        "reschedule": ["move", "reschedule", "delegate", "reassign", "plan again", "change time"],
        "check-calendar": ["when am i free", "what's scheduled", "check calendar", "show tasks", "what are my"],
        "update-preferences": ["limit", "preference", "keep", "free", "try not to", "focused in", "max", "break"]
    }

    for intent in intents:
        if intent in keyword_patterns:
            # Check if any keyword pattern matches
            if any(keyword in text_lower for keyword in keyword_patterns[intent]):
                detected.append(intent)

    # If no matches found, default to schedule-tasks
    if not detected:
        detected = ["schedule-tasks"]

    return detected

def classify_intent(text: str, intents: list[str], dynamic_ratio: float = 0.8) -> list[str]:
    """
    Classify text into one or more intents using dynamic thresholding.

    Args:
        text: User input message
        intents: List of intent names (must be keys in intent_vectors)
        dynamic_ratio: Ratio (0–1) for threshold relative to top similarity

    Returns:
        List of detected intent strings
    """
    # Use keyword fallback if embeddings unavailable
    if not ollama_available or not intent_vectors:
        print("Warning: Using keyword-based fallback for intent classification")
        return classify_intent_keyword_fallback(text, intents)

    msg_vec = get_ollama_embedding(text)

    # If embedding fails at runtime, use fallback
    if msg_vec is None:
        print("Warning: Using keyword-based fallback for intent classification")
        return classify_intent_keyword_fallback(text, intents)

    msg_vec /= np.linalg.norm(msg_vec)

    # Compute cosine similarity with each intent vector
    scores = {intent: float(np.dot(msg_vec, intent_vectors[intent])) for intent in intents}

    # Dynamic threshold: relative to top similarity
    top_score = max(scores.values())
    threshold = top_score * dynamic_ratio

    # Get all intents above threshold
    detected = [intent for intent, score in scores.items() if score >= threshold]
    return detected

