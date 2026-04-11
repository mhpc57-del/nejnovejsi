"""
CraftBolt Comprehensive Backend API Tests - Iteration 33
Tests all major API endpoints for the Czech service marketplace platform.
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"
CUSTOMER_EMAIL = "testvendulka@test.cz"
CUSTOMER_PASSWORD = "TestHeslo123!"
SUPPLIER_EMAIL = "test_supplier_chat@test.cz"
SUPPLIER_PASSWORD = "TestHeslo123"


class TestHealthAndPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint working")
    
    def test_platform_stats(self):
        """Test /api/platform/stats returns user counts"""
        response = requests.get(f"{BASE_URL}/api/platform/stats")
        assert response.status_code == 200
        data = response.json()
        assert "customers" in data
        assert "suppliers" in data
        assert "online" in data
        print(f"✓ Platform stats: {data['customers']} customers, {data['suppliers']} suppliers")
    
    def test_categories_endpoint(self):
        """Test /api/categories returns category list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        assert "grouped" in data
        print(f"✓ Categories: {len(data['categories'])} categories available")
    
    def test_promoted_suppliers_public(self):
        """Test /api/promoted-suppliers returns promoted suppliers"""
        response = requests.get(f"{BASE_URL}/api/promoted-suppliers")
        assert response.status_code == 200
        data = response.json()
        assert "suppliers" in data
        print(f"✓ Promoted suppliers: {len(data['suppliers'])} active")
    
    def test_subscription_plans(self):
        """Test /api/subscription/plans returns pricing"""
        response = requests.get(f"{BASE_URL}/api/subscription/plans")
        assert response.status_code == 200
        data = response.json()
        assert "plans" in data
        print(f"✓ Subscription plans: {len(data['plans'])} plans available")


class TestAuthenticationFlows:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['email']}")
    
    def test_customer_login(self):
        """Test customer login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "customer"
        print(f"✓ Customer login successful: {data['user']['email']}")
    
    def test_supplier_login(self):
        """Test supplier login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "supplier"
        print(f"✓ Supplier login successful: {data['user']['email']}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.cz",
            "password": "anypassword"
        })
        assert response.status_code == 401
        print("✓ Non-existent user correctly rejected")


class TestAuthenticatedEndpoints:
    """Test endpoints requiring authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Get auth tokens for all user types"""
        # Admin token
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.admin_token = admin_resp.json().get("access_token") if admin_resp.status_code == 200 else None
        
        # Customer token
        customer_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        self.customer_token = customer_resp.json().get("access_token") if customer_resp.status_code == 200 else None
        
        # Supplier token
        supplier_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL, "password": SUPPLIER_PASSWORD
        })
        self.supplier_token = supplier_resp.json().get("access_token") if supplier_resp.status_code == 200 else None
    
    def test_get_current_user_admin(self):
        """Test GET /api/auth/me for admin"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {self.admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✓ Admin /me endpoint working")
    
    def test_get_current_user_customer(self):
        """Test GET /api/auth/me for customer"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {self.customer_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == CUSTOMER_EMAIL
        print(f"✓ Customer /me endpoint working")
    
    def test_unauthorized_without_token(self):
        """Test protected endpoint without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Unauthorized access correctly rejected")


class TestDemandsCRUD:
    """Test demand CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup_customer_token(self):
        """Get customer token for demand operations"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        self.customer_token = resp.json().get("access_token") if resp.status_code == 200 else None
        self.headers = {"Authorization": f"Bearer {self.customer_token}"} if self.customer_token else {}
    
    def test_get_customer_demands(self):
        """Test GET /api/demands for customer"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = requests.get(f"{BASE_URL}/api/demands", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Customer demands: {len(data)} demands found")
    
    def test_create_demand(self):
        """Test POST /api/demands creates a new demand"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        unique_title = f"TEST_Demand_{uuid.uuid4().hex[:8]}"
        demand_data = {
            "title": unique_title,
            "description": "Test demand created by automated testing",
            "category": "Elektrikáři – silnoproud",
            "address": "Praha, Česká republika",
            "latitude": 50.0755,
            "longitude": 14.4378,
            "images": [],
            "budget_min": 1000,
            "budget_max": 5000,
            "deadline": None
        }
        
        response = requests.post(f"{BASE_URL}/api/demands", json=demand_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == unique_title
        assert data["status"] == "open"
        assert "id" in data
        
        # Store for cleanup
        self.created_demand_id = data["id"]
        print(f"✓ Demand created: {data['id']}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/demands/{data['id']}", headers=self.headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["title"] == unique_title
        print(f"✓ Demand verified via GET")
    
    def test_quick_demand_creation(self):
        """Test POST /api/demands/quick for unregistered users"""
        quick_data = {
            "first_name": "Test",
            "last_name": "Quick",
            "email": f"test_quick_{uuid.uuid4().hex[:6]}@test.cz",
            "phone": "+420123456789",
            "description": "Quick demand test"
        }
        
        response = requests.post(f"{BASE_URL}/api/demands/quick", json=quick_data)
        assert response.status_code == 200
        data = response.json()
        assert "demand_id" in data
        print(f"✓ Quick demand created: {data['demand_id']}")


class TestSupplierEndpoints:
    """Test supplier-specific endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_supplier_token(self):
        """Get supplier token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL, "password": SUPPLIER_PASSWORD
        })
        self.supplier_token = resp.json().get("access_token") if resp.status_code == 200 else None
        self.headers = {"Authorization": f"Bearer {self.supplier_token}"} if self.supplier_token else {}
    
    def test_get_available_demands(self):
        """Test GET /api/demands/available for supplier"""
        if not self.supplier_token:
            pytest.skip("Supplier token not available")
        
        response = requests.get(f"{BASE_URL}/api/demands/available", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Available demands for supplier: {len(data)} found")
    
    def test_get_suppliers_list(self):
        """Test GET /api/suppliers returns verified suppliers"""
        response = requests.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Suppliers list: {len(data)} verified suppliers")


class TestAdminEndpoints:
    """Test admin-only endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_admin_token(self):
        """Get admin token"""
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.admin_token = resp.json().get("access_token") if resp.status_code == 200 else None
        self.headers = {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
    
    def test_admin_stats(self):
        """Test GET /api/admin/stats"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_demands" in data
        assert "open_demands" in data
        print(f"✓ Admin stats: {data['total_users']} users, {data['total_demands']} demands")
    
    def test_admin_users_list(self):
        """Test GET /api/admin/users"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin users list: {len(data)} users")
    
    def test_admin_demands_list(self):
        """Test GET /api/admin/demands"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/admin/demands", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin demands list: {len(data)} demands")
    
    def test_admin_promoted_stats(self):
        """Test GET /api/admin/promoted-stats"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/admin/promoted-stats", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "active" in data
        assert "revenue_total" in data
        print(f"✓ Admin promoted stats: {data['active']} active, {data['revenue_total']} CZK revenue")
    
    def test_admin_category_suggestions(self):
        """Test GET /api/admin/category-suggestions"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/admin/category-suggestions", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin category suggestions: {len(data)} pending")
    
    def test_non_admin_cannot_access_admin_endpoints(self):
        """Test that non-admin users cannot access admin endpoints"""
        # Get customer token
        customer_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        customer_token = customer_resp.json().get("access_token")
        customer_headers = {"Authorization": f"Bearer {customer_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=customer_headers)
        assert response.status_code == 403
        print("✓ Non-admin correctly blocked from admin endpoints")


class TestMessagesEndpoints:
    """Test messaging functionality"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Get tokens for messaging tests"""
        customer_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        self.customer_token = customer_resp.json().get("access_token") if customer_resp.status_code == 200 else None
        self.customer_headers = {"Authorization": f"Bearer {self.customer_token}"} if self.customer_token else {}
    
    def test_unread_summary(self):
        """Test GET /api/messages/unread-summary"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = requests.get(f"{BASE_URL}/api/messages/unread-summary", headers=self.customer_headers)
        assert response.status_code == 200
        data = response.json()
        assert "unread_demands" in data
        assert "total_unread" in data
        print(f"✓ Unread messages: {data['total_unread']} unread")


class TestInvoicesEndpoints:
    """Test invoicing functionality"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Get tokens for invoice tests"""
        customer_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        self.customer_token = customer_resp.json().get("access_token") if customer_resp.status_code == 200 else None
        self.customer_headers = {"Authorization": f"Bearer {self.customer_token}"} if self.customer_token else {}
        
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD
        })
        self.admin_token = admin_resp.json().get("access_token") if admin_resp.status_code == 200 else None
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"} if self.admin_token else {}
    
    def test_get_my_invoices(self):
        """Test GET /api/invoices/my"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = requests.get(f"{BASE_URL}/api/invoices/my", headers=self.customer_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My invoices: {len(data)} invoices")
    
    def test_admin_invoices(self):
        """Test GET /api/admin/invoices"""
        if not self.admin_token:
            pytest.skip("Admin token not available")
        
        response = requests.get(f"{BASE_URL}/api/admin/invoices", headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin invoices: {len(data)} total invoices")


class TestAIChatEndpoint:
    """Test AI chat functionality"""
    
    def test_ai_chat_basic(self):
        """Test POST /api/ai/chat"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "Co je CraftBolt?",
            "session_id": f"test_{uuid.uuid4().hex[:8]}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "reply" in data
        assert "session_id" in data
        assert len(data["reply"]) > 0
        print(f"✓ AI chat working, reply length: {len(data['reply'])} chars")
    
    def test_ai_chat_empty_message(self):
        """Test AI chat rejects empty messages"""
        response = requests.post(f"{BASE_URL}/api/ai/chat", json={
            "message": "",
            "session_id": "test"
        })
        assert response.status_code == 400
        print("✓ AI chat correctly rejects empty messages")


class TestProfileEndpoints:
    """Test user profile functionality"""
    
    @pytest.fixture(autouse=True)
    def setup_tokens(self):
        """Get tokens for profile tests"""
        customer_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        self.customer_token = customer_resp.json().get("access_token") if customer_resp.status_code == 200 else None
        self.customer_headers = {"Authorization": f"Bearer {self.customer_token}"} if self.customer_token else {}
        self.customer_id = customer_resp.json().get("user", {}).get("id") if customer_resp.status_code == 200 else None
    
    def test_get_user_profile(self):
        """Test GET /api/users/{user_id}"""
        if not self.customer_id:
            pytest.skip("Customer ID not available")
        
        response = requests.get(f"{BASE_URL}/api/users/{self.customer_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == CUSTOMER_EMAIL
        print(f"✓ User profile retrieved: {data['email']}")
    
    def test_welcome_seen_endpoint(self):
        """Test POST /api/users/welcome-seen"""
        if not self.customer_token:
            pytest.skip("Customer token not available")
        
        response = requests.post(f"{BASE_URL}/api/users/welcome-seen", headers=self.customer_headers)
        assert response.status_code == 200
        print("✓ Welcome seen endpoint working")


class TestGeocodingEndpoints:
    """Test geocoding functionality"""
    
    def test_geocode_search(self):
        """Test GET /api/geocode/search"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Praha"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert "lat" in data[0]
            assert "lon" in data[0]
        print(f"✓ Geocode search: {len(data)} results for 'Praha'")
    
    def test_geocode_reverse(self):
        """Test GET /api/geocode/reverse"""
        response = requests.get(f"{BASE_URL}/api/geocode/reverse", params={
            "lat": 50.0755, "lon": 14.4378
        })
        assert response.status_code == 200
        print("✓ Geocode reverse working")


class TestAresLookup:
    """Test ARES company lookup"""
    
    def test_ares_valid_ico(self):
        """Test GET /api/ares/{ico} with valid ICO"""
        # Using a known valid Czech ICO
        response = requests.get(f"{BASE_URL}/api/ares/09744550")
        # May return 404 if ICO not found, or 200 with data
        assert response.status_code in [200, 404, 503]
        if response.status_code == 200:
            data = response.json()
            assert "company_name" in data
            print(f"✓ ARES lookup: {data.get('company_name', 'N/A')}")
        else:
            print(f"✓ ARES lookup returned {response.status_code} (service may be unavailable)")


class TestPasswordReset:
    """Test password reset flow"""
    
    def test_forgot_password_endpoint(self):
        """Test POST /api/auth/forgot-password"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": CUSTOMER_EMAIL
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("✓ Forgot password endpoint working")
    
    def test_reset_password_invalid_token(self):
        """Test POST /api/auth/reset-password with invalid token"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_12345",
            "password": "NewPassword123!"
        })
        assert response.status_code == 400
        print("✓ Reset password correctly rejects invalid token")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
