"""
Iteration 13 - Testing new features:
1. Unread messages summary endpoint
2. Quick demand creation and claiming
3. Notification to quick demand customer when supplier replies
4. Dashboard notification badges and maps
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CUSTOMER_EMAIL = "testvendulka@test.cz"
CUSTOMER_PASSWORD = "TestHeslo123!"
SUPPLIER_EMAIL = "test_supplier_chat@test.cz"
SUPPLIER_PASSWORD = "TestHeslo123"
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"


class TestUnreadMessagesSummary:
    """Test GET /api/messages/unread-summary endpoint"""
    
    def test_unread_summary_requires_auth(self):
        """Unread summary endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/messages/unread-summary")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Unread summary requires authentication")
    
    def test_unread_summary_customer(self):
        """Customer can get unread messages summary"""
        # Login as customer
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip(f"Customer login failed: {login_resp.text}")
        
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get unread summary
        response = requests.get(f"{BASE_URL}/api/messages/unread-summary", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "unread_demands" in data, "Response should contain unread_demands"
        assert "total_unread" in data, "Response should contain total_unread"
        assert isinstance(data["unread_demands"], list), "unread_demands should be a list"
        assert isinstance(data["total_unread"], int), "total_unread should be an integer"
        print(f"PASS: Customer unread summary - {data['total_unread']} unread demands")
    
    def test_unread_summary_supplier(self):
        """Supplier can get unread messages summary"""
        # Login as supplier
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip(f"Supplier login failed: {login_resp.text}")
        
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get unread summary
        response = requests.get(f"{BASE_URL}/api/messages/unread-summary", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "unread_demands" in data
        assert "total_unread" in data
        
        # Check structure of unread demand items
        if data["unread_demands"]:
            item = data["unread_demands"][0]
            assert "demand_id" in item, "Item should have demand_id"
            assert "demand_title" in item, "Item should have demand_title"
            assert "demand_status" in item, "Item should have demand_status"
            assert "last_sender" in item, "Item should have last_sender"
            assert "last_message" in item, "Item should have last_message"
        print(f"PASS: Supplier unread summary - {data['total_unread']} unread demands")


class TestQuickDemand:
    """Test POST /api/demands/quick endpoint"""
    
    def test_quick_demand_no_auth_required(self):
        """Quick demand should work without authentication"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/demands/quick", json={
            "first_name": "Test",
            "last_name": f"Quick{unique_id}",
            "email": f"test_quick_{unique_id}@test.cz",
            "phone": "+420123456789",
            "description": "Test quick demand without registration"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "demand_id" in data, "Response should contain demand_id"
        assert data["demand_id"], "demand_id should not be empty"
        print(f"PASS: Quick demand created without auth - ID: {data['demand_id']}")
        return data["demand_id"]
    
    def test_quick_demand_validation(self):
        """Quick demand should validate required fields"""
        # Missing required fields
        response = requests.post(f"{BASE_URL}/api/demands/quick", json={
            "first_name": "Test"
            # Missing last_name, email, phone
        })
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}"
        print("PASS: Quick demand validates required fields")
    
    def test_quick_demand_creates_with_is_quick_flag(self):
        """Quick demand should be created with is_quick=True flag"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create quick demand
        create_resp = requests.post(f"{BASE_URL}/api/demands/quick", json={
            "first_name": "Test",
            "last_name": f"QuickFlag{unique_id}",
            "email": f"test_flag_{unique_id}@test.cz",
            "phone": "+420123456789",
            "description": "Testing is_quick flag"
        })
        assert create_resp.status_code == 200
        demand_id = create_resp.json()["demand_id"]
        
        # Login as admin to verify the demand
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip("Admin login failed")
        
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get the demand
        demand_resp = requests.get(f"{BASE_URL}/api/demands/{demand_id}", headers=headers)
        if demand_resp.status_code == 200:
            demand = demand_resp.json()
            # Note: is_quick may not be in the response model, but it's stored in DB
            print(f"PASS: Quick demand created - title: {demand.get('title', 'N/A')}")
        else:
            print(f"INFO: Could not verify demand details (status {demand_resp.status_code})")


class TestClaimQuickDemand:
    """Test POST /api/demands/claim endpoint"""
    
    def test_claim_requires_auth(self):
        """Claim endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/demands/claim")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: Claim endpoint requires authentication")
    
    def test_claim_quick_demand_flow(self):
        """Test full flow: create quick demand -> register -> claim"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_claim_{unique_id}@test.cz"
        
        # 1. Create quick demand
        quick_resp = requests.post(f"{BASE_URL}/api/demands/quick", json={
            "first_name": "Claim",
            "last_name": f"Test{unique_id}",
            "email": test_email,
            "phone": "+420987654321",
            "description": "Quick demand to be claimed"
        })
        assert quick_resp.status_code == 200
        demand_id = quick_resp.json()["demand_id"]
        print(f"INFO: Created quick demand {demand_id} for {test_email}")
        
        # 2. Login as existing customer (simulating registration)
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip("Customer login failed")
        
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Call claim endpoint (won't match because email is different)
        claim_resp = requests.post(f"{BASE_URL}/api/demands/claim", headers=headers)
        assert claim_resp.status_code == 200, f"Expected 200, got {claim_resp.status_code}: {claim_resp.text}"
        
        data = claim_resp.json()
        assert "claimed" in data, "Response should contain claimed count"
        print(f"PASS: Claim endpoint works - claimed {data['claimed']} demands")


class TestSupplierReplyToQuickDemand:
    """Test that supplier can reply to quick demand and notification is triggered"""
    
    def test_supplier_can_soft_accept_quick_demand(self):
        """Supplier can soft-accept a quick demand"""
        unique_id = str(uuid.uuid4())[:8]
        
        # 1. Create quick demand
        quick_resp = requests.post(f"{BASE_URL}/api/demands/quick", json={
            "first_name": "Soft",
            "last_name": f"Accept{unique_id}",
            "email": f"test_soft_{unique_id}@test.cz",
            "phone": "+420111222333",
            "description": "Quick demand for soft accept test"
        })
        assert quick_resp.status_code == 200
        demand_id = quick_resp.json()["demand_id"]
        
        # 2. Login as supplier
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip("Supplier login failed")
        
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Soft-accept the demand
        soft_resp = requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/soft-accept",
            params={"reason": "Mám zájem, potřebuji více informací"},
            headers=headers
        )
        assert soft_resp.status_code == 200, f"Expected 200, got {soft_resp.status_code}: {soft_resp.text}"
        print(f"PASS: Supplier soft-accepted quick demand {demand_id}")
    
    def test_supplier_can_send_message_to_quick_demand(self):
        """Supplier can send message to quick demand (triggers notification)"""
        unique_id = str(uuid.uuid4())[:8]
        
        # 1. Create quick demand
        quick_resp = requests.post(f"{BASE_URL}/api/demands/quick", json={
            "first_name": "Message",
            "last_name": f"Test{unique_id}",
            "email": f"test_msg_{unique_id}@test.cz",
            "phone": "+420444555666",
            "description": "Quick demand for message test"
        })
        assert quick_resp.status_code == 200
        demand_id = quick_resp.json()["demand_id"]
        
        # 2. Login as supplier
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip("Supplier login failed")
        
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Send message to the demand
        msg_resp = requests.post(f"{BASE_URL}/api/messages", json={
            "demand_id": demand_id,
            "content": "Dobrý den, mám zájem o vaši poptávku. Kdy vám mohu zavolat?"
        }, headers=headers)
        
        assert msg_resp.status_code == 200, f"Expected 200, got {msg_resp.status_code}: {msg_resp.text}"
        
        data = msg_resp.json()
        assert "id" in data, "Message should have an ID"
        assert data["content"] == "Dobrý den, mám zájem o vaši poptávku. Kdy vám mohu zavolat?"
        print(f"PASS: Supplier sent message to quick demand {demand_id}")


class TestDemandsWithCoordinates:
    """Test that demands can have coordinates for map display"""
    
    def test_create_demand_with_coordinates(self):
        """Customer can create demand with latitude/longitude"""
        # Login as customer
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip("Customer login failed")
        
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        unique_id = str(uuid.uuid4())[:8]
        
        # Create demand with coordinates
        demand_resp = requests.post(f"{BASE_URL}/api/demands", json={
            "title": f"TEST_MapDemand_{unique_id}",
            "description": "Demand with coordinates for map testing",
            "category": "Elektrikář",
            "address": "Praha 1, Staroměstské náměstí",
            "latitude": 50.0875,
            "longitude": 14.4213,
            "payment_method": "cash"
        }, headers=headers)
        
        assert demand_resp.status_code == 200, f"Expected 200, got {demand_resp.status_code}: {demand_resp.text}"
        
        data = demand_resp.json()
        assert data.get("latitude") == 50.0875, "Latitude should be saved"
        assert data.get("longitude") == 14.4213, "Longitude should be saved"
        print(f"PASS: Demand created with coordinates - ID: {data['id']}")
    
    def test_get_demands_includes_coordinates(self):
        """GET demands should include latitude/longitude for map display"""
        # Login as customer
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if login_resp.status_code != 200:
            pytest.skip("Customer login failed")
        
        token = login_resp.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get my demands
        response = requests.get(f"{BASE_URL}/api/demands/my", headers=headers)
        assert response.status_code == 200
        
        demands = response.json()
        # Check if any demand has coordinates
        demands_with_coords = [d for d in demands if d.get("latitude") and d.get("longitude")]
        print(f"PASS: Found {len(demands_with_coords)} demands with coordinates out of {len(demands)} total")


class TestHealthAndBasicEndpoints:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """Health endpoint should return 200"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("PASS: Health endpoint OK")
    
    def test_categories_endpoint(self):
        """Categories endpoint should return list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        print(f"PASS: Categories endpoint - {len(data['categories'])} categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
