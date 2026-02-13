import requests
import sys

BASE_URL = "http://localhost:8000"

def test_endpoint(name, method, url, expected_status, payload=None):
    try:
        print(f"Testing {name}: {method} {url}...")
        if method == "GET":
            response = requests.get(f"{BASE_URL}{url}")
        elif method == "POST":
            response = requests.post(f"{BASE_URL}{url}", json=payload)
        
        if response.status_code in expected_status:
            print(f"[PASS] {name} (Status: {response.status_code})")
            return True
        else:
            print(f"[FAIL] {name} (Status: {response.status_code}, Expected: {expected_status})")
            print(f"Response: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"[ERROR] {name}: {str(e)}")
        return False

def main():
    results = []
    
    # 1. Health Check
    results.append(test_endpoint("Health Check", "GET", "/api/health/status", [200]))
    
    # 2. Portal Settings (No Auth)
    results.append(test_endpoint("Portal Settings", "GET", "/api/portal/settings", [200]))
    
    # 3. Auth Login (Empty Body -> Validation Error 422)
    results.append(test_endpoint("Auth Login Validation", "POST", "/api/auth/login", [422]))
    
    # 4. Docs (Swagger UI)
    results.append(test_endpoint("Swagger Docs", "GET", "/docs", [200]))
    
    if all(results):
        print("\n[SUCCESS] All critical endpoint checks passed!")
        sys.exit(0)
    else:
        print("\n[WARNING] Some checks failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
