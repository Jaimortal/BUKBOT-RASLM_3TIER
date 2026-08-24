"""
Language Detection Module for Bisaya/Cebuano

Centralized language detection for the chatbot.
Supports Bisaya (Cebuano) and English language detection.
"""

from typing import List

# Centralized Bisaya/Cebuano language detection keywords
BISAYA_WORDS = [
    "asa", "unsay", "unsa", "ngano", "diin", "kinsa", "kanus-a", "pila",
    "gamay", "dako", "mao", "ug", "uy", "man", "gani", "diay", "sige",
    "kinahanglan", "kinahanglang", "kinahanglanon", "bisan", "sab", "gud", "pod", "wala", "naa", "ikaw", "ako",
    "pwedi", "pwede", "puwede", "pwedeng", "pweding", "unsaon", "onsaon", "palihog", "tabangi", "tabang", "taba", "tabange",
    "pag", "sa", "ka", "ako", "ikaw", "kita", "kami", "kinsay", "aha", "ba", "bag",
    "nako", "makita", "akong", "maayong", "gabii", "kanimo", "hapon", "buntag", "bontag",
    "maayo", "kaninyo", "kanimo", "diha", "jud", "mani", "kini",
    "nga", "mga", "kurso", "diris", "diri", "dinhi", "sudlan", "masudlan", "makasulod",
    "enrollan", "mangutana", "mangutanag", "adto", "moadto", "adtoon", "bisekleta", "bisikleta"
]


def detect_language(user_message: str) -> str:
    """
    Detect language from user message.
    
    Args:
        user_message: The user's input text
        
    Returns:
        'ceb' for Bisaya/Cebuano, 'en' for English
    """
    if not user_message:
        return "en"
    
    user_words = user_message.lower().split()
    is_bisaya = any(word in BISAYA_WORDS for word in user_words)
    return "ceb" if is_bisaya else "en"


def is_bisaya(user_message: str) -> bool:
    """
    Check if the user message is in Bisaya/Cebuano.
    
    Args:
        user_message: The user's input text
        
    Returns:
        True if Bisaya detected, False otherwise
    """
    return detect_language(user_message) == "ceb"


def get_language_keywords() -> List[str]:
    """
    Get the list of Bisaya keywords used for detection.
    
    Returns:
        List of Bisaya keywords
    """
    return BISAYA_WORDS.copy()
