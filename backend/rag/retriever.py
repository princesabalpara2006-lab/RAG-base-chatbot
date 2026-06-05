import os
from langchain_community.vectorstores import FAISS

# Default confidence threshold. Standard is 0.4.
DEFAULT_THRESHOLD = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.4"))

def retrieve_context(db: FAISS, query: str, k: int = 4, threshold: float = DEFAULT_THRESHOLD):
    """
    Retrieves the top k document chunks from the FAISS database and performs a confidence check.
    Returns:
        results: List of tuples (Document, score)
        max_score: The highest relevance score amongst the results
        is_confident: True if max_score >= threshold, False otherwise
    """
    # Manually calculate the exact Cosine Similarity from the Euclidean (L2) distance.
    # Since we normalized embeddings, this is: Cosine Similarity = 1.0 - (L2_distance ** 2) / 2.0
    raw_results = db.similarity_search_with_score(query, k=k)
    
    results = []
    for doc, dist in raw_results:
        # Calculate exact Cosine Similarity. Since FAISS returns squared L2 distance,
        # the formula for Cosine Similarity from normalized embeddings is: Cosine Similarity = 1.0 - dist / 2.0
        score = 1.0 - float(dist) / 2.0
        # Clamp value to be strictly in the [0.0, 1.0] range
        score = max(0.0, min(1.0, score))
        results.append((doc, score))
            
    if not results:
        return [], 0.0, False
        
    # Find the maximum score in the list
    max_score = max(score for _, score in results)
    
    # Check against our threshold
    is_confident = max_score >= threshold
    
    return results, max_score, is_confident
