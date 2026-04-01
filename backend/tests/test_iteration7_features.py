"""
Iteration 7 Feature Tests - CraftBolt.cz
Tests for:
1. Deadline field in demands (create/get)
2. Customer name in notification email template
3. User deactivation/reactivation flow
4. Admin reactivate endpoint
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


class TestDeadlineField:
    """Tests for the new deadline field in demands"""
    
    @pytest.fixture
    def customer_token(self):
        """Create a test customer and get token"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"test-customer-{unique_id}@example.com"
        
        # Register customer
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "customer",
            "first_name": "Test",
            "last_name": "Customer"
        })
        
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip(f"Failed to create test customer: {response.text}")
    
    def test_create_demand_with_deadline(self, customer_token):
        """POST /api/demands creates demand with deadline field stored correctly"""
        deadline_date = "2026-06-15"
        
        response = requests.post(f"{BASE_URL}/api/demands", json={
            "title": "TEST_Deadline Test Demand",
            "description": "Testing deadline field functionality",
            "category": "Instalatérství",
            "address": "Praha 1, Česká republika",
            "deadline": deadline_date
        }, headers={"Authorization": f"Bearer {customer_token}"})
        
        assert response.status_code == 200, f"Failed to create demand: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain demand id"
        assert data["deadline"] == deadline_date, f"Deadline should be {deadline_date}, got {data.get('deadline')}"
        assert data["title"] == "TEST_Deadline Test Demand"
        
        print(f"✓ Created demand with deadline: {data['deadline']}")
        return data["id"]
    
    def test_create_demand_without_deadline(self, customer_token):
        """POST /api/demands creates demand without deadline (optional field)"""
        response = requests.post(f"{BASE_URL}/api/demands", json={
            "title": "TEST_No Deadline Demand",
            "description": "Testing demand without deadline",
            "category": "Instalatérství",
            "address": "Brno, Česká republika"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        
        assert response.status_code == 200, f"Failed to create demand: {response.text}"
        
        data = response.json()
        assert data.get("deadline") is None, "Deadline should be None when not provided"
        
        print("✓ Created demand without deadline (null)")
    
    def test_get_demand_returns_deadline(self, customer_token):
        """GET /api/demands returns deadline field in response"""
        deadline_date = "2026-07-20"
        
        # Create demand with deadline
        create_response = requests.post(f"{BASE_URL}/api/demands", json={
            "title": "TEST_Get Deadline Test",
            "description": "Testing GET returns deadline",
            "category": "Elektromontáže - silnoproud",
            "address": "Ostrava, Česká republika",
            "deadline": deadline_date
        }, headers={"Authorization": f"Bearer {customer_token}"})
        
        assert create_response.status_code == 200
        demand_id = create_response.json()["id"]
        
        # GET the demand
        get_response = requests.get(f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {customer_token}"})
        
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["deadline"] == deadline_date, f"GET should return deadline {deadline_date}"
        
        print(f"✓ GET /api/demands/{demand_id} returns deadline: {data['deadline']}")
    
    def test_get_demands_list_includes_deadline(self, customer_token):
        """GET /api/demands/my returns deadline in list response"""
        deadline_date = "2026-08-01"
        
        # Create demand with deadline
        requests.post(f"{BASE_URL}/api/demands", json={
            "title": "TEST_List Deadline Test",
            "description": "Testing list includes deadline",
            "category": "Malířství, natěračství",
            "address": "Plzeň, Česká republika",
            "deadline": deadline_date
        }, headers={"Authorization": f"Bearer {customer_token}"})
        
        # GET my demands
        response = requests.get(f"{BASE_URL}/api/demands/my",
            headers={"Authorization": f"Bearer {customer_token}"})
        
        assert response.status_code == 200
        demands = response.json()
        
        # Find our test demand
        test_demand = next((d for d in demands if d["title"] == "TEST_List Deadline Test"), None)
        assert test_demand is not None, "Test demand should be in list"
        assert test_demand["deadline"] == deadline_date
        
        print(f"✓ GET /api/demands/my includes deadline field")


class TestNotificationEmailTemplate:
    """Tests for customer_name in notification email template"""
    
    def test_notification_template_accepts_customer_name(self):
        """Verify new_demand_email template accepts customer_name parameter"""
        # Import and test the template function directly
        import sys
        sys.path.insert(0, '/app/backend')
        
        from notifications import NotificationTemplates
        
        # Test with customer_name
        subject, html = NotificationTemplates.new_demand_email(
            demand_title="Test Demand",
            demand_category="Instalatérství",
            demand_address="Praha 1",
            customer_name="Jan Novák"
        )
        
        assert "Jan Novák" in html, "Customer name should appear in email HTML"
        assert "Zákazník:" in html, "Email should have 'Zákazník:' label"
        
        print("✓ new_demand_email template includes customer_name")
    
    def test_notification_template_without_customer_name(self):
        """Verify template works without customer_name (backward compatible)"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        from notifications import NotificationTemplates
        
        # Test without customer_name
        subject, html = NotificationTemplates.new_demand_email(
            demand_title="Test Demand",
            demand_category="Instalatérství",
            demand_address="Praha 1",
            customer_name=""
        )
        
        assert "Test Demand" in html
        # When customer_name is empty, the line should not appear
        assert "Zákazník:" not in html or "Zákazník: </p>" not in html
        
        print("✓ new_demand_email template works without customer_name")


class TestUserDeactivation:
    """Tests for user deactivation and reactivation flow"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip(f"Failed to login as admin: {response.text}")
    
    @pytest.fixture
    def test_user_credentials(self):
        """Create a test user for deactivation testing"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"test-deactivate-{unique_id}@example.com"
        password = "TestDeactivate123!"
        
        # Register user
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": password,
            "phone": "+420987654321",
            "role": "customer",
            "first_name": "Deactivate",
            "last_name": "Test"
        })
        
        if response.status_code == 200:
            data = response.json()
            return {
                "email": email,
                "password": password,
                "token": data["access_token"],
                "user_id": data["user"]["id"]
            }
        pytest.skip(f"Failed to create test user: {response.text}")
    
    def test_deactivate_account_requires_password(self, test_user_credentials):
        """POST /api/auth/deactivate requires correct password"""
        # Try with wrong password
        response = requests.post(f"{BASE_URL}/api/auth/deactivate",
            params={"password": "WrongPassword123!"},
            headers={"Authorization": f"Bearer {test_user_credentials['token']}"})
        
        assert response.status_code == 401, "Should reject wrong password"
        
        print("✓ Deactivation requires correct password")
    
    def test_deactivate_account_success(self, test_user_credentials):
        """POST /api/auth/deactivate deactivates account with correct password"""
        response = requests.post(f"{BASE_URL}/api/auth/deactivate",
            params={"password": test_user_credentials["password"]},
            headers={"Authorization": f"Bearer {test_user_credentials['token']}"})
        
        assert response.status_code == 200, f"Deactivation failed: {response.text}"
        assert "deaktivován" in response.json().get("message", "").lower() or "deactivated" in response.json().get("message", "").lower()
        
        print("✓ Account deactivated successfully")
        return test_user_credentials
    
    def test_login_blocked_for_deactivated_user(self, test_user_credentials):
        """Login blocked for deactivated user with correct Czech message"""
        # First deactivate the account
        requests.post(f"{BASE_URL}/api/auth/deactivate",
            params={"password": test_user_credentials["password"]},
            headers={"Authorization": f"Bearer {test_user_credentials['token']}"})
        
        # Try to login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"]
        })
        
        assert response.status_code == 403, f"Should return 403 for deactivated user, got {response.status_code}"
        
        detail = response.json().get("detail", "")
        assert "deaktivován" in detail.lower(), f"Error message should mention deactivation in Czech: {detail}"
        
        print(f"✓ Login blocked with message: {detail}")
    
    def test_admin_reactivate_user(self, admin_token, test_user_credentials):
        """Admin can reactivate deactivated user via PUT /api/admin/users/{id}/reactivate"""
        # First deactivate the account
        requests.post(f"{BASE_URL}/api/auth/deactivate",
            params={"password": test_user_credentials["password"]},
            headers={"Authorization": f"Bearer {test_user_credentials['token']}"})
        
        # Verify login is blocked
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"]
        })
        assert login_response.status_code == 403, "Login should be blocked before reactivation"
        
        # Admin reactivates
        reactivate_response = requests.put(
            f"{BASE_URL}/api/admin/users/{test_user_credentials['user_id']}/reactivate",
            headers={"Authorization": f"Bearer {admin_token}"})
        
        assert reactivate_response.status_code == 200, f"Reactivation failed: {reactivate_response.text}"
        
        # Verify login works again
        login_after = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"]
        })
        
        assert login_after.status_code == 200, f"Login should work after reactivation: {login_after.text}"
        
        print("✓ Admin reactivated user, login works again")
    
    def test_reactivate_requires_admin(self, test_user_credentials):
        """PUT /api/admin/users/{id}/reactivate requires admin role"""
        # Try to reactivate with non-admin token
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{test_user_credentials['user_id']}/reactivate",
            headers={"Authorization": f"Bearer {test_user_credentials['token']}"})
        
        assert response.status_code == 403, "Non-admin should not be able to reactivate"
        
        print("✓ Reactivation requires admin role")


class TestDemandResponseModel:
    """Tests for DemandResponse model including deadline"""
    
    @pytest.fixture
    def customer_token(self):
        """Create a test customer and get token"""
        unique_id = str(uuid.uuid4())[:8]
        email = f"test-model-{unique_id}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "phone": "+420123456789",
            "role": "customer"
        })
        
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip(f"Failed to create test customer: {response.text}")
    
    def test_demand_response_includes_all_fields(self, customer_token):
        """Verify DemandResponse includes deadline and other required fields"""
        response = requests.post(f"{BASE_URL}/api/demands", json={
            "title": "TEST_Model Test",
            "description": "Testing response model",
            "category": "Zednictví, obkladačství, dlaždičství",
            "address": "Liberec, Česká republika",
            "deadline": "2026-09-15",
            "budget_min": 5000,
            "budget_max": 15000,
            "payment_method": "transfer"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        # Check all expected fields
        expected_fields = [
            "id", "title", "description", "category", "address",
            "status", "customer_id", "customer_name", "created_at",
            "deadline", "budget_min", "budget_max", "payment_method"
        ]
        
        for field in expected_fields:
            assert field in data, f"Response should include '{field}'"
        
        assert data["deadline"] == "2026-09-15"
        assert data["budget_min"] == 5000
        assert data["budget_max"] == 15000
        assert data["payment_method"] == "transfer"
        
        print("✓ DemandResponse includes all expected fields including deadline")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
