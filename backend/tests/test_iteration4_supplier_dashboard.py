"""
Iteration 4 Tests: Supplier Dashboard Features
- POST /api/auth/login with admin credentials
- GET /api/demands/available - available demands for suppliers
- GET /api/demands/my - supplier's assigned demands
- POST /api/demands/{id}/progress-photo - add progress photo
- POST /api/demands/{id}/invoice - set invoiced amount
- GET /api/suppliers/{id}/finances - financial summary
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
        """POST /api/auth/login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"PASS: Admin login successful, role={data['user']['role']}")


class TestSupplierDemandEndpoints:
    """Test supplier-specific demand endpoints"""
    
    @pytest.fixture(scope="class")
    def test_supplier(self):
        """Create a test supplier account"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"test-supplier-{unique_id}@example.com"
        password = "TestPass123!"
        
        # Register supplier
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "phone": "+420123456789",
            "role": "supplier",
            "supplier_type": "osvc",
            "company_name": f"Test Supplier {unique_id}",
            "categories": ["Instalatérství", "Elektromontáže - silnoproud"]
        })
        
        if response.status_code != 200:
            pytest.skip(f"Could not create test supplier: {response.text}")
        
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login test supplier: {login_response.text}")
        
        data = login_response.json()
        return {
            "id": data["user"]["id"],
            "email": email,
            "token": data["access_token"]
        }
    
    @pytest.fixture(scope="class")
    def test_customer(self):
        """Create a test customer account"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"test-customer-{unique_id}@example.com"
        password = "TestPass123!"
        
        # Register customer
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "phone": "+420987654321",
            "role": "customer"
        })
        
        if response.status_code != 200:
            pytest.skip(f"Could not create test customer: {response.text}")
        
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Could not login test customer: {login_response.text}")
        
        data = login_response.json()
        return {
            "id": data["user"]["id"],
            "email": email,
            "token": data["access_token"]
        }
    
    def test_get_available_demands_as_supplier(self, test_supplier):
        """GET /api/demands/available - returns available demands for suppliers"""
        response = requests.get(
            f"{BASE_URL}/api/demands/available",
            headers={"Authorization": f"Bearer {test_supplier['token']}"}
        )
        assert response.status_code == 200, f"Failed to get available demands: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All returned demands should be open
        for demand in data:
            assert demand["status"] == "open", f"Expected open status, got {demand['status']}"
        print(f"PASS: GET /api/demands/available returned {len(data)} available demands")
    
    def test_get_available_demands_forbidden_for_non_supplier(self, test_customer):
        """GET /api/demands/available - should be forbidden for customers"""
        response = requests.get(
            f"{BASE_URL}/api/demands/available",
            headers={"Authorization": f"Bearer {test_customer['token']}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: GET /api/demands/available correctly returns 403 for customers")
    
    def test_get_my_demands_as_supplier(self, test_supplier):
        """GET /api/demands/my - returns supplier's assigned demands"""
        response = requests.get(
            f"{BASE_URL}/api/demands/my",
            headers={"Authorization": f"Bearer {test_supplier['token']}"}
        )
        assert response.status_code == 200, f"Failed to get my demands: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # All returned demands should be assigned to this supplier
        for demand in data:
            assert demand["assigned_supplier_id"] == test_supplier["id"], \
                f"Demand not assigned to test supplier"
        print(f"PASS: GET /api/demands/my returned {len(data)} demands for supplier")


class TestProgressPhotoAndInvoice:
    """Test progress photo upload and invoice endpoints"""
    
    @pytest.fixture(scope="class")
    def supplier_with_demand(self):
        """Create supplier, customer, demand, and accept it"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create supplier
        supplier_email = f"test-supplier-photo-{unique_id}@example.com"
        supplier_password = "TestPass123!"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": supplier_email,
            "password": supplier_password,
            "phone": "+420111222333",
            "role": "supplier",
            "supplier_type": "osvc",
            "company_name": f"Photo Test Supplier {unique_id}",
            "categories": ["Instalatérství"]
        })
        
        if reg_response.status_code != 200:
            pytest.skip(f"Could not create supplier: {reg_response.text}")
        
        supplier_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": supplier_email,
            "password": supplier_password
        })
        supplier_data = supplier_login.json()
        supplier_token = supplier_data["access_token"]
        supplier_id = supplier_data["user"]["id"]
        
        # Create customer
        customer_email = f"test-customer-photo-{unique_id}@example.com"
        customer_password = "TestPass123!"
        
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": customer_email,
            "password": customer_password,
            "phone": "+420444555666",
            "role": "customer"
        })
        
        customer_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": customer_email,
            "password": customer_password
        })
        customer_data = customer_login.json()
        customer_token = customer_data["access_token"]
        
        # Create demand as customer
        demand_response = requests.post(
            f"{BASE_URL}/api/demands",
            json={
                "title": f"Test Demand for Photo {unique_id}",
                "description": "Testing progress photo upload",
                "category": "Instalatérství",
                "address": "Praha 1, Staré Město",
                "budget_min": 1000,
                "budget_max": 5000
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        if demand_response.status_code != 200:
            pytest.skip(f"Could not create demand: {demand_response.text}")
        
        demand_id = demand_response.json()["id"]
        
        # Accept demand as supplier
        accept_response = requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        if accept_response.status_code != 200:
            pytest.skip(f"Could not accept demand: {accept_response.text}")
        
        return {
            "supplier_id": supplier_id,
            "supplier_token": supplier_token,
            "customer_token": customer_token,
            "demand_id": demand_id
        }
    
    def test_add_progress_photo(self, supplier_with_demand):
        """POST /api/demands/{id}/progress-photo - add progress photo"""
        demand_id = supplier_with_demand["demand_id"]
        token = supplier_with_demand["supplier_token"]
        
        response = requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/progress-photo?photo_url=/api/uploads/test-photo.jpg",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed to add progress photo: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"PASS: POST /api/demands/{demand_id}/progress-photo - {data['message']}")
        
        # Verify photo was added
        demand_response = requests.get(
            f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        demand_data = demand_response.json()
        assert "/api/uploads/test-photo.jpg" in demand_data.get("progress_photos", []), \
            "Progress photo not found in demand"
        print("PASS: Progress photo verified in demand data")
    
    def test_set_invoice_amount(self, supplier_with_demand):
        """POST /api/demands/{id}/invoice - set invoiced amount"""
        demand_id = supplier_with_demand["demand_id"]
        token = supplier_with_demand["supplier_token"]
        
        response = requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/invoice?amount=5000",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed to set invoice: {response.text}"
        data = response.json()
        assert "message" in data
        assert "5000" in data["message"]
        print(f"PASS: POST /api/demands/{demand_id}/invoice - {data['message']}")
        
        # Verify invoice amount was set
        demand_response = requests.get(
            f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        demand_data = demand_response.json()
        assert demand_data.get("invoiced_amount") == 5000, \
            f"Expected invoiced_amount=5000, got {demand_data.get('invoiced_amount')}"
        print("PASS: Invoice amount verified in demand data")
    
    def test_invoice_forbidden_for_non_supplier(self, supplier_with_demand):
        """POST /api/demands/{id}/invoice - should be forbidden for customers"""
        demand_id = supplier_with_demand["demand_id"]
        customer_token = supplier_with_demand["customer_token"]
        
        response = requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/invoice?amount=3000",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Invoice endpoint correctly returns 403 for customers")


class TestSupplierFinances:
    """Test supplier finances endpoint"""
    
    @pytest.fixture(scope="class")
    def supplier_with_completed_demand(self):
        """Create supplier with a completed demand that has invoiced amount"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create supplier
        supplier_email = f"test-supplier-fin-{unique_id}@example.com"
        supplier_password = "TestPass123!"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": supplier_email,
            "password": supplier_password,
            "phone": "+420777888999",
            "role": "supplier",
            "supplier_type": "osvc",
            "company_name": f"Finance Test Supplier {unique_id}",
            "categories": ["Instalatérství"]
        })
        
        if reg_response.status_code != 200:
            pytest.skip(f"Could not create supplier: {reg_response.text}")
        
        supplier_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": supplier_email,
            "password": supplier_password
        })
        supplier_data = supplier_login.json()
        supplier_token = supplier_data["access_token"]
        supplier_id = supplier_data["user"]["id"]
        
        # Create customer
        customer_email = f"test-customer-fin-{unique_id}@example.com"
        customer_password = "TestPass123!"
        
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": customer_email,
            "password": customer_password,
            "phone": "+420666555444",
            "role": "customer"
        })
        
        customer_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": customer_email,
            "password": customer_password
        })
        customer_data = customer_login.json()
        customer_token = customer_data["access_token"]
        
        # Create demand
        demand_response = requests.post(
            f"{BASE_URL}/api/demands",
            json={
                "title": f"Test Demand for Finance {unique_id}",
                "description": "Testing finance summary",
                "category": "Instalatérství",
                "address": "Brno, Centrum",
                "budget_min": 2000,
                "budget_max": 8000
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        if demand_response.status_code != 200:
            pytest.skip(f"Could not create demand: {demand_response.text}")
        
        demand_id = demand_response.json()["id"]
        
        # Accept demand
        requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        # Set invoice amount
        requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/invoice?amount=7500",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        # Complete demand
        requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/complete",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        return {
            "supplier_id": supplier_id,
            "supplier_token": supplier_token,
            "demand_id": demand_id,
            "invoiced_amount": 7500
        }
    
    def test_get_supplier_finances(self, supplier_with_completed_demand):
        """GET /api/suppliers/{id}/finances - returns financial summary"""
        supplier_id = supplier_with_completed_demand["supplier_id"]
        token = supplier_with_completed_demand["supplier_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/suppliers/{supplier_id}/finances",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Failed to get finances: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_income" in data, "Missing total_income in response"
        assert "completed_jobs" in data, "Missing completed_jobs in response"
        assert "transactions" in data, "Missing transactions in response"
        
        # Verify values
        assert data["total_income"] >= supplier_with_completed_demand["invoiced_amount"], \
            f"Expected total_income >= {supplier_with_completed_demand['invoiced_amount']}, got {data['total_income']}"
        assert data["completed_jobs"] >= 1, f"Expected at least 1 completed job, got {data['completed_jobs']}"
        
        print(f"PASS: GET /api/suppliers/{supplier_id}/finances")
        print(f"  - Total income: {data['total_income']} Kč")
        print(f"  - Completed jobs: {data['completed_jobs']}")
    
    def test_finances_forbidden_for_other_users(self, supplier_with_completed_demand):
        """GET /api/suppliers/{id}/finances - should be forbidden for other users"""
        supplier_id = supplier_with_completed_demand["supplier_id"]
        
        # Create another user
        unique_id = str(uuid.uuid4())[:8]
        other_email = f"other-user-{unique_id}@example.com"
        other_password = "TestPass123!"
        
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": other_email,
            "password": other_password,
            "phone": "+420333222111",
            "role": "customer"
        })
        
        other_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": other_email,
            "password": other_password
        })
        other_token = other_login.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/suppliers/{supplier_id}/finances",
            headers={"Authorization": f"Bearer {other_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Finances endpoint correctly returns 403 for other users")
    
    def test_admin_can_view_any_finances(self, supplier_with_completed_demand):
        """GET /api/suppliers/{id}/finances - admin can view any supplier's finances"""
        supplier_id = supplier_with_completed_demand["supplier_id"]
        
        # Login as admin
        admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_login.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/suppliers/{supplier_id}/finances",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Admin should be able to view finances: {response.text}"
        print("PASS: Admin can view any supplier's finances")


class TestCancellationReason:
    """Test cancellation reason endpoint"""
    
    def test_set_cancellation_reason(self):
        """POST /api/demands/{id}/cancel-reason - set cancellation reason"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create customer and demand
        customer_email = f"test-cancel-{unique_id}@example.com"
        customer_password = "TestPass123!"
        
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": customer_email,
            "password": customer_password,
            "phone": "+420999888777",
            "role": "customer"
        })
        
        customer_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": customer_email,
            "password": customer_password
        })
        customer_token = customer_login.json()["access_token"]
        
        # Create demand
        demand_response = requests.post(
            f"{BASE_URL}/api/demands",
            json={
                "title": f"Test Demand for Cancel {unique_id}",
                "description": "Testing cancellation reason",
                "category": "Instalatérství",
                "address": "Ostrava, Centrum"
            },
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        
        if demand_response.status_code != 200:
            pytest.skip(f"Could not create demand: {demand_response.text}")
        
        demand_id = demand_response.json()["id"]
        
        # Set cancellation reason
        reason = "Zákazník změnil názor"
        response = requests.post(
            f"{BASE_URL}/api/demands/{demand_id}/cancel-reason?reason={reason}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Failed to set cancellation reason: {response.text}"
        
        # Verify reason was set and status changed to cancelled
        demand_check = requests.get(
            f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        demand_data = demand_check.json()
        assert demand_data.get("cancellation_reason") == reason, \
            f"Expected reason '{reason}', got '{demand_data.get('cancellation_reason')}'"
        assert demand_data.get("status") == "cancelled", \
            f"Expected status 'cancelled', got '{demand_data.get('status')}'"
        
        print(f"PASS: POST /api/demands/{demand_id}/cancel-reason - reason set and status changed to cancelled")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
