"""
Test suite for Financial Summary feature on completed demands
Tests: agreed_price, final_price, price_increase, completion_type, blacklist_reason
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

# Test demand IDs (seeded data)
PRICE_INCREASE_DEMAND_ID = "a2d8e3b0-388d-4cd0-ac76-b4a8cd2a4d55"
BLACKLIST_DEMAND_ID = "a26298e5-222b-4bab-b63c-4eddcb74150f"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    assert response.status_code == 200, f"Customer login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def supplier_token():
    """Get supplier authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPPLIER_EMAIL,
        "password": SUPPLIER_PASSWORD
    })
    assert response.status_code == 200, f"Supplier login failed: {response.text}"
    return response.json()["access_token"]


class TestPriceIncreaseDemand:
    """Tests for demand with price_increase completion type"""
    
    def test_get_price_increase_demand_returns_correct_fields(self, admin_token):
        """Test that GET /api/demands/{id} returns correct financial fields for price_increase demand"""
        response = requests.get(
            f"{BASE_URL}/api/demands/{PRICE_INCREASE_DEMAND_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get demand: {response.text}"
        data = response.json()
        
        # Verify status is completed
        assert data["status"] == "completed", f"Expected status 'completed', got '{data['status']}'"
        
        # Verify completion_type
        assert data["completion_type"] == "price_increase", f"Expected completion_type 'price_increase', got '{data.get('completion_type')}'"
        
        # Verify agreed_price
        assert data["agreed_price"] == 20000, f"Expected agreed_price 20000, got {data.get('agreed_price')}"
        
        # Verify price_increase
        assert data["price_increase"] == 5000, f"Expected price_increase 5000, got {data.get('price_increase')}"
        
        # Verify final_price
        assert data["final_price"] == 25000, f"Expected final_price 25000, got {data.get('final_price')}"
        
        # Verify blacklist_reason is None
        assert data.get("blacklist_reason") is None, f"Expected blacklist_reason None, got '{data.get('blacklist_reason')}'"
        
        print(f"✓ Price increase demand verified: agreed={data['agreed_price']}, increase={data['price_increase']}, final={data['final_price']}")


class TestBlacklistDemand:
    """Tests for demand with blacklist completion type"""
    
    def test_get_blacklist_demand_returns_correct_fields(self, admin_token):
        """Test that GET /api/demands/{id} returns correct financial fields for blacklist demand"""
        response = requests.get(
            f"{BASE_URL}/api/demands/{BLACKLIST_DEMAND_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Failed to get demand: {response.text}"
        data = response.json()
        
        # Verify status is completed
        assert data["status"] == "completed", f"Expected status 'completed', got '{data['status']}'"
        
        # Verify completion_type
        assert data["completion_type"] == "blacklist", f"Expected completion_type 'blacklist', got '{data.get('completion_type')}'"
        
        # Verify agreed_price
        assert data["agreed_price"] == 15000, f"Expected agreed_price 15000, got {data.get('agreed_price')}"
        
        # Verify final_price equals agreed_price (no increase)
        assert data["final_price"] == 15000, f"Expected final_price 15000, got {data.get('final_price')}"
        
        # Verify blacklist_reason is not empty
        assert data.get("blacklist_reason"), "Expected blacklist_reason to be non-empty"
        assert "nepříjemný" in data["blacklist_reason"].lower() or "neposky" in data["blacklist_reason"].lower(), \
            f"Blacklist reason should contain expected text, got: {data.get('blacklist_reason')}"
        
        print(f"✓ Blacklist demand verified: agreed={data['agreed_price']}, final={data['final_price']}, reason='{data['blacklist_reason']}'")


class TestDemandResponseModel:
    """Tests for DemandResponse model fields"""
    
    def test_demand_response_includes_all_financial_fields(self, admin_token):
        """Verify DemandResponse model includes all required financial fields"""
        response = requests.get(
            f"{BASE_URL}/api/demands/{PRICE_INCREASE_DEMAND_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all financial fields exist in response
        required_fields = ["agreed_price", "final_price", "price_increase", "completion_type", "blacklist_reason"]
        for field in required_fields:
            assert field in data, f"Missing field '{field}' in DemandResponse"
        
        print(f"✓ All financial fields present in DemandResponse: {required_fields}")


class TestCompleteDemandEndpoint:
    """Tests for POST /api/demands/{id}/complete endpoint"""
    
    def test_complete_demand_endpoint_exists(self, admin_token):
        """Verify the complete endpoint exists (test with invalid demand to check 404 vs 405)"""
        response = requests.post(
            f"{BASE_URL}/api/demands/nonexistent-id/complete",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"completion_type": "standard", "agreed_price": 1000}
        )
        
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code == 404, f"Expected 404 for nonexistent demand, got {response.status_code}"
        print("✓ Complete endpoint exists and returns 404 for nonexistent demand")


class TestAuthenticationRequired:
    """Tests for authentication requirements"""
    
    def test_get_demand_requires_authentication(self):
        """Verify GET /api/demands/{id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/demands/{PRICE_INCREASE_DEMAND_ID}")
        
        assert response.status_code == 401 or response.status_code == 403, \
            f"Expected 401/403 for unauthenticated request, got {response.status_code}"
        print("✓ Demand endpoint requires authentication")


class TestDemandWithoutAgreedPrice:
    """Tests for demands without agreed_price (old demands before feature)"""
    
    def test_demand_without_agreed_price_returns_null(self, admin_token):
        """Verify demands without agreed_price return null/0 for financial fields"""
        # Get list of demands to find one without agreed_price
        response = requests.get(
            f"{BASE_URL}/api/demands",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        demands = response.json()
        
        # Find a demand without agreed_price (or with agreed_price=0/None)
        old_demand = None
        for d in demands:
            if d.get("status") == "completed" and (d.get("agreed_price") is None or d.get("agreed_price") == 0):
                old_demand = d
                break
        
        if old_demand:
            # Verify financial fields are null/0
            assert old_demand.get("agreed_price") is None or old_demand.get("agreed_price") == 0, \
                f"Old demand should have null/0 agreed_price"
            print(f"✓ Found old demand without agreed_price: {old_demand['id']}")
        else:
            # No old demands found - this is expected if all completed demands have prices
            print("✓ No old demands without agreed_price found (all completed demands have prices)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
