"""
Admin Panel Backend Tests - Iteration 19
Tests for admin functionality: block/unblock users, edit profiles, send messages,
cancel demands, notify demand owners, manage category suggestions.
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
SUPPLIER_EMAIL = "test_supplier_chat@test.cz"
SUPPLIER_PASSWORD = "TestHeslo123"


class TestAdminAuthentication:
    """Test admin login and access control"""
    
    def test_admin_login_success(self):
        """Admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"PASSED: Admin login successful, role={data['user']['role']}")
    
    def test_non_admin_cannot_access_admin_endpoints(self):
        """Non-admin users cannot access admin endpoints"""
        # Login as customer
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert login_resp.status_code == 200
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to access admin stats
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASSED: Non-admin cannot access admin endpoints (403)")


class TestAdminStats:
    """Test admin stats endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_admin_stats(self, admin_token):
        """GET /api/admin/stats returns all statistics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        expected_fields = ["total_users", "customers", "suppliers", "total_demands", 
                          "open_demands", "completed_demands", "pending_suggestions", "blocked_users"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], int), f"Field {field} should be int"
        
        print(f"PASSED: Admin stats returned - users={data['total_users']}, demands={data['total_demands']}, pending_suggestions={data['pending_suggestions']}")


class TestAdminUserManagement:
    """Test user management: block, unblock, edit, message"""
    
    @pytest.fixture
    def admin_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    @pytest.fixture
    def test_user_id(self, admin_headers):
        """Get a non-admin user ID for testing"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        users = response.json()
        # Find a non-admin user (preferably customer)
        for user in users:
            if user["role"] != "admin" and user["email"] == CUSTOMER_EMAIL:
                return user["id"]
        # Fallback to any non-admin
        for user in users:
            if user["role"] != "admin":
                return user["id"]
        pytest.skip("No non-admin users found")
    
    def test_get_all_users(self, admin_headers):
        """GET /api/admin/users returns list of users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) > 0
        
        # Verify user structure
        user = users[0]
        assert "id" in user
        assert "email" in user
        assert "role" in user
        print(f"PASSED: GET /api/admin/users returned {len(users)} users")
    
    def test_block_user(self, admin_headers, test_user_id):
        """PUT /api/admin/users/{id}/block blocks user"""
        response = requests.put(f"{BASE_URL}/api/admin/users/{test_user_id}/block", 
                               headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASSED: Block user returned 200 - {data['message']}")
    
    def test_blocked_user_cannot_login(self, admin_headers, test_user_id):
        """Blocked user receives 403 on login attempt"""
        # First ensure user is blocked
        requests.put(f"{BASE_URL}/api/admin/users/{test_user_id}/block", headers=admin_headers)
        
        # Try to login as blocked user
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 403, f"Expected 403 for blocked user, got {response.status_code}"
        assert "zablokován" in response.json().get("detail", "").lower() or "blocked" in response.json().get("detail", "").lower()
        print(f"PASSED: Blocked user login returns 403 - {response.json().get('detail')}")
    
    def test_unblock_user(self, admin_headers, test_user_id):
        """PUT /api/admin/users/{id}/unblock unblocks user"""
        # First block the user
        requests.put(f"{BASE_URL}/api/admin/users/{test_user_id}/block", headers=admin_headers)
        
        # Then unblock
        response = requests.put(f"{BASE_URL}/api/admin/users/{test_user_id}/unblock", 
                               headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASSED: Unblock user returned 200 - {data['message']}")
    
    def test_unblocked_user_can_login(self, admin_headers, test_user_id):
        """Unblocked user can login again"""
        # Ensure user is unblocked
        requests.put(f"{BASE_URL}/api/admin/users/{test_user_id}/unblock", headers=admin_headers)
        
        # Try to login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Unblocked user should be able to login, got {response.status_code}: {response.text}"
        print("PASSED: Unblocked user can login successfully")
    
    def test_edit_user_profile(self, admin_headers, test_user_id):
        """PUT /api/admin/users/{id}/edit updates user profile"""
        test_bio = f"TEST_admin_edit_{uuid.uuid4().hex[:8]}"
        response = requests.put(f"{BASE_URL}/api/admin/users/{test_user_id}/edit", 
                               headers=admin_headers,
                               json={"bio": test_bio})
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASSED: Edit user profile returned 200 - {data['message']}")
    
    def test_edit_user_no_changes(self, admin_headers, test_user_id):
        """PUT /api/admin/users/{id}/edit with empty data returns 400"""
        response = requests.put(f"{BASE_URL}/api/admin/users/{test_user_id}/edit", 
                               headers=admin_headers,
                               json={})
        assert response.status_code == 400
        print("PASSED: Edit user with no changes returns 400")
    
    def test_send_message_to_user(self, admin_headers, test_user_id):
        """POST /api/admin/users/{id}/message sends email to user"""
        response = requests.post(f"{BASE_URL}/api/admin/users/{test_user_id}/message", 
                                headers=admin_headers,
                                json={
                                    "subject": "TEST - Admin Message",
                                    "message": "This is a test message from admin panel testing."
                                })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASSED: Send message to user returned 200 - {data['message']}")
    
    def test_cannot_block_admin(self, admin_headers):
        """Cannot block an admin user"""
        # Get admin user ID
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        users = response.json()
        admin_user = next((u for u in users if u["role"] == "admin"), None)
        
        if admin_user:
            response = requests.put(f"{BASE_URL}/api/admin/users/{admin_user['id']}/block", 
                                   headers=admin_headers)
            assert response.status_code == 400
            print("PASSED: Cannot block admin user (400)")
        else:
            pytest.skip("No admin user found")


class TestAdminDemandManagement:
    """Test demand management: cancel, notify"""
    
    @pytest.fixture
    def admin_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    @pytest.fixture
    def open_demand_id(self, admin_headers):
        """Get an open demand ID for testing"""
        response = requests.get(f"{BASE_URL}/api/admin/demands", headers=admin_headers)
        demands = response.json()
        # Find an open demand
        for demand in demands:
            if demand["status"] == "open":
                return demand["id"]
        pytest.skip("No open demands found for testing")
    
    def test_get_all_demands(self, admin_headers):
        """GET /api/admin/demands returns list of demands"""
        response = requests.get(f"{BASE_URL}/api/admin/demands", headers=admin_headers)
        assert response.status_code == 200
        demands = response.json()
        assert isinstance(demands, list)
        print(f"PASSED: GET /api/admin/demands returned {len(demands)} demands")
    
    def test_notify_demand_wrong_category(self, admin_headers, open_demand_id):
        """POST /api/admin/demands/{id}/notify with wrong_category type"""
        response = requests.post(f"{BASE_URL}/api/admin/demands/{open_demand_id}/notify",
                                headers=admin_headers,
                                json={
                                    "notify_type": "wrong_category",
                                    "message": "TEST - Please update the category"
                                })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASSED: Notify demand (wrong_category) returned 200 - {data['message']}")
    
    def test_notify_demand_improve_description(self, admin_headers, open_demand_id):
        """POST /api/admin/demands/{id}/notify with improve_description type"""
        response = requests.post(f"{BASE_URL}/api/admin/demands/{open_demand_id}/notify",
                                headers=admin_headers,
                                json={
                                    "notify_type": "improve_description",
                                    "message": "TEST - Please add more details"
                                })
        assert response.status_code == 200
        print("PASSED: Notify demand (improve_description) returned 200")
    
    def test_notify_demand_vulgar_language(self, admin_headers, open_demand_id):
        """POST /api/admin/demands/{id}/notify with vulgar_language type and flagged_words"""
        response = requests.post(f"{BASE_URL}/api/admin/demands/{open_demand_id}/notify",
                                headers=admin_headers,
                                json={
                                    "notify_type": "vulgar_language",
                                    "message": "TEST - Please remove inappropriate content",
                                    "flagged_words": "test_word1, test_word2"
                                })
        assert response.status_code == 200
        print("PASSED: Notify demand (vulgar_language) with flagged_words returned 200")
    
    def test_notify_demand_custom(self, admin_headers, open_demand_id):
        """POST /api/admin/demands/{id}/notify with custom type"""
        response = requests.post(f"{BASE_URL}/api/admin/demands/{open_demand_id}/notify",
                                headers=admin_headers,
                                json={
                                    "notify_type": "custom",
                                    "message": "TEST - Custom notification message from admin"
                                })
        assert response.status_code == 200
        print("PASSED: Notify demand (custom) returned 200")
    
    def test_cancel_demand(self, admin_headers):
        """PUT /api/admin/demands/{id}/cancel cancels demand with reason"""
        # Get a fresh open demand to cancel
        response = requests.get(f"{BASE_URL}/api/admin/demands", headers=admin_headers)
        demands = response.json()
        open_demand = next((d for d in demands if d["status"] == "open"), None)
        
        if not open_demand:
            pytest.skip("No open demands to cancel")
        
        response = requests.put(f"{BASE_URL}/api/admin/demands/{open_demand['id']}/cancel",
                               headers=admin_headers,
                               json={"reason": "TEST - Cancelled by admin for testing purposes"})
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASSED: Cancel demand returned 200 - {data['message']}")
        
        # Verify demand is now cancelled
        response = requests.get(f"{BASE_URL}/api/admin/demands", headers=admin_headers)
        demands = response.json()
        cancelled_demand = next((d for d in demands if d["id"] == open_demand["id"]), None)
        assert cancelled_demand["status"] == "cancelled"
        print("PASSED: Demand status verified as 'cancelled'")
    
    def test_cannot_cancel_completed_demand(self, admin_headers):
        """Cannot cancel a completed demand"""
        response = requests.get(f"{BASE_URL}/api/admin/demands", headers=admin_headers)
        demands = response.json()
        completed_demand = next((d for d in demands if d["status"] == "completed"), None)
        
        if not completed_demand:
            pytest.skip("No completed demands to test")
        
        response = requests.put(f"{BASE_URL}/api/admin/demands/{completed_demand['id']}/cancel",
                               headers=admin_headers,
                               json={"reason": "TEST - Should fail"})
        assert response.status_code == 400
        print("PASSED: Cannot cancel completed demand (400)")


class TestAdminCategorySuggestions:
    """Test category suggestions management"""
    
    @pytest.fixture
    def admin_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_get_category_suggestions(self, admin_headers):
        """GET /api/admin/category-suggestions returns list"""
        response = requests.get(f"{BASE_URL}/api/admin/category-suggestions", headers=admin_headers)
        assert response.status_code == 200
        suggestions = response.json()
        assert isinstance(suggestions, list)
        print(f"PASSED: GET /api/admin/category-suggestions returned {len(suggestions)} suggestions")
        
        # Check structure if any exist
        if suggestions:
            s = suggestions[0]
            assert "id" in s
            assert "category_name" in s
            assert "status" in s
            print(f"  Sample suggestion: {s['category_name']} (status: {s['status']})")
    
    def test_approve_category_suggestion(self, admin_headers):
        """PUT /api/admin/category-suggestions/{id}/approve approves suggestion"""
        # Get pending suggestions
        response = requests.get(f"{BASE_URL}/api/admin/category-suggestions", headers=admin_headers)
        suggestions = response.json()
        pending = [s for s in suggestions if s["status"] == "pending"]
        
        if not pending:
            pytest.skip("No pending category suggestions to approve")
        
        suggestion_id = pending[0]["id"]
        response = requests.put(f"{BASE_URL}/api/admin/category-suggestions/{suggestion_id}/approve",
                               headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASSED: Approve category suggestion returned 200 - {data['message']}")
    
    def test_reject_category_suggestion(self, admin_headers):
        """PUT /api/admin/category-suggestions/{id}/reject rejects suggestion"""
        # Get pending suggestions
        response = requests.get(f"{BASE_URL}/api/admin/category-suggestions", headers=admin_headers)
        suggestions = response.json()
        pending = [s for s in suggestions if s["status"] == "pending"]
        
        if not pending:
            pytest.skip("No pending category suggestions to reject")
        
        suggestion_id = pending[0]["id"]
        response = requests.put(f"{BASE_URL}/api/admin/category-suggestions/{suggestion_id}/reject",
                               headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"PASSED: Reject category suggestion returned 200 - {data['message']}")
    
    def test_approve_nonexistent_suggestion(self, admin_headers):
        """Approving non-existent suggestion returns 404"""
        response = requests.put(f"{BASE_URL}/api/admin/category-suggestions/nonexistent-id/approve",
                               headers=admin_headers)
        assert response.status_code == 404
        print("PASSED: Approve non-existent suggestion returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
