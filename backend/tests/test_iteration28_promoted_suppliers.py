"""
Iteration 28 - Testing Promoted Suppliers API and related fixes
Tests:
1. GET /api/promoted-suppliers - returns suppliers list with active flag
2. POST /api/promoted-suppliers - creates entry with company_name, bio, phone
3. POST /api/promoted-suppliers/{id}/activate - sets active=true and paid_until
4. POST /api/auth/login - admin login returns token
5. POST /api/demands - creates demand with auth token (check backend logs for SMS)
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"
CUSTOMER_EMAIL = "testvendulka@test.cz"
CUSTOMER_PASSWORD = "TestHeslo123!"
SUPPLIER_EMAIL = "test_supplier_chat@test.cz"
SUPPLIER_PASSWORD = "TestHeslo123"


class TestPromotedSuppliersAPI:
    """Test promoted suppliers CRUD operations"""
    
    def test_get_promoted_suppliers(self):
        """GET /api/promoted-suppliers returns suppliers list with active flag"""
        response = requests.get(f"{BASE_URL}/api/promoted-suppliers")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "suppliers" in data, "Response should contain 'suppliers' key"
        assert "total_active" in data, "Response should contain 'total_active' key"
        assert isinstance(data["suppliers"], list), "suppliers should be a list"
        assert isinstance(data["total_active"], int), "total_active should be an integer"
        
        print(f"✓ GET /api/promoted-suppliers: {len(data['suppliers'])} suppliers, {data['total_active']} active")
    
    def test_create_promoted_supplier(self):
        """POST /api/promoted-suppliers creates entry with company_name, bio, phone"""
        test_data = {
            "company_name": f"TEST_PromoCompany_{datetime.now().strftime('%H%M%S')}",
            "bio": "Test promotional supplier for automated testing",
            "phone": "+420123456789",
            "website": "https://test-promo.cz",
            "logo_url": ""
        }
        
        response = requests.post(f"{BASE_URL}/api/promoted-suppliers", json=test_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert "message" in data, "Response should contain 'message'"
        assert len(data["id"]) > 0, "ID should not be empty"
        
        print(f"✓ POST /api/promoted-suppliers: Created supplier with ID {data['id']}")
        return data["id"]
    
    def test_activate_promoted_supplier(self):
        """POST /api/promoted-suppliers/{id}/activate sets active=true and paid_until"""
        # First create a supplier
        test_data = {
            "company_name": f"TEST_ActivatePromo_{datetime.now().strftime('%H%M%S')}",
            "bio": "Test supplier for activation testing",
            "phone": "+420987654321"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/promoted-suppliers", json=test_data)
        assert create_response.status_code == 200, f"Failed to create supplier: {create_response.text}"
        supplier_id = create_response.json()["id"]
        
        # Now activate it
        activate_response = requests.post(f"{BASE_URL}/api/promoted-suppliers/{supplier_id}/activate")
        
        assert activate_response.status_code == 200, f"Expected 200, got {activate_response.status_code}: {activate_response.text}"
        
        data = activate_response.json()
        assert "status" in data, "Response should contain 'status'"
        assert data["status"] == "active", f"Status should be 'active', got {data['status']}"
        assert "paid_until" in data, "Response should contain 'paid_until'"
        assert data["paid_until"] is not None, "paid_until should not be None"
        
        print(f"✓ POST /api/promoted-suppliers/{supplier_id}/activate: Status={data['status']}, paid_until={data['paid_until']}")
    
    def test_create_checkout_fails_without_stripe(self):
        """POST /api/promoted-suppliers/{id}/create-checkout fails with placeholder Stripe key"""
        # First create a supplier
        test_data = {
            "company_name": f"TEST_CheckoutPromo_{datetime.now().strftime('%H%M%S')}",
            "bio": "Test supplier for checkout testing",
            "phone": "+420111222333"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/promoted-suppliers", json=test_data)
        assert create_response.status_code == 200, f"Failed to create supplier: {create_response.text}"
        supplier_id = create_response.json()["id"]
        
        # Try to create checkout - should fail with placeholder Stripe key
        checkout_response = requests.post(f"{BASE_URL}/api/promoted-suppliers/{supplier_id}/create-checkout")
        
        # Expected to fail because sk_test_emergent is a placeholder
        assert checkout_response.status_code == 500, f"Expected 500 (Stripe not configured), got {checkout_response.status_code}"
        
        print(f"✓ POST /api/promoted-suppliers/{supplier_id}/create-checkout: Correctly fails with placeholder Stripe key (expected)")


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_returns_token(self):
        """POST /api/auth/login with admin credentials returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["role"] == "admin", f"User role should be 'admin', got {data['user']['role']}"
        assert len(data["access_token"]) > 0, "Token should not be empty"
        
        print(f"✓ POST /api/auth/login (admin): Token received, role={data['user']['role']}")
    
    def test_customer_login_returns_token(self):
        """POST /api/auth/login with customer credentials returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["role"] == "customer", f"User role should be 'customer', got {data['user']['role']}"
        
        print(f"✓ POST /api/auth/login (customer): Token received, role={data['user']['role']}")
    
    def test_supplier_login_returns_token(self):
        """POST /api/auth/login with supplier credentials returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "Response should contain 'access_token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["role"] == "supplier", f"User role should be 'supplier', got {data['user']['role']}"
        
        print(f"✓ POST /api/auth/login (supplier): Token received, role={data['user']['role']}")


class TestCreateDemand:
    """Test demand creation with SMS notification"""
    
    @pytest.fixture
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Customer login failed")
        return response.json()["access_token"]
    
    def test_create_demand_with_auth(self, customer_token):
        """POST /api/demands with auth token creates demand"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        
        demand_data = {
            "title": f"TEST_Demand_{datetime.now().strftime('%H%M%S')}",
            "description": "Test demand for SMS notification testing",
            "category": "Elektrikář",
            "address": "Praha 1, Václavské náměstí",
            "budget_min": 1000,
            "budget_max": 5000,
            "deadline": "ASAP"
        }
        
        response = requests.post(f"{BASE_URL}/api/demands", json=demand_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["title"] == demand_data["title"], "Title should match"
        assert data["status"] == "open", f"Status should be 'open', got {data['status']}"
        
        print(f"✓ POST /api/demands: Created demand with ID {data['id']}")
        print("  Note: Check backend logs for SMS notification attempts to suppliers")
        return data["id"]


class TestNotificationsService:
    """Test that notifications.py is properly configured"""
    
    def test_sms_service_config_in_env(self):
        """Verify Twilio config exists in backend .env"""
        # Read backend .env
        env_path = "/app/backend/.env"
        if os.path.exists(env_path):
            with open(env_path, 'r') as f:
                env_content = f.read()
            
            assert "TWILIO_ACCOUNT_SID" in env_content, "TWILIO_ACCOUNT_SID should be in .env"
            assert "TWILIO_AUTH_TOKEN" in env_content, "TWILIO_AUTH_TOKEN should be in .env"
            assert "TWILIO_MESSAGING_SERVICE_SID" in env_content, "TWILIO_MESSAGING_SERVICE_SID should be in .env"
            
            print("✓ Twilio configuration found in backend/.env")
        else:
            pytest.skip("Backend .env not accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
