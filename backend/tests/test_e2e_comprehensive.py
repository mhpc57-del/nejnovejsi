"""
CraftBolt E2E Comprehensive Backend Tests
Tests all major API endpoints and flows
"""
import pytest
import requests
import uuid
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://is-online.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"

# Generate unique test emails
TEST_CUSTOMER_EMAIL = f"test-customer-{uuid.uuid4().hex[:8]}@example.com"
TEST_SUPPLIER_EMAIL = f"test-supplier-{uuid.uuid4().hex[:8]}@example.com"
TEST_PASSWORD = "TestPass123!"


class TestHealthAndCategories:
    """Test basic health and categories endpoints"""
    
    def test_health_endpoint(self):
        """FLOW 1: Health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")
    
    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "CraftBolt" in data.get("message", "")
        print("✓ Root endpoint working")
    
    def test_categories_returns_61(self):
        """FLOW 13: GET /api/categories returns 61 categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) == 61
        print(f"✓ Categories endpoint returns {len(data['categories'])} categories")


class TestARESIntegration:
    """Test ARES lookup integration"""
    
    def test_ares_lookup_valid_ico(self):
        """FLOW 14: GET /api/ares/{ico} returns company data"""
        response = requests.get(f"{BASE_URL}/api/ares/27082440")
        assert response.status_code == 200
        data = response.json()
        assert data["company_name"] == "Alza.cz a.s."
        assert data["ico"] == "27082440"
        assert "CZ27082440" in data.get("dic", "")
        assert "Praha" in data.get("address", "")
        print(f"✓ ARES lookup working: {data['company_name']}")
    
    def test_ares_lookup_invalid_ico(self):
        """Test ARES with invalid IČO"""
        response = requests.get(f"{BASE_URL}/api/ares/00000000")
        assert response.status_code in [404, 503]
        print("✓ ARES returns error for invalid IČO")


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """FLOW 4: Login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful: {data['user']['email']}")
        return data["access_token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")


class TestCustomerRegistration:
    """Test customer registration flow"""
    
    def test_register_customer_nepodnikatel(self):
        """FLOW 2: Full multi-step registration as customer"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_CUSTOMER_EMAIL,
            "password": TEST_PASSWORD,
            "phone": "+420123456789",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Test",
            "last_name": "Customer",
            "permanent_address": "Test Street 123, Prague",
            "actual_address": "Test Street 123, Prague",
            "date_of_birth": "1990-01-15",
            "bio": "Test customer account"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "customer"
        assert data["user"]["account_type"] == "nepodnikatel"
        assert data["user"]["email"] == TEST_CUSTOMER_EMAIL
        print(f"✓ Customer registration successful: {TEST_CUSTOMER_EMAIL}")
        return data["access_token"], data["user"]["id"]
    
    def test_customer_can_login_after_registration(self):
        """Verify new customer can login"""
        # First register
        email = f"test-login-{uuid.uuid4().hex[:8]}@example.com"
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "phone": "+420111222333",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Login",
            "last_name": "Test"
        })
        assert reg_response.status_code == 200
        
        # Then login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        data = login_response.json()
        assert data["user"]["email"] == email
        print(f"✓ Customer can login after registration: {email}")


class TestSupplierRegistration:
    """Test supplier registration flow"""
    
    def test_register_supplier_osvc(self):
        """FLOW 3: Multi-step registration as supplier OSVČ"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_SUPPLIER_EMAIL,
            "password": TEST_PASSWORD,
            "phone": "+420987654321",
            "role": "supplier",
            "account_type": "osvc",
            "company_name": "Test Supplier OSVČ",
            "first_name": "Test",
            "last_name": "Supplier",
            "ico": "12345678",
            "dic": "CZ12345678",
            "address": "Business Street 456, Brno",
            "categories": ["Instalatérství", "Elektromontáže - silnoproud"],
            "bio": "Test supplier account"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "supplier"
        assert data["user"]["account_type"] == "osvc"
        assert "Instalatérství" in data["user"]["categories"]
        print(f"✓ Supplier OSVČ registration successful: {TEST_SUPPLIER_EMAIL}")
        return data["access_token"], data["user"]["id"]


class TestAdminDashboard:
    """Test admin dashboard endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_admin_stats(self, admin_token):
        """FLOW 12: Admin stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "customers" in data
        assert "suppliers" in data
        assert "total_demands" in data
        print(f"✓ Admin stats: {data['total_users']} users, {data['total_demands']} demands")
    
    def test_admin_users_list(self, admin_token):
        """FLOW 12: Admin users list"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Admin users list: {len(data)} users")
    
    def test_admin_demands_list(self, admin_token):
        """FLOW 12: Admin demands list"""
        response = requests.get(f"{BASE_URL}/api/admin/demands", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin demands list: {len(data)} demands")


class TestDemandLifecycle:
    """Test complete demand lifecycle"""
    
    @pytest.fixture
    def customer_auth(self):
        """Create and login as customer"""
        email = f"test-demand-customer-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "phone": "+420555666777",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Demand",
            "last_name": "Customer"
        })
        data = response.json()
        return data["access_token"], data["user"]["id"]
    
    @pytest.fixture
    def supplier_auth(self):
        """Create and login as supplier"""
        email = f"test-demand-supplier-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": TEST_PASSWORD,
            "phone": "+420888999000",
            "role": "supplier",
            "account_type": "osvc",
            "company_name": "Demand Test Supplier",
            "first_name": "Demand",
            "last_name": "Supplier",
            "ico": "87654321",
            "categories": ["Instalatérství", "Zednictví, obkladačství, dlaždičství"]
        })
        data = response.json()
        return data["access_token"], data["user"]["id"]
    
    def test_create_demand(self, customer_auth):
        """FLOW 5: Customer creates demand"""
        token, user_id = customer_auth
        response = requests.post(f"{BASE_URL}/api/demands", json={
            "title": "Test Demand - Oprava vodovodního potrubí",
            "description": "Potřebuji opravit prasklé potrubí v koupelně",
            "category": "Instalatérství",
            "address": "Testovací 123, Praha",
            "latitude": 50.0755,
            "longitude": 14.4378,
            "budget_min": 1000,
            "budget_max": 5000,
            "payment_method": "cash"
        }, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "open"
        assert data["title"] == "Test Demand - Oprava vodovodního potrubí"
        assert data["customer_id"] == user_id
        print(f"✓ Demand created: {data['id']}")
        return data["id"]
    
    def test_demand_lifecycle_full(self, customer_auth, supplier_auth):
        """FLOW 7: Complete demand lifecycle"""
        customer_token, customer_id = customer_auth
        supplier_token, supplier_id = supplier_auth
        
        # 1. Customer creates demand
        create_response = requests.post(f"{BASE_URL}/api/demands", json={
            "title": "Lifecycle Test - Instalace",
            "description": "Test demand for lifecycle",
            "category": "Instalatérství",
            "address": "Test Address 456, Brno",
            "latitude": 49.1951,
            "longitude": 16.6068,
            "budget_max": 3000,
            "payment_method": "card"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        assert create_response.status_code == 200
        demand_id = create_response.json()["id"]
        print(f"  1. Demand created: {demand_id}")
        
        # 2. Supplier accepts demand
        accept_response = requests.post(f"{BASE_URL}/api/demands/{demand_id}/accept", 
            headers={"Authorization": f"Bearer {supplier_token}"})
        assert accept_response.status_code == 200
        print("  2. Supplier accepted demand")
        
        # Verify status changed to in_progress
        get_response = requests.get(f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {customer_token}"})
        assert get_response.json()["status"] == "in_progress"
        assert get_response.json()["assigned_supplier_id"] == supplier_id
        
        # 3. Supplier arrives
        arrive_response = requests.post(f"{BASE_URL}/api/demands/{demand_id}/arrive",
            headers={"Authorization": f"Bearer {supplier_token}"})
        assert arrive_response.status_code == 200
        print(f"  3. Supplier arrived: {arrive_response.json()}")
        
        # Verify supplier_arrived flag
        get_response2 = requests.get(f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {customer_token}"})
        assert get_response2.json()["supplier_arrived"] == True
        
        # 4. Complete demand
        complete_response = requests.post(f"{BASE_URL}/api/demands/{demand_id}/complete",
            headers={"Authorization": f"Bearer {customer_token}"})
        assert complete_response.status_code == 200
        print("  4. Demand completed")
        
        # Verify status is completed
        get_response3 = requests.get(f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {customer_token}"})
        assert get_response3.json()["status"] == "completed"
        
        print("✓ Full demand lifecycle completed successfully")
        return demand_id, customer_token, supplier_id


class TestReviewsAndPunctuality:
    """Test reviews and punctuality system"""
    
    def test_create_review_after_completion(self):
        """FLOW 16: Create review with punctuality blending"""
        # Create customer
        customer_email = f"test-review-customer-{uuid.uuid4().hex[:8]}@example.com"
        customer_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": customer_email,
            "password": TEST_PASSWORD,
            "phone": "+420111222333",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Review",
            "last_name": "Customer"
        })
        customer_token = customer_reg.json()["access_token"]
        
        # Create supplier
        supplier_email = f"test-review-supplier-{uuid.uuid4().hex[:8]}@example.com"
        supplier_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": supplier_email,
            "password": TEST_PASSWORD,
            "phone": "+420444555666",
            "role": "supplier",
            "account_type": "osvc",
            "company_name": "Review Test Supplier",
            "first_name": "Review",
            "last_name": "Supplier",
            "ico": "11223344",
            "categories": ["Instalatérství"]
        })
        supplier_token = supplier_reg.json()["access_token"]
        supplier_id = supplier_reg.json()["user"]["id"]
        
        # Create and complete demand
        demand_response = requests.post(f"{BASE_URL}/api/demands", json={
            "title": "Review Test Demand",
            "description": "Test for review",
            "category": "Instalatérství",
            "address": "Review Street 789",
            "budget_max": 2000,
            "payment_method": "cash"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        demand_id = demand_response.json()["id"]
        
        # Accept, arrive, complete
        requests.post(f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"})
        requests.post(f"{BASE_URL}/api/demands/{demand_id}/arrive",
            headers={"Authorization": f"Bearer {supplier_token}"})
        requests.post(f"{BASE_URL}/api/demands/{demand_id}/complete",
            headers={"Authorization": f"Bearer {customer_token}"})
        
        # Create review
        review_response = requests.post(f"{BASE_URL}/api/reviews", json={
            "demand_id": demand_id,
            "rating": 5,
            "comment": "Excellent work!",
            "rating_percentage": 90
        }, headers={"Authorization": f"Bearer {customer_token}"})
        assert review_response.status_code == 200
        review_data = review_response.json()
        assert review_data["rating"] == 5
        assert review_data["rating_percentage"] == 90
        print(f"✓ Review created with rating_percentage: {review_data['rating_percentage']}%")
        
        # Verify supplier's rating was updated
        supplier_response = requests.get(f"{BASE_URL}/api/users/{supplier_id}")
        assert supplier_response.status_code == 200
        supplier_data = supplier_response.json()
        assert supplier_data["reviews_count"] >= 1
        print(f"✓ Supplier rating updated: {supplier_data.get('rating_percentage', 0)}%")


class TestMessaging:
    """Test messaging system"""
    
    def test_send_and_receive_messages(self):
        """FLOW 9: Chat/Messaging"""
        # Create customer and supplier
        customer_email = f"test-msg-customer-{uuid.uuid4().hex[:8]}@example.com"
        customer_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": customer_email,
            "password": TEST_PASSWORD,
            "phone": "+420777888999",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Msg",
            "last_name": "Customer"
        })
        customer_token = customer_reg.json()["access_token"]
        
        supplier_email = f"test-msg-supplier-{uuid.uuid4().hex[:8]}@example.com"
        supplier_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": supplier_email,
            "password": TEST_PASSWORD,
            "phone": "+420666555444",
            "role": "supplier",
            "account_type": "osvc",
            "company_name": "Msg Test Supplier",
            "first_name": "Msg",
            "last_name": "Supplier",
            "ico": "55667788",
            "categories": ["Instalatérství"]
        })
        supplier_token = supplier_reg.json()["access_token"]
        
        # Create demand
        demand_response = requests.post(f"{BASE_URL}/api/demands", json={
            "title": "Message Test Demand",
            "description": "Test for messaging",
            "category": "Instalatérství",
            "address": "Message Street 123",
            "budget_max": 1500,
            "payment_method": "cash"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        demand_id = demand_response.json()["id"]
        
        # Supplier accepts
        requests.post(f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        # Customer sends message
        msg_response = requests.post(f"{BASE_URL}/api/messages", json={
            "demand_id": demand_id,
            "content": "Hello, when can you come?"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        assert msg_response.status_code == 200
        print("✓ Customer sent message")
        
        # Supplier sends reply
        reply_response = requests.post(f"{BASE_URL}/api/messages", json={
            "demand_id": demand_id,
            "content": "I can come tomorrow at 10am"
        }, headers={"Authorization": f"Bearer {supplier_token}"})
        assert reply_response.status_code == 200
        print("✓ Supplier sent reply")
        
        # Get messages
        get_messages = requests.get(f"{BASE_URL}/api/messages/{demand_id}",
            headers={"Authorization": f"Bearer {customer_token}"})
        assert get_messages.status_code == 200
        messages = get_messages.json()
        assert len(messages) == 2
        print(f"✓ Retrieved {len(messages)} messages")


class TestCancelDemand:
    """Test demand cancellation"""
    
    def test_cancel_demand_with_reason(self):
        """FLOW 22: Cancel a demand with reason"""
        # Create customer
        customer_email = f"test-cancel-{uuid.uuid4().hex[:8]}@example.com"
        customer_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": customer_email,
            "password": TEST_PASSWORD,
            "phone": "+420333222111",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Cancel",
            "last_name": "Test"
        })
        customer_token = customer_reg.json()["access_token"]
        
        # Create demand
        demand_response = requests.post(f"{BASE_URL}/api/demands", json={
            "title": "Cancel Test Demand",
            "description": "This will be cancelled",
            "category": "Instalatérství",
            "address": "Cancel Street 999",
            "budget_max": 1000,
            "payment_method": "cash"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        demand_id = demand_response.json()["id"]
        
        # Cancel with reason
        cancel_response = requests.post(f"{BASE_URL}/api/demands/{demand_id}/cancel-reason?reason=Changed%20my%20mind",
            headers={"Authorization": f"Bearer {customer_token}"})
        assert cancel_response.status_code == 200
        
        # Verify status
        get_response = requests.get(f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {customer_token}"})
        assert get_response.json()["status"] == "cancelled"
        print("✓ Demand cancelled with reason")


class TestFileUpload:
    """Test file upload endpoints"""
    
    def test_public_upload(self):
        """FLOW 17: POST /api/upload/public with image file"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        # Minimal valid PNG
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {'file': ('test.png', png_data, 'image/png')}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert data["url"].startswith("/api/uploads/")
        print(f"✓ Public upload successful: {data['url']}")


class TestCertifications:
    """Test certifications CRUD"""
    
    def test_certifications_crud(self):
        """FLOW 18: Supplier can upload/view/delete certifications"""
        # Create supplier
        supplier_email = f"test-cert-{uuid.uuid4().hex[:8]}@example.com"
        supplier_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": supplier_email,
            "password": TEST_PASSWORD,
            "phone": "+420999888777",
            "role": "supplier",
            "account_type": "osvc",
            "company_name": "Cert Test Supplier",
            "first_name": "Cert",
            "last_name": "Supplier",
            "ico": "99887766",
            "categories": ["Instalatérství"]
        })
        supplier_token = supplier_reg.json()["access_token"]
        supplier_id = supplier_reg.json()["user"]["id"]
        
        # Upload certification
        cert_response = requests.post(f"{BASE_URL}/api/users/certifications", json={
            "name": "Test Certification",
            "description": "Test cert description",
            "file_url": "/api/uploads/test-cert.pdf"
        }, headers={"Authorization": f"Bearer {supplier_token}"})
        assert cert_response.status_code == 200
        cert_data = cert_response.json()
        cert_id = cert_data["certification"]["id"]
        print(f"✓ Certification uploaded: {cert_id}")
        
        # Get certifications
        get_response = requests.get(f"{BASE_URL}/api/users/{supplier_id}/certifications")
        assert get_response.status_code == 200
        certs = get_response.json()["certifications"]
        assert len(certs) >= 1
        print(f"✓ Retrieved {len(certs)} certifications")
        
        # Delete certification
        delete_response = requests.delete(f"{BASE_URL}/api/users/certifications/{cert_id}",
            headers={"Authorization": f"Bearer {supplier_token}"})
        assert delete_response.status_code == 200
        print("✓ Certification deleted")


class TestSupplierFinances:
    """Test supplier finances endpoint"""
    
    def test_get_supplier_finances(self):
        """FLOW 19: GET /api/suppliers/{id}/finances returns earnings data"""
        # Create supplier
        supplier_email = f"test-finance-{uuid.uuid4().hex[:8]}@example.com"
        supplier_reg = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": supplier_email,
            "password": TEST_PASSWORD,
            "phone": "+420111333555",
            "role": "supplier",
            "account_type": "osvc",
            "company_name": "Finance Test Supplier",
            "first_name": "Finance",
            "last_name": "Supplier",
            "ico": "11335577",
            "categories": ["Instalatérství"]
        })
        supplier_token = supplier_reg.json()["access_token"]
        supplier_id = supplier_reg.json()["user"]["id"]
        
        # Get finances
        finance_response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}/finances",
            headers={"Authorization": f"Bearer {supplier_token}"})
        assert finance_response.status_code == 200
        data = finance_response.json()
        assert "total_income" in data
        assert "completed_jobs" in data
        assert "transactions" in data
        print(f"✓ Supplier finances: {data['total_income']} Kč, {data['completed_jobs']} jobs")


class TestProtectedRoutes:
    """Test protected route access"""
    
    def test_unauthenticated_access_rejected(self):
        """FLOW 21: Unauthenticated access to protected endpoints"""
        # Try to access demands without auth
        response = requests.get(f"{BASE_URL}/api/demands/my")
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden is acceptable
        print("✓ Unauthenticated access to /api/demands/my rejected")
        
        # Try to access admin stats without auth
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        assert response.status_code in [401, 403]  # Either unauthorized or forbidden is acceptable
        print("✓ Unauthenticated access to /api/admin/stats rejected")


class TestPublicPages:
    """Test public page access"""
    
    def test_public_user_profile(self):
        """FLOW 10: View other user's profile (read-only)"""
        # Get admin user profile (public)
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_id = admin_login.json()["user"]["id"]
        
        # Access profile without auth
        response = requests.get(f"{BASE_URL}/api/users/{admin_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        # Password should not be in response
        assert "password" not in data
        print(f"✓ Public profile access working: {data['email']}")
    
    def test_public_reviews_access(self):
        """Test public access to user reviews"""
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_id = admin_login.json()["user"]["id"]
        
        response = requests.get(f"{BASE_URL}/api/reviews/user/{admin_id}")
        assert response.status_code == 200
        print("✓ Public reviews access working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
