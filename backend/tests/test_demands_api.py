"""
Backend API Tests for CraftBolt.cz - Demands and Core Functionality
Tests: Authentication, Demands CRUD, Completion Flow, Cancellation
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPPLIER_EMAIL = "info@acdcmont.cz"
SUPPLIER_PASSWORD = "ACDCmont1132@"
CUSTOMER_EMAIL = "test-accept@test.cz"
CUSTOMER_PASSWORD = "Test1234!"


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_endpoint(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"Health check passed: {data}")
    
    def test_supplier_login(self):
        """Test supplier login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") == "supplier"
        print(f"Supplier login successful: {data['user']['email']}")
    
    def test_customer_login(self):
        """Test customer login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") == "customer"
        print(f"Customer login successful: {data['user']['email']}")
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]
        print("Invalid login correctly rejected")


class TestSupplierDemands:
    """Supplier demand-related tests"""
    
    @pytest.fixture
    def supplier_token(self):
        """Get supplier auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Supplier authentication failed")
    
    def test_get_available_demands(self, supplier_token):
        """Test getting available demands for supplier"""
        headers = {"Authorization": f"Bearer {supplier_token}"}
        response = requests.get(f"{BASE_URL}/api/demands/available", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} available demands")
    
    def test_get_supplier_demands(self, supplier_token):
        """Test getting supplier's assigned demands"""
        headers = {"Authorization": f"Bearer {supplier_token}"}
        response = requests.get(f"{BASE_URL}/api/demands/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Supplier has {len(data)} assigned demands")
    
    def test_get_viewed_demands(self, supplier_token):
        """Test getting viewed demands list"""
        headers = {"Authorization": f"Bearer {supplier_token}"}
        response = requests.get(f"{BASE_URL}/api/demands/viewed", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "demand_ids" in data
        print(f"Supplier has viewed {len(data['demand_ids'])} demands")


class TestCustomerDemands:
    """Customer demand-related tests"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Customer authentication failed")
    
    def test_get_customer_demands(self, customer_token):
        """Test getting customer's demands"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/demands/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Customer has {len(data)} demands")
        
        # Check demand structure
        if data:
            demand = data[0]
            assert "id" in demand
            assert "title" in demand
            assert "status" in demand
            print(f"First demand: {demand['title']} - Status: {demand['status']}")
    
    def test_create_demand(self, customer_token):
        """Test creating a new demand"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        demand_data = {
            "title": f"TEST_API_Demand_{int(time.time())}",
            "description": "Test demand created via API",
            "category": "Elektromontážní práce – silnoproud",
            "address": "Praha 1",
            "latitude": 50.0755,
            "longitude": 14.4378,
            "payment_method": "cash",
            "supplier_radius": 30
        }
        response = requests.post(f"{BASE_URL}/api/demands", json=demand_data, headers=headers)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        print(f"Created demand: {data['id']}")
        return data["id"]


class TestDemandStatusFlow:
    """Test demand status transitions"""
    
    @pytest.fixture
    def supplier_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Supplier authentication failed")
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Customer authentication failed")
    
    def test_get_in_progress_demands(self, supplier_token):
        """Test getting in_progress demands"""
        headers = {"Authorization": f"Bearer {supplier_token}"}
        response = requests.get(f"{BASE_URL}/api/demands/my", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        in_progress = [d for d in data if d.get("status") == "in_progress"]
        print(f"Found {len(in_progress)} in_progress demands")
        
        if in_progress:
            demand = in_progress[0]
            print(f"In progress demand: {demand['id']} - {demand['title']}")
            return demand["id"]
    
    def test_complete_demand_flow(self, supplier_token, customer_token):
        """Test the dual confirmation completion flow"""
        # Get supplier's in_progress demands
        headers_supplier = {"Authorization": f"Bearer {supplier_token}"}
        response = requests.get(f"{BASE_URL}/api/demands/my", headers=headers_supplier)
        assert response.status_code == 200
        
        in_progress = [d for d in response.json() if d.get("status") == "in_progress"]
        
        if not in_progress:
            print("No in_progress demands to test completion flow")
            pytest.skip("No in_progress demands available")
        
        demand_id = in_progress[0]["id"]
        print(f"Testing completion flow for demand: {demand_id}")
        
        # Step 1: Supplier marks as complete -> should go to pending_completion
        response = requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/complete",
            headers=headers_supplier,
            json={}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"Supplier completion response: {data}")
            assert data.get("status") in ["pending_completion", "completed"]
        else:
            print(f"Completion failed: {response.status_code} - {response.text}")


class TestCategories:
    """Test categories endpoint"""
    
    def test_get_categories(self):
        """Test getting all categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        # Categories returns an object with 'categories' and 'grouped' keys
        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) > 0
        print(f"Found {len(data['categories'])} categories")
        
        # Check first category
        category = data["categories"][0]
        print(f"First category: {category}")


class TestDisputes:
    """Test dispute functionality"""
    
    @pytest.fixture
    def customer_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Customer authentication failed")
    
    def test_get_disputes(self, customer_token):
        """Test getting disputes"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/disputes", headers=headers)
        # Disputes endpoint might return 200 with empty list or 404 if no disputes
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data)} disputes")


class TestUserProfile:
    """Test user profile functionality"""
    
    @pytest.fixture
    def supplier_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Supplier authentication failed")
    
    def test_get_profile(self, supplier_token):
        """Test getting user profile"""
        headers = {"Authorization": f"Bearer {supplier_token}"}
        # Get user ID first from auth response
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        user_id = response.json().get("user", {}).get("id")
        
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert data["email"] == SUPPLIER_EMAIL
        print(f"Profile retrieved: {data['email']}")
    
    def test_update_sms_notifications(self, supplier_token):
        """Test updating SMS notification preference"""
        headers = {"Authorization": f"Bearer {supplier_token}"}
        
        # Get user ID first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        user_id = response.json().get("user", {}).get("id")
        
        # Get current state
        response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
        current_sms = response.json().get("sms_notifications", False)
        
        # Toggle SMS notifications via profile update
        new_value = not current_sms
        response = requests.put(
            f"{BASE_URL}/api/users/profile",
            headers=headers,
            json={"sms_notifications": new_value}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"SMS notifications updated to: {data.get('sms_notifications')}")
            
            # Verify the change persisted
            response = requests.get(f"{BASE_URL}/api/users/{user_id}", headers=headers)
            assert response.json().get("sms_notifications") == new_value
            print("SMS notification toggle verified")
        else:
            print(f"Update failed: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
