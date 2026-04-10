"""
Iteration 29 - Admin Promo Dashboard Tests
Tests for admin dashboard 'Reklama' tab endpoints:
- GET /api/admin/promoted-stats (admin stats)
- DELETE /api/admin/promoted/{id} (delete promo)
- PUT /api/admin/promoted/{id}/deactivate (deactivate promo)
- PUT /api/admin/promoted/{id}/extend (extend promo by 1 day)
- 403 for non-admin users
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"
CUSTOMER_EMAIL = "testvendulka@test.cz"
CUSTOMER_PASSWORD = "TestHeslo123!"


class TestAdminPromoAuth:
    """Test authentication and authorization for admin promo endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token for 403 tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    def test_admin_login_success(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"Admin login successful, token length: {len(admin_token)}")
    
    def test_customer_login_success(self, customer_token):
        """Verify customer can login"""
        assert customer_token is not None
        assert len(customer_token) > 0
        print(f"Customer login successful, token length: {len(customer_token)}")


class TestAdminPromoStats:
    """Test GET /api/admin/promoted-stats endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_admin_promoted_stats_success(self, admin_token):
        """Admin can get promoted stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/promoted-stats", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "active" in data, "Missing 'active' field"
        assert "expired" in data, "Missing 'expired' field"
        assert "pending" in data, "Missing 'pending' field"
        assert "revenue_total" in data, "Missing 'revenue_total' field"
        assert "revenue_month" in data, "Missing 'revenue_month' field"
        assert "suppliers" in data, "Missing 'suppliers' field"
        
        # Verify data types
        assert isinstance(data["active"], int)
        assert isinstance(data["expired"], int)
        assert isinstance(data["pending"], int)
        assert isinstance(data["revenue_total"], int)
        assert isinstance(data["revenue_month"], int)
        assert isinstance(data["suppliers"], list)
        
        print(f"Admin promo stats: active={data['active']}, expired={data['expired']}, pending={data['pending']}")
        print(f"Revenue: total={data['revenue_total']} CZK, month={data['revenue_month']} CZK")
        print(f"Total suppliers in list: {len(data['suppliers'])}")
    
    def test_customer_promoted_stats_forbidden(self, customer_token):
        """Non-admin (customer) should get 403 for promoted stats"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/promoted-stats", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Customer correctly denied access to admin promo stats (403)")
    
    def test_unauthenticated_promoted_stats_forbidden(self):
        """Unauthenticated request should get 401 or 403"""
        response = requests.get(f"{BASE_URL}/api/admin/promoted-stats")
        
        # Accept both 401 and 403 as valid denial responses
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}: {response.text}"
        print(f"Unauthenticated request correctly denied ({response.status_code})")


class TestAdminPromoActions:
    """Test admin promo actions: extend, deactivate, delete"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    def test_promo_supplier(self, admin_token):
        """Create a test promoted supplier for action tests"""
        unique_id = str(uuid.uuid4())[:6]
        
        # Create promoted supplier
        response = requests.post(f"{BASE_URL}/api/promoted-suppliers", json={
            "company_name": f"TEST_AdminPromo_{unique_id}",
            "bio": "Test promo for admin action tests",
            "phone": "+420123456789"
        })
        assert response.status_code == 200, f"Failed to create test promo: {response.text}"
        data = response.json()
        supplier_id = data["id"]
        
        # Activate it
        response = requests.post(f"{BASE_URL}/api/promoted-suppliers/{supplier_id}/activate")
        assert response.status_code == 200, f"Failed to activate test promo: {response.text}"
        
        print(f"Created and activated test promo supplier: {supplier_id}")
        return supplier_id
    
    def test_admin_extend_promo(self, admin_token, test_promo_supplier):
        """Admin can extend a promoted supplier by 1 day"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        supplier_id = test_promo_supplier
        
        # Get current paid_until
        stats_response = requests.get(f"{BASE_URL}/api/admin/promoted-stats", headers=headers)
        assert stats_response.status_code == 200
        suppliers = stats_response.json()["suppliers"]
        supplier = next((s for s in suppliers if s["id"] == supplier_id), None)
        assert supplier is not None, f"Test supplier {supplier_id} not found in stats"
        original_paid_until = supplier.get("paid_until")
        
        # Extend
        response = requests.put(f"{BASE_URL}/api/admin/promoted/{supplier_id}/extend", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "paid_until" in data
        
        # Verify extension
        new_paid_until = data["paid_until"]
        print(f"Extended promo {supplier_id}: original={original_paid_until}, new={new_paid_until}")
        assert new_paid_until > original_paid_until, "paid_until should be extended"
    
    def test_admin_deactivate_promo(self, admin_token, test_promo_supplier):
        """Admin can deactivate a promoted supplier"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        supplier_id = test_promo_supplier
        
        response = requests.put(f"{BASE_URL}/api/admin/promoted/{supplier_id}/deactivate", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        
        # Verify deactivation
        stats_response = requests.get(f"{BASE_URL}/api/admin/promoted-stats", headers=headers)
        suppliers = stats_response.json()["suppliers"]
        supplier = next((s for s in suppliers if s["id"] == supplier_id), None)
        assert supplier is not None
        assert supplier["active"] == False, "Supplier should be deactivated"
        
        print(f"Deactivated promo {supplier_id}: active={supplier['active']}")
    
    def test_admin_delete_promo(self, admin_token):
        """Admin can delete a promoted supplier"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a new promo to delete
        unique_id = str(uuid.uuid4())[:6]
        create_response = requests.post(f"{BASE_URL}/api/promoted-suppliers", json={
            "company_name": f"TEST_DeletePromo_{unique_id}",
            "bio": "Test promo for delete test",
            "phone": "+420987654321"
        })
        assert create_response.status_code == 200
        supplier_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/admin/promoted/{supplier_id}", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        
        # Verify deletion
        stats_response = requests.get(f"{BASE_URL}/api/admin/promoted-stats", headers=headers)
        suppliers = stats_response.json()["suppliers"]
        supplier = next((s for s in suppliers if s["id"] == supplier_id), None)
        assert supplier is None, "Deleted supplier should not exist in stats"
        
        print(f"Deleted promo {supplier_id} successfully")
    
    def test_admin_delete_nonexistent_promo(self, admin_token):
        """Admin gets 404 when deleting non-existent promo"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.delete(f"{BASE_URL}/api/admin/promoted/nonexistent123", headers=headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Correctly returned 404 for non-existent promo delete")


class TestAdminPromoAuthorizationDenied:
    """Test that non-admin users get 403 for all admin promo endpoints"""
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    def test_customer_cannot_extend_promo(self, customer_token):
        """Customer should get 403 when trying to extend promo"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.put(f"{BASE_URL}/api/admin/promoted/anyid/extend", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Customer correctly denied extend access (403)")
    
    def test_customer_cannot_deactivate_promo(self, customer_token):
        """Customer should get 403 when trying to deactivate promo"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.put(f"{BASE_URL}/api/admin/promoted/anyid/deactivate", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Customer correctly denied deactivate access (403)")
    
    def test_customer_cannot_delete_promo(self, customer_token):
        """Customer should get 403 when trying to delete promo"""
        headers = {"Authorization": f"Bearer {customer_token}"}
        response = requests.delete(f"{BASE_URL}/api/admin/promoted/anyid", headers=headers)
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("Customer correctly denied delete access (403)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
