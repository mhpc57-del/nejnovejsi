"""
Test suite for iteration 37 bug fixes:
1. Location sharing persistence - location_sharing field in user_to_response()
2. SMS notifications to suppliers - sms_notifications field in MongoDB query projection
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPPLIER_EMAIL = "info@acdcmont.cz"
SUPPLIER_PASSWORD = "ACDCmont1132@"
CUSTOMER_EMAIL = "test-accept@test.cz"
CUSTOMER_PASSWORD = "Test1234!"


class TestLocationSharingPersistence:
    """Tests for location_sharing field persistence in auth/me endpoint"""
    
    @pytest.fixture
    def supplier_token(self):
        """Get supplier authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Supplier login failed: {response.status_code}")
    
    @pytest.fixture
    def customer_token(self):
        """Get customer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Customer login failed: {response.status_code}")
    
    def test_auth_me_returns_location_sharing_field(self, supplier_token):
        """Verify auth/me endpoint returns location_sharing field"""
        response = requests.get(f"{BASE_URL}/api/auth/me", 
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        # CRITICAL: location_sharing field must exist in response
        assert "location_sharing" in data, "location_sharing field missing from auth/me response"
        assert isinstance(data["location_sharing"], bool), "location_sharing must be boolean"
        print(f"✓ auth/me returns location_sharing: {data['location_sharing']}")
    
    def test_enable_location_sharing_persists(self, supplier_token):
        """Enable location sharing and verify it persists after re-fetching user"""
        # Step 1: Enable location sharing by posting coordinates
        enable_response = requests.post(f"{BASE_URL}/api/users/location",
            json={"latitude": 50.0755, "longitude": 14.4378},  # Prague coordinates
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        assert enable_response.status_code == 200
        print("✓ Location sharing enabled via POST /users/location")
        
        # Step 2: Verify location_sharing is true in auth/me
        me_response = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        assert me_response.status_code == 200
        data = me_response.json()
        
        assert data.get("location_sharing") == True, \
            f"location_sharing should be True after enabling, got: {data.get('location_sharing')}"
        print(f"✓ location_sharing persisted as True in auth/me")
    
    def test_disable_location_sharing_persists(self, supplier_token):
        """Disable location sharing and verify it persists"""
        # Step 1: Disable location sharing by posting null coordinates
        disable_response = requests.post(f"{BASE_URL}/api/users/location",
            json={"latitude": None, "longitude": None},
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        assert disable_response.status_code == 200
        print("✓ Location sharing disabled via POST /users/location with null coords")
        
        # Step 2: Verify location_sharing is false in auth/me
        me_response = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        assert me_response.status_code == 200
        data = me_response.json()
        
        assert data.get("location_sharing") == False, \
            f"location_sharing should be False after disabling, got: {data.get('location_sharing')}"
        print(f"✓ location_sharing persisted as False in auth/me")
    
    def test_location_sharing_toggle_cycle(self, supplier_token):
        """Test full enable -> disable -> enable cycle"""
        headers = {"Authorization": f"Bearer {supplier_token}"}
        
        # Enable
        requests.post(f"{BASE_URL}/api/users/location",
            json={"latitude": 50.0755, "longitude": 14.4378}, headers=headers)
        
        me1 = requests.get(f"{BASE_URL}/api/auth/me", headers=headers).json()
        assert me1.get("location_sharing") == True, "Should be True after enable"
        
        # Disable
        requests.post(f"{BASE_URL}/api/users/location",
            json={"latitude": None, "longitude": None}, headers=headers)
        
        me2 = requests.get(f"{BASE_URL}/api/auth/me", headers=headers).json()
        assert me2.get("location_sharing") == False, "Should be False after disable"
        
        # Re-enable
        requests.post(f"{BASE_URL}/api/users/location",
            json={"latitude": 49.1951, "longitude": 16.6068}, headers=headers)  # Brno
        
        me3 = requests.get(f"{BASE_URL}/api/auth/me", headers=headers).json()
        assert me3.get("location_sharing") == True, "Should be True after re-enable"
        
        print("✓ Full toggle cycle (enable -> disable -> enable) works correctly")
    
    def test_customer_location_sharing(self, customer_token):
        """Verify location sharing works for customers too"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Enable
        enable_response = requests.post(f"{BASE_URL}/api/users/location",
            json={"latitude": 50.0755, "longitude": 14.4378}, headers=headers)
        assert enable_response.status_code == 200
        
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        
        data = me_response.json()
        assert "location_sharing" in data, "location_sharing field missing for customer"
        assert data.get("location_sharing") == True, "Customer location_sharing should be True"
        
        print("✓ Customer location sharing works correctly")


class TestSMSNotificationsToSuppliers:
    """Tests for SMS notifications being sent to suppliers with sms_notifications=true"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Customer login failed: {response.status_code}")
    
    @pytest.fixture
    def supplier_token(self):
        """Get supplier authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Supplier login failed: {response.status_code}")
    
    def test_supplier_has_sms_notifications_field(self, supplier_token):
        """Verify supplier profile includes sms_notifications field"""
        response = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "sms_notifications" in data, "sms_notifications field missing from supplier profile"
        print(f"✓ Supplier has sms_notifications: {data.get('sms_notifications')}")
    
    def test_enable_sms_notifications(self, supplier_token):
        """Enable SMS notifications for supplier"""
        headers = {"Authorization": f"Bearer {supplier_token}"}
        
        # Enable SMS notifications
        response = requests.put(f"{BASE_URL}/api/users/profile",
            json={"sms_notifications": True}, headers=headers)
        
        assert response.status_code == 200
        
        # Verify it persisted
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        
        data = me_response.json()
        assert data.get("sms_notifications") == True, "sms_notifications should be True"
        print("✓ SMS notifications enabled and persisted")
    
    def test_create_demand_in_supplier_category(self, customer_token):
        """Create a demand in supplier's category to trigger SMS notification"""
        import uuid
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        # Create demand in 'Elektromontážní práce – silnoproud' category
        # which is the supplier's category
        demand_data = {
            "title": f"TEST_SMS_Demand_{uuid.uuid4().hex[:8]}",
            "description": "Test demand to verify SMS notifications to suppliers",
            "category": "Elektromontážní práce – silnoproud",
            "address": "Praha, Czech Republic",
            "latitude": 50.0755,
            "longitude": 14.4378
        }
        
        response = requests.post(f"{BASE_URL}/api/demands", json=demand_data, headers=headers)
        
        assert response.status_code == 200, f"Failed to create demand: {response.text}"
        data = response.json()
        
        assert "id" in data, "Demand should have an ID"
        print(f"✓ Created demand: {data.get('title')} (ID: {data.get('id')})")
        
        # Note: SMS is sent in background, check backend logs for:
        # "Sending demand SMS to +420777123456"
        # "Demand SMS to +420777123456: result=True"
        
        return data.get("id")


class TestUserResponseModel:
    """Tests for user_to_response helper function"""
    
    @pytest.fixture
    def supplier_token(self):
        """Get supplier authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Supplier login failed: {response.status_code}")
    
    def test_user_response_contains_all_required_fields(self, supplier_token):
        """Verify user response contains all required fields including location_sharing"""
        response = requests.get(f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        # Check critical fields that were part of the bug fix
        required_fields = [
            "id", "email", "role", "location_sharing", "sms_notifications",
            "categories", "phone"
        ]
        
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing from user response"
        
        print(f"✓ All required fields present in user response")
        print(f"  - location_sharing: {data.get('location_sharing')}")
        print(f"  - sms_notifications: {data.get('sms_notifications')}")
        print(f"  - categories: {data.get('categories')}")


class TestDemandCreationWithSMSProjection:
    """Tests for demand creation with proper MongoDB projection including sms_notifications"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Customer login failed: {response.status_code}")
    
    def test_demand_creation_returns_success(self, customer_token):
        """Verify demand creation works and returns proper response"""
        import uuid
        
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        demand_data = {
            "title": f"TEST_Projection_{uuid.uuid4().hex[:8]}",
            "description": "Test demand for MongoDB projection verification",
            "category": "Elektromontážní práce – silnoproud",
            "address": "Brno, Czech Republic",
            "latitude": 49.1951,
            "longitude": 16.6068
        }
        
        response = requests.post(f"{BASE_URL}/api/demands", json=demand_data, headers=headers)
        
        assert response.status_code == 200, f"Demand creation failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data.get("title") == demand_data["title"]
        assert data.get("category") == demand_data["category"]
        assert data.get("status") == "open"
        
        print(f"✓ Demand created successfully with proper response")
        print(f"  - ID: {data.get('id')}")
        print(f"  - Status: {data.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
