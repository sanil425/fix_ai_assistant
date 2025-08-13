#!/usr/bin/env python3
"""
Simple test script for the /api/ask endpoint
Run this after starting the backend to verify it works
"""

import requests
import json
import os

def test_ask_endpoint():
    """Test the /api/ask endpoint"""
    
    # Test 1: Missing API key (should return 500)
    print("Test 1: Missing API key (should return 500)")
    try:
        resp = requests.post("http://localhost:8000/api/ask", json={
            "user_prompt": "What is tag 55?",
            "fix_version": "4.4"
        })
        print(f"Status: {resp.status_code}")
        if resp.status_code == 500:
            print("✅ Correctly returned 500 for missing API key")
        else:
            print(f"❌ Expected 500, got {resp.status_code}")
    except Exception as e:
        print(f"❌ Request failed: {e}")
    
    print("\n" + "="*50 + "\n")
    
    # Test 2: With API key (if available)
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        print("Test 2: With API key")
        try:
            resp = requests.post("http://localhost:8000/api/ask", json={
                "user_prompt": "What is tag 55?",
                "fix_version": "4.4"
            })
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print("✅ Success! Response:")
                print(f"Answer: {data.get('answer', 'N/A')}")
                print(f"Action: {json.dumps(data.get('action', {}), indent=2)}")
            else:
                print(f"❌ Expected 200, got {resp.status_code}")
                print(f"Response: {resp.text}")
        except Exception as e:
            print(f"❌ Request failed: {e}")
    else:
        print("Test 2: Skipped (no OPENAI_API_KEY in environment)")
        print("Set OPENAI_API_KEY to test with actual OpenAI calls")

if __name__ == "__main__":
    print("Testing /api/ask endpoint...")
    print("Make sure the backend is running on http://localhost:8000")
    print()
    test_ask_endpoint()
