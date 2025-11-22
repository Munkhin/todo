import os
import numpy as np
from openai import AsyncOpenAI

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ------------------- Embedding functions -------------------

async def get_openai_embedding(text, model="text-embedding-3-small"):
    """Get embedding from OpenAI API"""
    response = await client.embeddings.create(
        model=model,
        input=text
    )
    return np.array(response.data[0].embedding)

async def embed(texts):
    """Embed multiple texts and return numpy matrix"""
    if isinstance(texts, str):
        texts = [texts]
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )
    return np.vstack([np.array(emb.embedding) for emb in response.data])

# ------------------- Intent setup -------------------

# Example intent categories (extend freely)
intent_examples = {
    "recommend-slots": ["when should i study math?", "what's the best time for me to do this?"],
    "schedule-tasks": [ 
        "upload the tasks here",
        "help me study for my calculus exam next week",
        "I need to prepare for my presentation",
        "schedule time to work on my essay",
        "plan my biology revision",
        "help me practice piano for my recital",
        "I need to get ready for the chemistry test",
        "break down my project into study sessions"
    ],
    "delete-tasks": ["remove the previous task", "clear all my tasks", "delete tomorrow's tasks"],
    "reschedule": ["move my task forward by 2 hours", "delegate this to tomorrow", "reassign this task to somewhere next week", "plan my tasks again", "I dont like to do math in the morning"],
    "check-calendar": ["when am I free tomorrow afternoon?", "whats scheduled tomorrow?", "what are my tasks next month?"],
    "update-preferences": [
        "Limit study blocks to 90 minutes max and insert at least 15-minute breaks.",
        "From now on, keep my Sundays free. I want that day for rest.",
        "Try not to schedule any study sessions after 9 p.m. I'm usually tired by then."
        "I'm more focused in the morning, so please put my hardest subjects before noon."
    ],
    "create-event": [
        "block 2-3pm for dentist appointment",
        "I have a meeting at 3pm tomorrow",
        "remind me to call Sarah at 5pm",
        "mark 10am-11am as busy tomorrow",
        "add doctor appointment Friday 2pm",
        "reserve 1-2pm for lunch meeting",
        "block out 9am-12pm for interview"
    ]
}

# Precompute mean embeddings per intent (performed lazily)
intent_vectors: dict[str, np.ndarray] = {}


async def _initialize_intent_vectors():
    """Build embeddings for each intent when first needed."""
    if intent_vectors:
        return

    for intent, examples in intent_examples.items():
        vec = (await embed(examples)).mean(axis=0)
        vec /= np.linalg.norm(vec)
        intent_vectors[intent] = vec


# ------------------- Classification -------------------

async def classify_intent(text: str, intents: list[str], dynamic_ratio: float = 0.8) -> list[str]:
    """
    Classify text into one or more intents using dynamic thresholding.

    Args:
        text: User input message
        intents: List of intent names (must be keys in intent_vectors)
        dynamic_ratio: Ratio (0–1) for threshold relative to top similarity

    Returns:
        List of detected intent strings
    """
    await _initialize_intent_vectors()
    msg_vec = await get_openai_embedding(text)
    msg_vec /= np.linalg.norm(msg_vec)

    # Compute cosine similarity with each intent vector
    scores = {intent: float(np.dot(msg_vec, intent_vectors[intent])) for intent in intents}

    # Dynamic threshold: relative to top similarity
    top_score = max(scores.values())
    threshold = top_score * dynamic_ratio

    # Get all intents above threshold
    detected = [intent for intent, score in scores.items() if score >= threshold]
    return detected
