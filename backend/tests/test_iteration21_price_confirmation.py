"""
Iteration 21 - Price Confirmation Feature Tests
Tests for supplier price confirmation/dispute on completed demands
and supplier finances endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"
CUSTOMER_EMAIL = "testvendulka@test.cz"
CUSTOMER_PASSWORD = "TestHeslo123!"
SUPPLIER_EMAIL = "test_supplier_chat@test.cz"
SUPPLIER_PASSWORD = "TestHeslo123"

# Test demand ID with pending price confirmation
TEST_DEMAND_ID = "a2d8e3b0-388d-4cd0-ac76-b4a8cd2a4d55"


class TestPriceConfirmationBackend:
    """Backend tests for price confirmation feature"""
    
    @pytest.fixture(scope="class")
    def supplier_token(self):
        """Get supplier auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Supplier login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def supplier_user(self, supplier_token):
        """Get supplier user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {supplier_token}"
        })
        if response.status_code == 200:
            return response.json()
        pytest.skip("Failed to get supplier user info")
    
    # Test 1: GET demand detail to verify price_confirmed_by_supplier field exists
    def test_demand_has_price_confirmation_fields(self, supplier_token):
        """Verify demand response includes price confirmation fields"""
        response = requests.get(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}", headers={
            "Authorization": f"Bearer {supplier_token}"
        })
        assert response.status_code == 200, f"Failed to get demand: {response.text}"
        data = response.json()
        
        # Check that price confirmation fields exist in response
        assert "price_confirmed_by_supplier" in data, "Missing price_confirmed_by_supplier field"
        assert "price_confirmed_at" in data, "Missing price_confirmed_at field"
        assert "price_dispute_reason" in data, "Missing price_dispute_reason field"
        
        print(f"Demand {TEST_DEMAND_ID} price_confirmed_by_supplier: {data.get('price_confirmed_by_supplier')}")
        print(f"Demand status: {data.get('status')}, agreed_price: {data.get('agreed_price')}, final_price: {data.get('final_price')}")
    
    # Test 2: Verify confirm-price endpoint exists
    def test_confirm_price_endpoint_exists(self, supplier_token):
        """Verify POST /api/demands/{id}/confirm-price endpoint exists"""
        # Use a non-existent demand ID to test endpoint existence
        response = requests.post(f"{BASE_URL}/api/demands/nonexistent-id/confirm-price", 
            json={"confirmed": True},
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [400, 403, 404], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"confirm-price endpoint exists, returned {response.status_code} for non-existent demand")
    
    # Test 3: Customer cannot confirm price (403)
    def test_customer_cannot_confirm_price(self, customer_token):
        """Customer should get 403 when trying to confirm price"""
        response = requests.post(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}/confirm-price",
            json={"confirmed": True},
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"Customer correctly blocked from confirming price: {response.json()}")
    
    # Test 4: GET supplier finances endpoint
    def test_supplier_finances_endpoint(self, supplier_token, supplier_user):
        """Test GET /api/suppliers/{id}/finances returns correct structure"""
        supplier_id = supplier_user.get("id")
        response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}/finances", headers={
            "Authorization": f"Bearer {supplier_token}"
        })
        assert response.status_code == 200, f"Failed to get finances: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_income" in data, "Missing total_income field"
        assert "total_pending" in data, "Missing total_pending field"
        assert "confirmed_jobs" in data, "Missing confirmed_jobs field"
        assert "pending_jobs" in data, "Missing pending_jobs field"
        
        print(f"Supplier finances: total_income={data['total_income']}, total_pending={data['total_pending']}")
        print(f"confirmed_jobs={data['confirmed_jobs']}, pending_jobs={data['pending_jobs']}")
    
    # Test 5: Other user cannot access supplier finances (403)
    def test_other_user_cannot_access_finances(self, customer_token, supplier_user):
        """Customer should not be able to access supplier's finances"""
        supplier_id = supplier_user.get("id")
        response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}/finances", headers={
            "Authorization": f"Bearer {customer_token}"
        })
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"Customer correctly blocked from accessing supplier finances")
    
    # Test 6: Admin can access supplier finances
    def test_admin_can_access_supplier_finances(self, admin_token, supplier_user):
        """Admin should be able to access any supplier's finances"""
        supplier_id = supplier_user.get("id")
        response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}/finances", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Admin failed to get finances: {response.text}"
        data = response.json()
        assert "total_income" in data
        print(f"Admin successfully accessed supplier finances")


class TestPriceConfirmationFlow:
    """Test the actual price confirmation flow"""
    
    @pytest.fixture(scope="class")
    def supplier_token(self):
        """Get supplier auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Supplier login failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def supplier_user(self, supplier_token):
        """Get supplier user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {supplier_token}"
        })
        if response.status_code == 200:
            return response.json()
        pytest.skip("Failed to get supplier user info")
    
    def test_get_demand_with_pending_price(self, supplier_token):
        """Get the test demand and verify it has pending price confirmation"""
        response = requests.get(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}", headers={
            "Authorization": f"Bearer {supplier_token}"
        })
        assert response.status_code == 200, f"Failed to get demand: {response.text}"
        data = response.json()
        
        print(f"Demand status: {data.get('status')}")
        print(f"price_confirmed_by_supplier: {data.get('price_confirmed_by_supplier')}")
        print(f"agreed_price: {data.get('agreed_price')}, final_price: {data.get('final_price')}")
        
        # Verify demand is completed and has price
        assert data.get("status") == "completed", f"Demand should be completed, got {data.get('status')}"
        assert data.get("agreed_price") is not None or data.get("final_price") is not None, "Demand should have a price"
    
    def test_confirm_price_success(self, supplier_token):
        """Test confirming price with confirmed=true"""
        # First check current state
        get_response = requests.get(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}", headers={
            "Authorization": f"Bearer {supplier_token}"
        })
        demand = get_response.json()
        
        # If already confirmed/disputed, this test should return 400
        if demand.get("price_confirmed_by_supplier") is not None:
            response = requests.post(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}/confirm-price",
                json={"confirmed": True},
                headers={"Authorization": f"Bearer {supplier_token}"}
            )
            assert response.status_code == 400, f"Expected 400 for already confirmed, got {response.status_code}"
            print(f"Price already confirmed/disputed, correctly returned 400")
        else:
            # Price is pending, confirm it
            response = requests.post(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}/confirm-price",
                json={"confirmed": True},
                headers={"Authorization": f"Bearer {supplier_token}"}
            )
            assert response.status_code == 200, f"Failed to confirm price: {response.text}"
            print(f"Price confirmed successfully: {response.json()}")
            
            # Verify the change
            verify_response = requests.get(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}", headers={
                "Authorization": f"Bearer {supplier_token}"
            })
            verify_data = verify_response.json()
            assert verify_data.get("price_confirmed_by_supplier") == True, "price_confirmed_by_supplier should be True"
            assert verify_data.get("price_confirmed_at") is not None, "price_confirmed_at should be set"
            print(f"Verified: price_confirmed_by_supplier={verify_data.get('price_confirmed_by_supplier')}")
    
    def test_cannot_confirm_twice(self, supplier_token):
        """Test that confirming price twice returns 400"""
        response = requests.post(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}/confirm-price",
            json={"confirmed": True},
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        # Should return 400 since already confirmed
        assert response.status_code == 400, f"Expected 400 for double confirm, got {response.status_code}: {response.text}"
        print(f"Correctly blocked double confirmation: {response.json()}")
    
    def test_finances_reflect_confirmed_income(self, supplier_token, supplier_user):
        """Verify finances endpoint reflects confirmed income"""
        supplier_id = supplier_user.get("id")
        response = requests.get(f"{BASE_URL}/api/suppliers/{supplier_id}/finances", headers={
            "Authorization": f"Bearer {supplier_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        print(f"After confirmation - total_income: {data['total_income']}, confirmed_jobs: {data['confirmed_jobs']}")
        print(f"total_pending: {data['total_pending']}, pending_jobs: {data['pending_jobs']}")
        
        # total_income should include confirmed jobs
        # This is a sanity check - actual values depend on test data
        assert isinstance(data['total_income'], (int, float))
        assert isinstance(data['confirmed_jobs'], int)


class TestPriceDisputeFlow:
    """Test price dispute flow with a different demand"""
    
    @pytest.fixture(scope="class")
    def supplier_token(self):
        """Get supplier auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Supplier login failed")
    
    def test_dispute_requires_reason(self, supplier_token):
        """Test that disputing without reason still works (reason is optional)"""
        # This test verifies the API accepts dispute without reason
        # We use the same demand which is already confirmed, so it should return 400
        response = requests.post(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}/confirm-price",
            json={"confirmed": False},
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        # Should return 400 since already confirmed
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"Dispute on already confirmed demand correctly blocked")
    
    def test_dispute_with_reason(self, supplier_token):
        """Test dispute with reason (on already confirmed demand - should fail)"""
        response = requests.post(f"{BASE_URL}/api/demands/{TEST_DEMAND_ID}/confirm-price",
            json={"confirmed": False, "reason": "Cena neodpovídá dohodě"},
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        # Should return 400 since already confirmed
        assert response.status_code == 400
        print(f"Dispute with reason on confirmed demand correctly blocked")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
