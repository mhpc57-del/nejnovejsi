"""
Iteration 8 - Backend API Tests for CraftBolt.cz
Focus: Registration endpoint (BackgroundTasks for email), Geocoding, Categories, ARES

Tests:
1. POST /api/auth/register - should return immediately (not blocked by email)
2. POST /api/auth/register with duplicate email - should return 400
3. POST /api/auth/register with supplier role including all fields
4. GET /api/geocode/search?q=Praha - should return location results
5. GET /api/geocode/search?q=Brno - should return results
6. GET /api/categories - should return 61+ categories
7. POST /api/categories/suggest - requires auth token
8. GET /api/ares/27082440 - should return company info
9. POST /api/auth/login with valid credentials
10. GET /api/health - should return healthy status
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Health check and basic API tests"""
    
    def test_health_endpoint(self):
        """GET /api/health - should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy", f"Unexpected health status: {data}"
        print("✓ Health endpoint returns healthy status")
    
    def test_root_endpoint(self):
        """GET /api/ - should return API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"Root endpoint failed: {response.text}"
        data = response.json()
        assert "CraftBolt" in data.get("message", ""), f"Unexpected root response: {data}"
        print("✓ Root endpoint returns API info")


class TestRegistration:
    """Registration endpoint tests - key fix: BackgroundTasks for email"""
    
    def test_register_returns_immediately(self):
        """POST /api/auth/register - should return fast (< 2 seconds) since email is in background"""
        unique_email = f"test-timing-{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "TestPassword123!",
            "phone": "+420123456789",
            "role": "customer",
            "first_name": "Test",
            "last_name": "Timing"
        }
        
        start_time = time.time()
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        elapsed_time = time.time() - start_time
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        assert elapsed_time < 2.0, f"Registration took too long: {elapsed_time:.2f}s (should be < 2s)"
        
        data = response.json()
        assert "access_token" in data, f"Missing access_token in response: {data}"
        assert "user" in data, f"Missing user in response: {data}"
        assert data["user"]["email"] == unique_email
        
        print(f"✓ Registration completed in {elapsed_time:.2f}s (< 2s threshold)")
        print(f"✓ Token returned: {data['access_token'][:20]}...")
    
    def test_register_duplicate_email_returns_400(self):
        """POST /api/auth/register with duplicate email - should return 400"""
        # First registration
        unique_email = f"test-dup-{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "TestPassword123!",
            "phone": "+420111222333",
            "role": "customer",
            "first_name": "First",
            "last_name": "User"
        }
        
        response1 = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response1.status_code == 200, f"First registration failed: {response1.text}"
        
        # Second registration with same email
        response2 = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response2.status_code == 400, f"Expected 400 for duplicate email, got {response2.status_code}: {response2.text}"
        
        data = response2.json()
        assert "already registered" in data.get("detail", "").lower() or "email" in data.get("detail", "").lower(), \
            f"Expected 'Email already registered' error, got: {data}"
        
        print(f"✓ Duplicate email returns 400 with message: {data.get('detail')}")
    
    def test_register_supplier_with_all_fields(self):
        """POST /api/auth/register with supplier role including ico, dic, company_name, categories, service_areas"""
        unique_email = f"test-supplier-{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "email": unique_email,
            "password": "SupplierPass123!",
            "phone": "+420777888999",
            "role": "supplier",
            "account_type": "company",
            "company_name": "Test Firma s.r.o.",
            "first_name": "Jan",
            "last_name": "Novák",
            "ico": "12345678",
            "dic": "CZ12345678",
            "address": "Testovací 123, Praha",
            "branch_address": "Pobočka 456, Brno",
            "website": "https://testfirma.cz",
            "categories": ["Elektrikář", "Instalatér"],
            "service_areas": [
                {"display_name": "Praha", "lat": 50.0755, "lon": 14.4378},
                {"display_name": "Brno", "lat": 49.1951, "lon": 16.6068}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Supplier registration failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, f"Missing access_token: {data}"
        
        user = data["user"]
        assert user["email"] == unique_email
        assert user["role"] == "supplier"
        assert user["company_name"] == "Test Firma s.r.o."
        assert user["ico"] == "12345678"
        assert user["dic"] == "CZ12345678"
        assert user["website"] == "https://testfirma.cz"
        assert "Elektrikář" in user.get("categories", [])
        assert "Instalatér" in user.get("categories", [])
        assert len(user.get("service_areas", [])) == 2
        
        print(f"✓ Supplier registered with all fields:")
        print(f"  - company_name: {user['company_name']}")
        print(f"  - ico: {user['ico']}")
        print(f"  - dic: {user['dic']}")
        print(f"  - categories: {user['categories']}")
        print(f"  - service_areas: {len(user['service_areas'])} areas")


class TestLogin:
    """Login endpoint tests"""
    
    def test_login_with_valid_credentials(self):
        """POST /api/auth/login with valid credentials - should return token"""
        payload = {
            "email": "m.schwarzer@email.cz",
            "password": "CraftBolt2026!"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, f"Missing access_token: {data}"
        assert "user" in data, f"Missing user: {data}"
        assert data["user"]["email"] == "m.schwarzer@email.cz"
        assert data["user"]["role"] == "admin"
        
        print(f"✓ Admin login successful, token: {data['access_token'][:20]}...")
        return data["access_token"]
    
    def test_login_with_invalid_credentials(self):
        """POST /api/auth/login with invalid credentials - should return 401"""
        payload = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ Invalid credentials returns 401")


class TestGeocoding:
    """Geocoding endpoint tests - used for address autocomplete"""
    
    def test_geocode_search_praha(self):
        """GET /api/geocode/search?q=Praha - should return array of location results"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Praha"})
        assert response.status_code == 200, f"Geocode search failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected array, got: {type(data)}"
        assert len(data) > 0, "Expected at least one result for Praha"
        
        # Check first result has required fields
        first_result = data[0]
        assert "display_name" in first_result, f"Missing display_name: {first_result}"
        assert "lat" in first_result, f"Missing lat: {first_result}"
        assert "lon" in first_result, f"Missing lon: {first_result}"
        
        print(f"✓ Geocode search 'Praha' returned {len(data)} results")
        print(f"  First result: {first_result.get('display_name', '')[:60]}...")
    
    def test_geocode_search_brno(self):
        """GET /api/geocode/search?q=Brno - should return results"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Brno"})
        assert response.status_code == 200, f"Geocode search failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected array, got: {type(data)}"
        assert len(data) > 0, "Expected at least one result for Brno"
        
        # Verify Brno is in results
        has_brno = any("Brno" in r.get("display_name", "") for r in data)
        assert has_brno, f"Expected 'Brno' in results: {data}"
        
        print(f"✓ Geocode search 'Brno' returned {len(data)} results")
    
    def test_geocode_search_specific_address(self):
        """GET /api/geocode/search with specific address"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Václavské náměstí, Praha"})
        assert response.status_code == 200, f"Geocode search failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected array, got: {type(data)}"
        print(f"✓ Geocode search 'Václavské náměstí, Praha' returned {len(data)} results")


class TestCategories:
    """Categories endpoint tests"""
    
    def test_get_categories(self):
        """GET /api/categories - should return {categories: [...]} with 61+ items"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Categories fetch failed: {response.text}"
        
        data = response.json()
        assert "categories" in data, f"Missing 'categories' key: {data}"
        
        categories = data["categories"]
        assert isinstance(categories, list), f"Expected array, got: {type(categories)}"
        assert len(categories) >= 61, f"Expected 61+ categories, got {len(categories)}"
        
        # Check some expected categories exist (using actual category names)
        expected_categories = ["Instalatérství", "Malířství, natěračství", "Stavební práce, rekonstrukce"]
        for cat in expected_categories:
            assert cat in categories, f"Missing expected category: {cat}"
        
        print(f"✓ Categories endpoint returned {len(categories)} categories")
        print(f"  Sample: {categories[:5]}...")
    
    def test_suggest_category_requires_auth(self):
        """POST /api/categories/suggest - should require auth token"""
        payload = {"name": "Test Category"}
        
        # Without auth
        response = requests.post(f"{BASE_URL}/api/categories/suggest", json=payload)
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Category suggestion requires authentication")
    
    def test_suggest_category_with_auth(self):
        """POST /api/categories/suggest - should accept category name with auth"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "m.schwarzer@email.cz",
            "password": "CraftBolt2026!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["access_token"]
        
        # Suggest category with auth
        headers = {"Authorization": f"Bearer {token}"}
        payload = {"name": f"Test Category {uuid.uuid4().hex[:6]}"}
        
        response = requests.post(f"{BASE_URL}/api/categories/suggest", json=payload, headers=headers)
        assert response.status_code == 200, f"Category suggestion failed: {response.text}"
        
        data = response.json()
        assert "message" in data, f"Missing message in response: {data}"
        
        print(f"✓ Category suggestion accepted: {data.get('message')}")


class TestARES:
    """ARES (Czech company registry) endpoint tests"""
    
    def test_ares_lookup_valid_ico(self):
        """GET /api/ares/27082440 - should return company info from Czech registry"""
        # 27082440 is Alza.cz a.s.
        response = requests.get(f"{BASE_URL}/api/ares/27082440", timeout=15)
        assert response.status_code == 200, f"ARES lookup failed: {response.text}"
        
        data = response.json()
        assert "company_name" in data, f"Missing company_name: {data}"
        assert "ico" in data, f"Missing ico: {data}"
        assert "address" in data, f"Missing address: {data}"
        
        # Verify it's Alza
        assert "Alza" in data["company_name"], f"Expected Alza company, got: {data['company_name']}"
        assert data["ico"] == "27082440"
        
        print(f"✓ ARES lookup returned:")
        print(f"  - company_name: {data['company_name']}")
        print(f"  - ico: {data['ico']}")
        print(f"  - dic: {data.get('dic', 'N/A')}")
        print(f"  - address: {data.get('address', 'N/A')}")
    
    def test_ares_lookup_invalid_ico(self):
        """GET /api/ares/00000000 - should return 404 for invalid ICO"""
        response = requests.get(f"{BASE_URL}/api/ares/00000000", timeout=15)
        assert response.status_code in [404, 503], f"Expected 404/503 for invalid ICO, got {response.status_code}: {response.text}"
        print(f"✓ Invalid ICO returns {response.status_code}")
    
    def test_ares_lookup_another_company(self):
        """GET /api/ares/25788001 - test with another valid ICO (Škoda Auto)"""
        response = requests.get(f"{BASE_URL}/api/ares/25788001", timeout=15)
        assert response.status_code == 200, f"ARES lookup failed: {response.text}"
        
        data = response.json()
        assert "company_name" in data, f"Missing company_name: {data}"
        print(f"✓ ARES lookup for 25788001: {data['company_name']}")


class TestRegistrationTiming:
    """Additional timing tests for registration to verify BackgroundTasks fix"""
    
    def test_multiple_registrations_fast(self):
        """Multiple registrations should all be fast (verifies email doesn't block)"""
        times = []
        
        for i in range(3):
            unique_email = f"test-multi-{uuid.uuid4().hex[:8]}@example.com"
            payload = {
                "email": unique_email,
                "password": "TestPassword123!",
                "phone": f"+42012345678{i}",
                "role": "customer",
                "first_name": f"Test{i}",
                "last_name": "User"
            }
            
            start_time = time.time()
            response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
            elapsed = time.time() - start_time
            times.append(elapsed)
            
            assert response.status_code == 200, f"Registration {i} failed: {response.text}"
            assert elapsed < 3.0, f"Registration {i} took too long: {elapsed:.2f}s"
        
        avg_time = sum(times) / len(times)
        print(f"✓ 3 registrations completed:")
        print(f"  - Times: {[f'{t:.2f}s' for t in times]}")
        print(f"  - Average: {avg_time:.2f}s")
        assert avg_time < 2.0, f"Average registration time too high: {avg_time:.2f}s"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
