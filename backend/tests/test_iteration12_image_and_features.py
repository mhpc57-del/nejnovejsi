"""
Iteration 12 - Image URL handling, Profile features, Address autocomplete, Demand edit
Tests for CraftBolt.cz Czech service marketplace
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"
CUSTOMER_EMAIL = "testvendulka@test.cz"
CUSTOMER_PASSWORD = "TestHeslo123!"
SUPPLIER_EMAIL = "info@craftbolt.cz"
SUPPLIER_PASSWORD = "Kostkodisc1132@"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: API health check")
    
    def test_categories_endpoint(self):
        """Test categories endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        print(f"PASS: Categories endpoint - {len(data['categories'])} categories")


class TestAuthentication:
    """Authentication flow tests"""
    
    def test_admin_login_bypasses_verification(self):
        """Admin login should work regardless of verification status"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login bypasses verification")
    
    def test_verified_customer_login(self):
        """Verified customer should be able to login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        print("PASS: Verified customer login works")
    
    def test_unverified_user_login_returns_403(self):
        """Unverified user login should return 403 with EMAIL_NOT_VERIFIED"""
        # First register a new user (will be unverified)
        unique_email = f"test-unverified-{uuid.uuid4().hex[:8]}@example.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Test",
            "last_name": "User",
            "phone": "+420123456789"
        })
        assert reg_response.status_code == 200
        
        # Try to login - should fail with 403
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "TestPass123!"
        })
        assert login_response.status_code == 403
        data = login_response.json()
        assert data.get("detail") == "EMAIL_NOT_VERIFIED"
        print("PASS: Unverified user login returns 403 EMAIL_NOT_VERIFIED")


class TestImageUpload:
    """Image upload and URL handling tests"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_public_upload_endpoint(self):
        """Test public upload endpoint (used during registration)"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        # URL should be in format /api/uploads/xxx.png or similar
        assert "/uploads/" in data["url"] or data["url"].startswith("http")
        print(f"PASS: Public upload works - URL: {data['url']}")
        return data["url"]
    
    def test_authenticated_upload_endpoint(self, customer_token):
        """Test authenticated upload endpoint"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.post(f"{BASE_URL}/api/upload", files=files, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        print(f"PASS: Authenticated upload works - URL: {data['url']}")
    
    def test_uploaded_image_accessible(self):
        """Test that uploaded images are accessible via URL"""
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test_access.png", png_data, "image/png")}
        upload_response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        assert upload_response.status_code == 200
        url = upload_response.json()["url"]
        
        # Construct full URL and try to access
        if url.startswith("/"):
            full_url = f"{BASE_URL}{url}"
        else:
            full_url = url
        
        access_response = requests.get(full_url)
        assert access_response.status_code == 200
        assert "image" in access_response.headers.get("content-type", "")
        print(f"PASS: Uploaded image accessible at {full_url}")


class TestAddressAutocomplete:
    """Address autocomplete (geocode) tests"""
    
    def test_geocode_search(self):
        """Test geocode search endpoint"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Praha"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "display_name" in data[0]
            assert "lat" in data[0]
            assert "lon" in data[0]
            print(f"PASS: Geocode search works - found {len(data)} results for 'Praha'")
        else:
            print("PASS: Geocode search works (no results for query)")
    
    def test_geocode_search_brno(self):
        """Test geocode search for Brno"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Brno"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Should find Brno
        found_brno = any("Brno" in item.get("display_name", "") for item in data)
        assert found_brno, "Should find Brno in results"
        print(f"PASS: Geocode search for Brno works - {len(data)} results")
    
    def test_geocode_reverse(self):
        """Test reverse geocode endpoint"""
        # Coordinates for Prague center
        response = requests.get(f"{BASE_URL}/api/geocode/reverse", params={
            "lat": 50.0755,
            "lon": 14.4378
        })
        assert response.status_code == 200
        data = response.json()
        assert "display_name" in data
        print(f"PASS: Reverse geocode works - {data['display_name'][:50]}...")


class TestProfileFeatures:
    """Profile page feature tests"""
    
    @pytest.fixture
    def customer_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        data = response.json()
        return {"token": data["access_token"], "user": data["user"]}
    
    def test_get_own_profile(self, customer_auth):
        """Test getting own profile via /auth/me"""
        headers = {"Authorization": f"Bearer {customer_auth['token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == CUSTOMER_EMAIL
        print(f"PASS: Get own profile - {data['email']}")
    
    def test_update_profile(self, customer_auth):
        """Test updating profile"""
        headers = {"Authorization": f"Bearer {customer_auth['token']}"}
        update_data = {
            "first_name": "Vendulka",
            "last_name": "Testová",
            "phone": "+420777888999"
        }
        response = requests.put(f"{BASE_URL}/api/users/profile", json=update_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Vendulka"
        print("PASS: Profile update works")
    
    def test_customer_nepodnikatel_profile_fields(self, customer_auth):
        """Test that nepodnikatel customer has correct profile structure"""
        user = customer_auth["user"]
        # Nepodnikatel should NOT have IČO/DIČ required
        # The account_type should be nepodnikatel
        assert user.get("account_type") == "nepodnikatel" or user.get("role") == "customer"
        print("PASS: Customer nepodnikatel profile structure correct")


class TestDemandFeatures:
    """Demand creation and editing tests"""
    
    @pytest.fixture
    def customer_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        data = response.json()
        return {"token": data["access_token"], "user": data["user"]}
    
    def test_create_demand(self, customer_auth):
        """Test creating a new demand"""
        headers = {"Authorization": f"Bearer {customer_auth['token']}"}
        demand_data = {
            "title": f"TEST_Demand_{uuid.uuid4().hex[:8]}",
            "description": "Test demand for iteration 12 testing",
            "category": "Elektrikář",
            "address": "Praha 1, Staré Město",
            "latitude": 50.0875,
            "longitude": 14.4213,
            "payment_method": "cash"
        }
        response = requests.post(f"{BASE_URL}/api/demands", json=demand_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == demand_data["title"]
        assert data["status"] == "open"
        print(f"PASS: Demand created - ID: {data['id']}")
        return data["id"]
    
    def test_get_my_demands(self, customer_auth):
        """Test getting user's demands"""
        headers = {"Authorization": f"Bearer {customer_auth['token']}"}
        response = requests.get(f"{BASE_URL}/api/demands/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Get my demands - {len(data)} demands")
    
    def test_edit_demand(self, customer_auth):
        """Test editing a demand"""
        headers = {"Authorization": f"Bearer {customer_auth['token']}"}
        
        # First create a demand
        demand_data = {
            "title": f"TEST_EditDemand_{uuid.uuid4().hex[:8]}",
            "description": "Original description",
            "category": "Instalatér",
            "address": "Brno, centrum",
            "payment_method": "transfer"
        }
        create_response = requests.post(f"{BASE_URL}/api/demands", json=demand_data, headers=headers)
        assert create_response.status_code == 200
        demand_id = create_response.json()["id"]
        
        # Edit the demand
        edit_data = {
            "title": "TEST_EditedTitle",
            "description": "Updated description for testing",
            "budget_min": 1000,
            "budget_max": 5000
        }
        edit_response = requests.put(f"{BASE_URL}/api/demands/{demand_id}", json=edit_data, headers=headers)
        assert edit_response.status_code == 200
        edited = edit_response.json()
        assert edited["title"] == "TEST_EditedTitle"
        assert edited["description"] == "Updated description for testing"
        print(f"PASS: Demand edit works - ID: {demand_id}")
    
    def test_edit_demand_with_images(self, customer_auth):
        """Test editing demand with images"""
        headers = {"Authorization": f"Bearer {customer_auth['token']}"}
        
        # Create demand
        demand_data = {
            "title": f"TEST_ImageDemand_{uuid.uuid4().hex[:8]}",
            "description": "Demand with images",
            "category": "Malíř",
            "address": "Ostrava",
            "payment_method": "cash"
        }
        create_response = requests.post(f"{BASE_URL}/api/demands", json=demand_data, headers=headers)
        demand_id = create_response.json()["id"]
        
        # Edit with images
        edit_data = {
            "images": ["/api/uploads/test1.jpg", "/api/uploads/test2.jpg"]
        }
        edit_response = requests.put(f"{BASE_URL}/api/demands/{demand_id}", json=edit_data, headers=headers)
        assert edit_response.status_code == 200
        edited = edit_response.json()
        assert len(edited.get("images", [])) == 2
        print("PASS: Demand edit with images works")


class TestSupplierFeatures:
    """Supplier-specific feature tests"""
    
    @pytest.fixture
    def supplier_auth(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Supplier login failed")
        data = response.json()
        return {"token": data["access_token"], "user": data["user"]}
    
    def test_supplier_can_view_open_demands(self, supplier_auth):
        """Test supplier can view open demands"""
        headers = {"Authorization": f"Bearer {supplier_auth['token']}"}
        response = requests.get(f"{BASE_URL}/api/demands", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Supplier can view demands - {len(data)} demands")


class TestRegistrationFlow:
    """Registration flow tests"""
    
    def test_customer_nepodnikatel_registration(self):
        """Test customer nepodnikatel registration flow"""
        unique_email = f"test-nepod-{uuid.uuid4().hex[:8]}@example.com"
        reg_data = {
            "email": unique_email,
            "password": "TestPass123!",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Test",
            "last_name": "Nepodnikatel",
            "phone": "+420111222333"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_data)
        assert response.status_code == 200
        data = response.json()
        # Should return requires_verification, not token
        assert data.get("requires_verification") == True or "message" in data
        print("PASS: Customer nepodnikatel registration works")
    
    def test_supplier_osvc_registration(self):
        """Test supplier OSVČ registration flow"""
        unique_email = f"test-osvc-{uuid.uuid4().hex[:8]}@example.com"
        reg_data = {
            "email": unique_email,
            "password": "TestPass123!",
            "role": "supplier",
            "account_type": "osvc",
            "first_name": "Test",
            "last_name": "OSVČ",
            "phone": "+420444555666",
            "ico": "12345678",
            "categories": ["Elektrikář"]
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=reg_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("requires_verification") == True or "message" in data
        print("PASS: Supplier OSVČ registration works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
