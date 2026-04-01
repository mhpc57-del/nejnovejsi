"""
CraftBolt Iteration 3 Backend Tests
Tests for:
1. Modular backend (all endpoints preserved after refactoring)
2. Supplier Arrived endpoint (POST /api/demands/{id}/arrive)
3. Rating percentage in reviews (0-100%)
4. Certifications CRUD for suppliers
5. Admin trust score management
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"


class TestHealthAndBasicEndpoints:
    """Test that modular backend preserved all basic endpoints"""
    
    def test_health_endpoint(self):
        """GET /api/health should return healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint works")
    
    def test_categories_endpoint(self):
        """GET /api/categories should return 61 categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        categories = data.get("categories", [])
        assert len(categories) == 61, f"Expected 61 categories, got {len(categories)}"
        print(f"✓ Categories endpoint returns {len(categories)} categories")
    
    def test_geocode_search(self):
        """GET /api/geocode/search?q=Praha should return results"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Praha"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list of results"
        assert len(data) > 0, "Expected at least one result for Praha"
        print(f"✓ Geocode search returns {len(data)} results for Praha")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """POST /api/auth/login with admin credentials should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data["user"]["role"] == "admin", f"Expected admin role, got {data['user']['role']}"
        print(f"✓ Admin login successful, role: {data['user']['role']}")
        return data["access_token"]


class TestRegistrationWithNewFields:
    """Test registration includes new fields (rating_percentage, certifications)"""
    
    def test_register_customer_has_new_fields(self):
        """POST /api/auth/register should create user with rating_percentage and certifications"""
        unique_email = f"test-customer-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "customer",
            "company_name": "Test Customer"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        user = data.get("user", {})
        
        # Check new fields exist
        assert "rating_percentage" in user, "rating_percentage field missing"
        assert "certifications" in user, "certifications field missing"
        assert user["rating_percentage"] == 0.0, f"Expected rating_percentage=0.0, got {user['rating_percentage']}"
        assert user["certifications"] == [], f"Expected empty certifications, got {user['certifications']}"
        print(f"✓ Registration includes rating_percentage={user['rating_percentage']} and certifications={user['certifications']}")
        return data["access_token"], user["id"]
    
    def test_register_supplier_has_new_fields(self):
        """POST /api/auth/register for supplier should have trust_score=0"""
        unique_email = f"test-supplier-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "supplier",
            "company_name": "Test Supplier",
            "account_type": "osvc",
            "categories": ["Instalatérství"]
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        user = data.get("user", {})
        
        assert "trust_score" in user, "trust_score field missing"
        assert user["trust_score"] == 0, f"Expected trust_score=0, got {user['trust_score']}"
        print(f"✓ Supplier registration includes trust_score={user['trust_score']}")
        return data["access_token"], user["id"]


class TestSupplierArrivedEndpoint:
    """Test the new supplier arrived feature"""
    
    @pytest.fixture
    def customer_auth(self):
        """Create a customer and return token"""
        unique_email = f"test-customer-arrive-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "customer",
            "company_name": "Arrive Test Customer"
        })
        assert response.status_code == 200
        data = response.json()
        return data["access_token"], data["user"]["id"]
    
    @pytest.fixture
    def supplier_auth(self):
        """Create a supplier and return token"""
        unique_email = f"test-supplier-arrive-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "supplier",
            "company_name": "Arrive Test Supplier",
            "account_type": "osvc",
            "categories": ["Instalatérství"]
        })
        assert response.status_code == 200
        data = response.json()
        return data["access_token"], data["user"]["id"]
    
    def test_arrive_endpoint_full_flow(self, customer_auth, supplier_auth):
        """Test full flow: create demand -> accept -> arrive"""
        customer_token, customer_id = customer_auth
        supplier_token, supplier_id = supplier_auth
        
        # Step 1: Customer creates demand
        response = requests.post(f"{BASE_URL}/api/demands", 
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "title": "Test Arrive Demand",
                "description": "Testing supplier arrived feature",
                "category": "Instalatérství",
                "address": "Praha 1",
                "payment_method": "cash"
            })
        assert response.status_code == 200, f"Create demand failed: {response.text}"
        demand = response.json()
        demand_id = demand["id"]
        assert demand["supplier_arrived"] == False, "supplier_arrived should be False initially"
        print(f"✓ Demand created with supplier_arrived=False")
        
        # Step 2: Supplier accepts demand
        response = requests.post(f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"})
        assert response.status_code == 200, f"Accept demand failed: {response.text}"
        print("✓ Supplier accepted demand")
        
        # Step 3: Supplier marks arrival
        response = requests.post(f"{BASE_URL}/api/demands/{demand_id}/arrive",
            headers={"Authorization": f"Bearer {supplier_token}"})
        assert response.status_code == 200, f"Arrive failed: {response.text}"
        data = response.json()
        assert "arrived_at" in data, "arrived_at missing in response"
        assert "arrival_minutes" in data, "arrival_minutes missing in response"
        print(f"✓ Supplier arrived, arrival_minutes={data.get('arrival_minutes')}")
        
        # Step 4: Verify demand has supplier_arrived=True
        response = requests.get(f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {customer_token}"})
        assert response.status_code == 200
        demand = response.json()
        assert demand["supplier_arrived"] == True, "supplier_arrived should be True after arrive"
        assert demand["supplier_arrived_at"] is not None, "supplier_arrived_at should be set"
        print(f"✓ Demand updated: supplier_arrived={demand['supplier_arrived']}, arrived_at={demand['supplier_arrived_at']}")
    
    def test_arrive_requires_supplier_role(self, customer_auth, supplier_auth):
        """Customer cannot call arrive endpoint"""
        customer_token, _ = customer_auth
        supplier_token, _ = supplier_auth
        
        # Create and accept demand first
        response = requests.post(f"{BASE_URL}/api/demands", 
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "title": "Test Arrive Auth",
                "description": "Testing auth",
                "category": "Instalatérství",
                "address": "Praha 1",
                "payment_method": "cash"
            })
        demand_id = response.json()["id"]
        
        requests.post(f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        # Customer tries to call arrive - should fail
        response = requests.post(f"{BASE_URL}/api/demands/{demand_id}/arrive",
            headers={"Authorization": f"Bearer {customer_token}"})
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Customer cannot call arrive endpoint (403)")


class TestRatingPercentage:
    """Test rating_percentage in reviews"""
    
    @pytest.fixture
    def completed_demand_setup(self):
        """Create customer, supplier, demand, accept, and complete it"""
        # Create customer
        customer_email = f"test-review-customer-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": customer_email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "customer",
            "company_name": "Review Test Customer"
        })
        customer_token = response.json()["access_token"]
        customer_id = response.json()["user"]["id"]
        
        # Create supplier
        supplier_email = f"test-review-supplier-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": supplier_email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "supplier",
            "company_name": "Review Test Supplier",
            "account_type": "osvc",
            "categories": ["Instalatérství"]
        })
        supplier_token = response.json()["access_token"]
        supplier_id = response.json()["user"]["id"]
        
        # Create demand
        response = requests.post(f"{BASE_URL}/api/demands", 
            headers={"Authorization": f"Bearer {customer_token}"},
            json={
                "title": "Test Review Demand",
                "description": "Testing rating percentage",
                "category": "Instalatérství",
                "address": "Praha 1",
                "payment_method": "cash"
            })
        demand_id = response.json()["id"]
        
        # Accept demand
        requests.post(f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"})
        
        # Complete demand
        requests.post(f"{BASE_URL}/api/demands/{demand_id}/complete",
            headers={"Authorization": f"Bearer {customer_token}"})
        
        return {
            "customer_token": customer_token,
            "customer_id": customer_id,
            "supplier_token": supplier_token,
            "supplier_id": supplier_id,
            "demand_id": demand_id
        }
    
    def test_review_with_rating_percentage(self, completed_demand_setup):
        """POST /api/reviews should accept rating_percentage field"""
        setup = completed_demand_setup
        
        response = requests.post(f"{BASE_URL}/api/reviews",
            headers={"Authorization": f"Bearer {setup['customer_token']}"},
            json={
                "demand_id": setup["demand_id"],
                "rating": 5,
                "comment": "Excellent work!",
                "rating_percentage": 95,
                "images": []
            })
        assert response.status_code == 200, f"Create review failed: {response.text}"
        review = response.json()
        assert review["rating_percentage"] == 95, f"Expected rating_percentage=95, got {review.get('rating_percentage')}"
        print(f"✓ Review created with rating_percentage={review['rating_percentage']}")
        
        # Verify supplier's rating_percentage was updated
        response = requests.get(f"{BASE_URL}/api/users/{setup['supplier_id']}")
        assert response.status_code == 200
        user = response.json()
        assert user["rating_percentage"] == 95.0, f"Expected user rating_percentage=95.0, got {user.get('rating_percentage')}"
        print(f"✓ Supplier rating_percentage updated to {user['rating_percentage']}")


class TestCertifications:
    """Test certifications CRUD for suppliers"""
    
    @pytest.fixture
    def supplier_auth(self):
        """Create a supplier and return token"""
        unique_email = f"test-cert-supplier-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "supplier",
            "company_name": "Cert Test Supplier",
            "account_type": "osvc",
            "categories": ["Instalatérství"]
        })
        assert response.status_code == 200
        data = response.json()
        return data["access_token"], data["user"]["id"]
    
    @pytest.fixture
    def customer_auth(self):
        """Create a customer and return token"""
        unique_email = f"test-cert-customer-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "customer",
            "company_name": "Cert Test Customer"
        })
        assert response.status_code == 200
        data = response.json()
        return data["access_token"], data["user"]["id"]
    
    def test_upload_certification(self, supplier_auth):
        """POST /api/users/certifications should upload a certification"""
        token, user_id = supplier_auth
        
        response = requests.post(f"{BASE_URL}/api/users/certifications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "ISO 9001 Certificate",
                "description": "Quality management certification",
                "file_url": "https://example.com/cert.pdf"
            })
        assert response.status_code == 200, f"Upload certification failed: {response.text}"
        data = response.json()
        assert "certification" in data, "certification missing in response"
        cert = data["certification"]
        assert cert["name"] == "ISO 9001 Certificate"
        assert "id" in cert, "certification id missing"
        print(f"✓ Certification uploaded: {cert['name']}, id={cert['id']}")
        return cert["id"]
    
    def test_get_certifications(self, supplier_auth):
        """GET /api/users/{id}/certifications should return certifications list"""
        token, user_id = supplier_auth
        
        # First upload a certification
        requests.post(f"{BASE_URL}/api/users/certifications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Test Cert",
                "description": "Test",
                "file_url": "https://example.com/test.pdf"
            })
        
        # Get certifications
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/certifications")
        assert response.status_code == 200, f"Get certifications failed: {response.text}"
        data = response.json()
        assert "certifications" in data, "certifications key missing"
        assert len(data["certifications"]) >= 1, "Expected at least 1 certification"
        print(f"✓ Got {len(data['certifications'])} certifications")
    
    def test_delete_certification(self, supplier_auth):
        """DELETE /api/users/certifications/{id} should remove certification"""
        token, user_id = supplier_auth
        
        # Upload certification
        response = requests.post(f"{BASE_URL}/api/users/certifications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "To Delete Cert",
                "description": "Will be deleted",
                "file_url": "https://example.com/delete.pdf"
            })
        cert_id = response.json()["certification"]["id"]
        
        # Delete certification
        response = requests.delete(f"{BASE_URL}/api/users/certifications/{cert_id}",
            headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200, f"Delete certification failed: {response.text}"
        print(f"✓ Certification {cert_id} deleted")
        
        # Verify it's gone
        response = requests.get(f"{BASE_URL}/api/users/{user_id}/certifications")
        certs = response.json()["certifications"]
        cert_ids = [c["id"] for c in certs]
        assert cert_id not in cert_ids, "Certification should be deleted"
        print("✓ Certification no longer in list")
    
    def test_customer_cannot_upload_certification(self, customer_auth):
        """Customer should not be able to upload certifications"""
        token, _ = customer_auth
        
        response = requests.post(f"{BASE_URL}/api/users/certifications",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "name": "Customer Cert",
                "description": "Should fail",
                "file_url": "https://example.com/fail.pdf"
            })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Customer cannot upload certifications (403)")


class TestAdminTrustScore:
    """Test admin trust score management"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    def supplier_auth(self):
        """Create a supplier and return token and id"""
        unique_email = f"test-trust-supplier-{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "supplier",
            "company_name": "Trust Test Supplier",
            "account_type": "osvc",
            "categories": ["Instalatérství"]
        })
        assert response.status_code == 200
        data = response.json()
        return data["access_token"], data["user"]["id"]
    
    def test_admin_can_set_trust_score(self, admin_token, supplier_auth):
        """PUT /api/admin/users/{id}/trust-score should update trust score"""
        _, supplier_id = supplier_auth
        
        response = requests.put(f"{BASE_URL}/api/admin/users/{supplier_id}/trust-score",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": supplier_id,
                "trust_score": 4
            })
        assert response.status_code == 200, f"Set trust score failed: {response.text}"
        print("✓ Admin set trust score to 4")
        
        # Verify trust score was updated
        response = requests.get(f"{BASE_URL}/api/users/{supplier_id}")
        assert response.status_code == 200
        user = response.json()
        assert user["trust_score"] == 4, f"Expected trust_score=4, got {user.get('trust_score')}"
        print(f"✓ Supplier trust_score updated to {user['trust_score']}")
    
    def test_trust_score_validation(self, admin_token, supplier_auth):
        """Trust score must be 0-5"""
        _, supplier_id = supplier_auth
        
        # Try invalid trust score (6)
        response = requests.put(f"{BASE_URL}/api/admin/users/{supplier_id}/trust-score",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "user_id": supplier_id,
                "trust_score": 6
            })
        assert response.status_code == 400, f"Expected 400 for invalid trust score, got {response.status_code}"
        print("✓ Invalid trust score (6) rejected with 400")
    
    def test_non_admin_cannot_set_trust_score(self, supplier_auth):
        """Non-admin cannot set trust score"""
        supplier_token, supplier_id = supplier_auth
        
        response = requests.put(f"{BASE_URL}/api/admin/users/{supplier_id}/trust-score",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={
                "user_id": supplier_id,
                "trust_score": 5
            })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Non-admin cannot set trust score (403)")


class TestPublicUpload:
    """Test public upload endpoint"""
    
    def test_public_upload_accepts_image(self):
        """POST /api/upload/public should accept file uploads without auth"""
        # Create a simple test image (1x1 PNG)
        import base64
        png_data = base64.b64decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        )
        
        files = {"file": ("test.png", png_data, "image/png")}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        assert response.status_code == 200, f"Public upload failed: {response.text}"
        data = response.json()
        assert "url" in data, "url missing in response"
        print(f"✓ Public upload successful, url={data['url']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
