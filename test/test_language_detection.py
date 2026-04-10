#!/usr/bin/env python3
"""
Test script to verify Bisaya language detection fixes
"""

def test_bisaya_detection():
    """Test the improved Bisaya detection logic"""
    
    # Updated Bisaya word list (removed problematic words)
    bisaya_words = [
        "unsay", "unsa", "asa", "ngano", "diin", "kinsa", "kanus-a", 
        "pila", "gamay", "dako", "mao", "ug", "uy", "man", "gani", 
        "diay", "sige", "kinahanglan", "bisan", "sab", "gud", "pod", 
        "wala", "naa", "ikaw", "ako"
    ]
    
    def detect_language(user_message):
        """Simulate the improved detection logic"""
        user_words = user_message.lower().split()
        is_bisaya = any(word in bisaya_words for word in user_words)
        return "ceb" if is_bisaya else "en"
    
    # Test cases
    test_cases = [
        # English questions that should NOT trigger Bisaya
        ("where can i find the finance office?", "en"),
        ("is attendance in buksu is mandatory", "en"),
        ("what is the schedule for monday", "en"),
        ("can you help me with registration", "en"),
        ("where is the library located", "en"),
        
        # Bisaya questions that SHOULD trigger Bisaya
        ("asa ang opisina sa finance?", "ceb"),
        ("kinahanglan ba ang attendance?", "ceb"),
        ("unsay oras sa klase?", "ceb"),
        ("diin ang library?", "ceb"),
        ("pila ang tuition?", "ceb"),
        
        # Mixed cases
        ("where is the office? asa kaha?", "ceb"),  # Contains Bisaya word
        ("what time naa class?", "ceb"),  # Contains Bisaya word
    ]
    
    print("Testing Bisaya Language Detection Fixes")
    print("=" * 50)
    
    all_passed = True
    for message, expected in test_cases:
        detected = detect_language(message)
        status = "✓" if detected == expected else "✗"
        print(f"{status} '{message}' -> {detected} (expected: {expected})")
        if detected != expected:
            all_passed = False
    
    print("=" * 50)
    if all_passed:
        print("✓ All tests passed! The fix should work correctly.")
    else:
        print("✗ Some tests failed. Further investigation needed.")
    
    return all_passed

if __name__ == "__main__":
    test_bisaya_detection()
