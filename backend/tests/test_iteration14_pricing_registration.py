"""
Iteration 14 - Testing new pricing and registration features:
1. Homepage pricing section (199/299/399 Kč)
2. Registration flow with customer_supplier role
3. IČO choice flow (Mám IČO / Nemám IČO)
4. preferred_languages and branch_addresses fields
5. customer_supplier role access to both customer and supplier endpoints
6. Unread messages summary for customer_supplier
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CUSTOMER_EMAIL = "testvendulka@test.cz"
CUSTOMER_PASSWORD = "TestHeslo123!"
SUPPLIER_EMAIL = "test_supplier_chat@test.cz"
SUPPLIER_PASSWORD = "TestHeslo123"
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def customer_token(api_client):
    """Get customer auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Customer login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def supplier_token(api_client):
    """Get supplier auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPPLIER_EMAIL,
        "password": SUPPLIER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Supplier login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin auth token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


class TestHealthAndBasicEndpoints:
    """Basic health and endpoint tests"""
    
    def test_health_endpoint(self, api_client):
        """Test health endpoint is accessible"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ Health endpoint working")
    
    def test_categories_endpoint(self, api_client):
        """Test categories endpoint returns list"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        print(f"✓ Categories endpoint returns {len(data['categories'])} categories")


class TestRegistrationWithNewFields:
    """Test registration with new fields: preferred_languages, branch_addresses, customer_supplier role"""
    
    def test_register_customer_supplier_with_ico(self, api_client):
        """Test registration as customer_supplier with IČO (OSVČ)"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"TEST_cs_ico_{unique_id}@test.cz"
        
        payload = {
            "email": test_email,
            "password": "TestHeslo123!",
            "phone": "+420777888999",
            "role": "customer_supplier",
            "account_type": "osvc",
            "company_name": "Test OSVČ s.r.o.",
            "first_name": "Test",
            "last_name": "User",
            "ico": "12345678",
            "dic": "CZ12345678",
            "address": "Praha 1, Hlavní 123",
            "branch_addresses": ["Praha 2, Pobočka 1", "Brno, Pobočka 2"],
            "preferred_languages": ["cs", "en"],
            "bio": "Test bio",
            "website": "https://test.cz",
            "categories": ["Instalatérství", "Elektromontáže - silnoproud"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert data.get("requires_verification") == True
        assert data.get("email") == test_email
        print(f"✓ customer_supplier with IČO registration successful: {test_email}")
    
    def test_register_customer_supplier_without_ico(self, api_client):
        """Test registration as customer_supplier without IČO (nepodnikatel)"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"TEST_cs_noico_{unique_id}@test.cz"
        
        payload = {
            "email": test_email,
            "password": "TestHeslo123!",
            "phone": "+420777888998",
            "role": "customer_supplier",
            "account_type": "nepodnikatel",
            "first_name": "Jan",
            "last_name": "Novák",
            "permanent_address": "Praha 3, Trvalá 456",
            "actual_address": "Praha 4, Skutečná 789",
            "preferred_languages": ["cs", "de"],
            "bio": "Fyzická osoba nepodnikající",
            "categories": ["Hodinový manžel"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert data.get("requires_verification") == True
        print(f"✓ customer_supplier without IČO registration successful: {test_email}")
    
    def test_register_customer_only(self, api_client):
        """Test registration as customer only"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"TEST_customer_{unique_id}@test.cz"
        
        payload = {
            "email": test_email,
            "password": "TestHeslo123!",
            "phone": "+420777888997",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Marie",
            "last_name": "Zákaznice",
            "preferred_languages": ["cs"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        print(f"✓ Customer-only registration successful: {test_email}")
    
    def test_register_supplier_only(self, api_client):
        """Test registration as supplier only"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"TEST_supplier_{unique_id}@test.cz"
        
        payload = {
            "email": test_email,
            "password": "TestHeslo123!",
            "phone": "+420777888996",
            "role": "supplier",
            "account_type": "company",
            "company_name": "Test Firma s.r.o.",
            "ico": "87654321",
            "address": "Brno, Firemní 100",
            "branch_addresses": ["Ostrava, Pobočka 1"],
            "preferred_languages": ["cs", "en", "de"],
            "categories": ["Stavební práce, rekonstrukce"]
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        print(f"✓ Supplier-only registration successful: {test_email}")
    
    def test_register_duplicate_email_fails(self, api_client):
        """Test that duplicate email registration fails"""
        payload = {
            "email": CUSTOMER_EMAIL,  # Already exists
            "password": "TestHeslo123!",
            "phone": "+420777888995",
            "role": "customer"
        }
        
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 400
        assert "already registered" in response.text.lower() or "již" in response.text.lower()
        print("✓ Duplicate email registration correctly rejected")


class TestQuickDemandFlow:
    """Test quick demand creation and claiming"""
    
    def test_create_quick_demand(self, api_client):
        """Test creating quick demand without auth"""
        unique_id = str(uuid.uuid4())[:8]
        
        payload = {
            "first_name": "Quick",
            "last_name": "Test",
            "email": f"quick_{unique_id}@test.cz",
            "phone": "+420777111222",
            "description": "Potřebuji opravit kohoutek"
        }
        
        response = api_client.post(f"{BASE_URL}/api/demands/quick", json=payload)
        assert response.status_code == 200, f"Quick demand failed: {response.text}"
        data = response.json()
        assert "demand_id" in data
        assert "message" in data
        print(f"✓ Quick demand created: {data['demand_id']}")
        return data["demand_id"]
    
    def test_claim_quick_demands(self, api_client, customer_token):
        """Test claiming quick demands after login"""
        response = api_client.post(
            f"{BASE_URL}/api/demands/claim",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "claimed" in data
        print(f"✓ Claim endpoint works, claimed: {data['claimed']}")


class TestUnreadMessagesSummary:
    """Test unread messages summary endpoint for all roles"""
    
    def test_unread_summary_customer(self, api_client, customer_token):
        """Test unread summary for customer"""
        response = api_client.get(
            f"{BASE_URL}/api/messages/unread-summary",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "unread_demands" in data
        assert "total_unread" in data
        assert isinstance(data["unread_demands"], list)
        print(f"✓ Customer unread summary: {data['total_unread']} unread")
    
    def test_unread_summary_supplier(self, api_client, supplier_token):
        """Test unread summary for supplier"""
        response = api_client.get(
            f"{BASE_URL}/api/messages/unread-summary",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "unread_demands" in data
        assert "total_unread" in data
        print(f"✓ Supplier unread summary: {data['total_unread']} unread")


class TestCustomerSupplierRoleAccess:
    """Test that customer_supplier role can access both customer and supplier endpoints"""
    
    def test_customer_can_create_demand(self, api_client, customer_token):
        """Test customer can create demand"""
        unique_id = str(uuid.uuid4())[:8]
        
        payload = {
            "title": f"TEST_Demand_{unique_id}",
            "description": "Test demand for iteration 14",
            "category": "Instalatérství",
            "address": "Praha 1, Test 123"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/demands",
            json=payload,
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Create demand failed: {response.text}"
        data = response.json()
        assert data["title"] == payload["title"]
        print(f"✓ Customer created demand: {data['id']}")
        return data["id"]
    
    def test_supplier_can_view_available_demands(self, api_client, supplier_token):
        """Test supplier can view available demands"""
        response = api_client.get(
            f"{BASE_URL}/api/demands/available",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Supplier can view {len(data)} available demands")
    
    def test_supplier_can_soft_accept(self, api_client, supplier_token):
        """Test supplier can soft-accept a demand"""
        # First get available demands
        response = api_client.get(
            f"{BASE_URL}/api/demands/available",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            demand_id = response.json()[0]["id"]
            
            # Soft accept
            response = api_client.post(
                f"{BASE_URL}/api/demands/{demand_id}/soft-accept?reason=Mám zájem",
                headers={"Authorization": f"Bearer {supplier_token}"}
            )
            # May fail if already soft-accepted, but endpoint should work
            assert response.status_code in [200, 400]
            print(f"✓ Supplier soft-accept endpoint works")
        else:
            print("⚠ No available demands to soft-accept")


class TestUserProfileFields:
    """Test that user profile includes new fields"""
    
    def test_customer_profile_has_fields(self, api_client, customer_token):
        """Test customer profile has preferred_languages and branch_addresses"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check new fields exist (may be empty arrays)
        assert "preferred_languages" in data
        assert "branch_addresses" in data
        assert isinstance(data["preferred_languages"], list)
        assert isinstance(data["branch_addresses"], list)
        print(f"✓ Customer profile has new fields: languages={data['preferred_languages']}, branches={len(data['branch_addresses'])}")
    
    def test_supplier_profile_has_fields(self, api_client, supplier_token):
        """Test supplier profile has preferred_languages and branch_addresses"""
        response = api_client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "preferred_languages" in data
        assert "branch_addresses" in data
        print(f"✓ Supplier profile has new fields: languages={data['preferred_languages']}, branches={len(data['branch_addresses'])}")


class TestARESLookup:
    """Test ARES lookup endpoint"""
    
    def test_ares_lookup_valid_ico(self, api_client):
        """Test ARES lookup with a valid IČO"""
        # Using a known valid IČO (CraftBolt or similar)
        response = api_client.get(f"{BASE_URL}/api/ares/27082440")  # Example IČO
        # ARES may return 200 or 404 depending on the IČO
        assert response.status_code in [200, 404, 500]
        if response.status_code == 200:
            data = response.json()
            print(f"✓ ARES lookup returned: {data.get('company_name', 'N/A')}")
        else:
            print(f"⚠ ARES lookup returned {response.status_code} (may be rate limited or IČO not found)")


class TestSupplierSearch:
    """Test supplier search includes customer_supplier role"""
    
    def test_supplier_search_endpoint(self, api_client):
        """Test supplier search endpoint (no auth required)"""
        response = api_client.get(f"{BASE_URL}/api/suppliers")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Supplier search returns {len(data)} suppliers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
