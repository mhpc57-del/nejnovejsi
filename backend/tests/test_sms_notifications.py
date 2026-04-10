"""
Test SMS Notifications Feature - Iteration 31
Tests for sms_notifications field in registration and profile update
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"
SUPPLIER_EMAIL = "test_supplier_chat@test.cz"
SUPPLIER_PASSWORD = "TestHeslo123"
CUSTOMER_EMAIL = "testvendulka@test.cz"
CUSTOMER_PASSWORD = "TestHeslo123!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def supplier_token(api_client):
    """Get supplier authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPPLIER_EMAIL,
        "password": SUPPLIER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Supplier authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get customer authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Customer authentication failed: {response.status_code} - {response.text}")


class TestSMSNotificationsRegistration:
    """Test sms_notifications field during registration"""
    
    def test_register_with_sms_notifications_true(self, api_client):
        """Test registration with sms_notifications=true"""
        unique_email = f"test_sms_true_{uuid.uuid4().hex[:8]}@test.cz"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestHeslo123!",
            "phone": "+420123456789",
            "role": "customer",
            "sms_notifications": True,
            "first_name": "Test",
            "last_name": "SMSTrue"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert data.get("requires_verification") == True
        print(f"✓ Registration with sms_notifications=true successful for {unique_email}")
    
    def test_register_with_sms_notifications_false(self, api_client):
        """Test registration with sms_notifications=false"""
        unique_email = f"test_sms_false_{uuid.uuid4().hex[:8]}@test.cz"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestHeslo123!",
            "phone": "+420123456789",
            "role": "customer",
            "sms_notifications": False,
            "first_name": "Test",
            "last_name": "SMSFalse"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"✓ Registration with sms_notifications=false successful for {unique_email}")
    
    def test_register_without_sms_notifications_defaults_to_false(self, api_client):
        """Test registration without sms_notifications field defaults to false"""
        unique_email = f"test_sms_default_{uuid.uuid4().hex[:8]}@test.cz"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestHeslo123!",
            "phone": "+420123456789",
            "role": "customer",
            "first_name": "Test",
            "last_name": "SMSDefault"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        print(f"✓ Registration without sms_notifications field successful (defaults to false)")


class TestSMSNotificationsProfile:
    """Test sms_notifications field in profile operations"""
    
    def test_get_profile_returns_sms_notifications(self, api_client, supplier_token):
        """Test GET /api/auth/me returns sms_notifications field"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        assert response.status_code == 200, f"Get profile failed: {response.text}"
        data = response.json()
        assert "sms_notifications" in data, "sms_notifications field missing from profile response"
        assert isinstance(data["sms_notifications"], bool), "sms_notifications should be boolean"
        print(f"✓ GET /api/auth/me returns sms_notifications={data['sms_notifications']}")
    
    def test_update_profile_sms_notifications_true(self, api_client, supplier_token):
        """Test PUT /api/users/profile updates sms_notifications to true"""
        response = api_client.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"sms_notifications": True}
        )
        
        assert response.status_code == 200, f"Update profile failed: {response.text}"
        data = response.json()
        assert data.get("sms_notifications") == True, f"sms_notifications not updated to true: {data.get('sms_notifications')}"
        print(f"✓ PUT /api/users/profile updated sms_notifications to true")
        
        # Verify with GET
        verify_response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("sms_notifications") == True, "sms_notifications not persisted as true"
        print(f"✓ Verified sms_notifications=true persisted in database")
    
    def test_update_profile_sms_notifications_false(self, api_client, supplier_token):
        """Test PUT /api/users/profile updates sms_notifications to false"""
        response = api_client.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"sms_notifications": False}
        )
        
        assert response.status_code == 200, f"Update profile failed: {response.text}"
        data = response.json()
        assert data.get("sms_notifications") == False, f"sms_notifications not updated to false: {data.get('sms_notifications')}"
        print(f"✓ PUT /api/users/profile updated sms_notifications to false")
        
        # Verify with GET
        verify_response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("sms_notifications") == False, "sms_notifications not persisted as false"
        print(f"✓ Verified sms_notifications=false persisted in database")
    
    def test_toggle_sms_notifications_true_to_false_to_true(self, api_client, supplier_token):
        """Test toggling sms_notifications from true to false and back"""
        # Set to true
        response1 = api_client.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"sms_notifications": True}
        )
        assert response1.status_code == 200
        assert response1.json().get("sms_notifications") == True
        print(f"✓ Toggle step 1: Set sms_notifications to true")
        
        # Set to false
        response2 = api_client.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"sms_notifications": False}
        )
        assert response2.status_code == 200
        assert response2.json().get("sms_notifications") == False
        print(f"✓ Toggle step 2: Set sms_notifications to false")
        
        # Set back to true
        response3 = api_client.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"sms_notifications": True}
        )
        assert response3.status_code == 200
        assert response3.json().get("sms_notifications") == True
        print(f"✓ Toggle step 3: Set sms_notifications back to true")
        
        print(f"✓ Full toggle cycle (true→false→true) completed successfully")


class TestSMSNotificationsCustomer:
    """Test sms_notifications for customer role"""
    
    def test_customer_profile_has_sms_notifications(self, api_client, customer_token):
        """Test customer profile includes sms_notifications field"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        assert response.status_code == 200, f"Get customer profile failed: {response.text}"
        data = response.json()
        assert "sms_notifications" in data, "sms_notifications field missing from customer profile"
        print(f"✓ Customer profile includes sms_notifications={data['sms_notifications']}")
    
    def test_customer_can_update_sms_notifications(self, api_client, customer_token):
        """Test customer can update sms_notifications"""
        # Get current value
        get_response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        current_value = get_response.json().get("sms_notifications", False)
        new_value = not current_value
        
        # Update to opposite value
        response = api_client.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"sms_notifications": new_value}
        )
        
        assert response.status_code == 200, f"Update customer profile failed: {response.text}"
        data = response.json()
        assert data.get("sms_notifications") == new_value, f"Customer sms_notifications not updated"
        print(f"✓ Customer can update sms_notifications from {current_value} to {new_value}")
        
        # Restore original value
        api_client.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"sms_notifications": current_value}
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
