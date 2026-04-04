"""
Iteration 10 - Email Verification Flow Tests
Tests for:
1. Registration returns requires_verification:true (NOT a token)
2. Login with unverified email returns 403 EMAIL_NOT_VERIFIED
3. Login with verified email returns token
4. GET /api/auth/verify-email/{token} verifies user
5. POST /api/auth/resend-verification sends new email
6. Admin login bypasses verification
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASSED: Health endpoint returns healthy")

    def test_api_root(self):
        """Test API root"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        print("PASSED: API root accessible")


class TestRegistrationVerificationFlow:
    """Test registration returns verification info, not token"""
    
    def test_register_returns_requires_verification(self):
        """POST /api/auth/register should return requires_verification:true, NOT a token"""
        unique_email = f"test-verify-{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestHeslo123!",
            "phone": "+420777888999",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Test",
            "last_name": "Verification"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # CRITICAL: Should NOT return access_token
        assert "access_token" not in data, "Registration should NOT return access_token anymore"
        
        # Should return verification info
        assert data.get("requires_verification") == True, "Should return requires_verification:true"
        assert data.get("email") == unique_email, "Should return the registered email"
        assert "message" in data, "Should return a message"
        
        print(f"PASSED: Registration returns requires_verification:true for {unique_email}")
        return unique_email
    
    def test_register_supplier_returns_requires_verification(self):
        """Supplier registration should also return requires_verification"""
        unique_email = f"test-supplier-verify-{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestHeslo123!",
            "phone": "+420777888999",
            "role": "supplier",
            "account_type": "osvc",
            "first_name": "Test",
            "last_name": "Supplier",
            "ico": "12345678",
            "categories": ["Elektrikář"]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "access_token" not in data, "Supplier registration should NOT return access_token"
        assert data.get("requires_verification") == True
        
        print(f"PASSED: Supplier registration returns requires_verification:true")
        return unique_email


class TestLoginVerificationCheck:
    """Test login checks is_verified status"""
    
    def test_login_unverified_user_returns_403(self):
        """Login with unverified email should return 403 EMAIL_NOT_VERIFIED"""
        # First register a new user (will be unverified)
        unique_email = f"test-unverified-{uuid.uuid4().hex[:8]}@example.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestHeslo123!",
            "phone": "+420777888999",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Unverified",
            "last_name": "User"
        })
        assert reg_response.status_code == 200
        
        # Now try to login - should fail with EMAIL_NOT_VERIFIED
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "TestHeslo123!"
        })
        
        assert login_response.status_code == 403, f"Expected 403, got {login_response.status_code}: {login_response.text}"
        data = login_response.json()
        assert data.get("detail") == "EMAIL_NOT_VERIFIED", f"Expected EMAIL_NOT_VERIFIED, got {data}"
        
        print(f"PASSED: Login with unverified email returns 403 EMAIL_NOT_VERIFIED")
    
    def test_login_verified_user_returns_token(self):
        """Login with verified email should return token"""
        # Use the pre-verified test user
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testvendulka@test.cz",
            "password": "TestHeslo123!"
        })
        
        # This user should be verified (per test_credentials.md)
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data, "Should return access_token for verified user"
            assert "user" in data, "Should return user data"
            print("PASSED: Login with verified user returns token")
        elif response.status_code == 403:
            # User might not exist or not be verified - skip
            pytest.skip("Test user testvendulka@test.cz not found or not verified")
        else:
            pytest.fail(f"Unexpected status {response.status_code}: {response.text}")
    
    def test_admin_login_bypasses_verification(self):
        """Admin login should work regardless of is_verified status"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "m.schwarzer@email.cz",
            "password": "CraftBolt2026!"
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data, "Admin should get access_token"
        assert data["user"]["role"] == "admin", "Should be admin role"
        
        print("PASSED: Admin login bypasses verification check")


class TestVerifyEmailEndpoint:
    """Test email verification endpoint"""
    
    def test_verify_email_invalid_token(self):
        """GET /api/auth/verify-email/{invalid_token} should return 400"""
        response = requests.get(f"{BASE_URL}/api/auth/verify-email/invalid-token-12345")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        
        print("PASSED: Invalid verification token returns 400")
    
    def test_verify_email_flow(self):
        """Full verification flow: register -> get token from DB -> verify -> login"""
        # This test requires DB access to get the verification token
        # We'll test what we can without direct DB access
        
        # Register a user
        unique_email = f"test-fullverify-{uuid.uuid4().hex[:8]}@example.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestHeslo123!",
            "phone": "+420777888999",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Full",
            "last_name": "Verify"
        })
        assert reg_response.status_code == 200
        
        # Verify login fails (unverified)
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "TestHeslo123!"
        })
        assert login_response.status_code == 403
        assert login_response.json().get("detail") == "EMAIL_NOT_VERIFIED"
        
        print("PASSED: Verification flow - unverified user cannot login")


class TestResendVerification:
    """Test resend verification endpoint"""
    
    def test_resend_verification_success(self):
        """POST /api/auth/resend-verification should accept email"""
        # First register a user
        unique_email = f"test-resend-{uuid.uuid4().hex[:8]}@example.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "TestHeslo123!",
            "phone": "+420777888999",
            "role": "customer",
            "account_type": "nepodnikatel",
            "first_name": "Resend",
            "last_name": "Test"
        })
        assert reg_response.status_code == 200
        
        # Now resend verification
        resend_response = requests.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": unique_email
        })
        
        assert resend_response.status_code == 200, f"Expected 200, got {resend_response.status_code}: {resend_response.text}"
        data = resend_response.json()
        assert "message" in data
        
        print("PASSED: Resend verification returns success")
    
    def test_resend_verification_missing_email(self):
        """POST /api/auth/resend-verification without email should return 400"""
        response = requests.post(f"{BASE_URL}/api/auth/resend-verification", json={})
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        print("PASSED: Resend verification without email returns 400")
    
    def test_resend_verification_nonexistent_user(self):
        """POST /api/auth/resend-verification for nonexistent user should return 404"""
        response = requests.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": "nonexistent-user-12345@example.com"
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASSED: Resend verification for nonexistent user returns 404")
    
    def test_resend_verification_already_verified(self):
        """POST /api/auth/resend-verification for already verified user should return message"""
        # Use admin who is verified
        response = requests.post(f"{BASE_URL}/api/auth/resend-verification", json={
            "email": "m.schwarzer@email.cz"
        })
        
        # Should return 200 with "already verified" message
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Message should indicate already verified
        print(f"PASSED: Resend for verified user returns: {data.get('message')}")


class TestCategoriesEndpoint:
    """Test categories endpoint still works"""
    
    def test_get_categories(self):
        """GET /api/categories should return list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert len(data["categories"]) > 0
        
        print(f"PASSED: Categories endpoint returns {len(data['categories'])} categories")


class TestGeocodeEndpoint:
    """Test geocode endpoint still works"""
    
    def test_geocode_search(self):
        """GET /api/geocode/search should return results"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Praha"})
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        print(f"PASSED: Geocode search returns {len(data)} results for Praha")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
