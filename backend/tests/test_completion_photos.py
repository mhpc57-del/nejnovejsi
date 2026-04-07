"""
Test suite for Completion Photos (Fotodokumentace) feature
Tests POST /api/demands/{demand_id}/completion-photos and DELETE /api/demands/{demand_id}/completion-photos
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

# Known completed demands for testing
COMPLETED_DEMAND_BLACKLIST = "a26298e5-222b-4bab-b63c-4eddcb74150f"  # blacklist type
COMPLETED_DEMAND_PRICE_INCREASE = "a2d8e3b0-388d-4cd0-ac76-b4a8cd2a4d55"  # price_increase type


@pytest.fixture(scope="module")
def customer_token():
    """Get customer authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": CUSTOMER_EMAIL,
        "password": CUSTOMER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Customer authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def supplier_token():
    """Get supplier authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": SUPPLIER_EMAIL,
        "password": SUPPLIER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Supplier authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def customer_user(customer_token):
    """Get customer user info"""
    response = requests.get(f"{BASE_URL}/api/auth/me", headers={
        "Authorization": f"Bearer {customer_token}"
    })
    if response.status_code == 200:
        return response.json()
    pytest.skip("Failed to get customer user info")


@pytest.fixture(scope="module")
def supplier_user(supplier_token):
    """Get supplier user info"""
    response = requests.get(f"{BASE_URL}/api/auth/me", headers={
        "Authorization": f"Bearer {supplier_token}"
    })
    if response.status_code == 200:
        return response.json()
    pytest.skip("Failed to get supplier user info")


class TestCompletionPhotosAPI:
    """Tests for completion photos endpoints"""
    
    def test_get_demand_returns_completion_photos_array(self, customer_token):
        """Test 6: GET /api/demands/{demand_id} returns completion_photos array"""
        response = requests.get(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "completion_photos" in data, "Response should contain completion_photos field"
        assert isinstance(data["completion_photos"], list), "completion_photos should be a list"
        
        # If there are photos, verify structure
        if len(data["completion_photos"]) > 0:
            photo = data["completion_photos"][0]
            assert "url" in photo, "Photo should have url field"
            assert "uploaded_by_name" in photo, "Photo should have uploaded_by_name field"
            assert "uploaded_by_role" in photo, "Photo should have uploaded_by_role field"
            assert "uploaded_at" in photo, "Photo should have uploaded_at field"
            print(f"✓ Completion photo structure verified: {photo}")
        else:
            print("✓ completion_photos array is empty (no photos uploaded yet)")
    
    def test_supplier_can_add_photo_to_completed_demand(self, supplier_token):
        """Test 1: POST /api/demands/{demand_id}/completion-photos — supplier can add photo"""
        test_photo_url = f"/uploads/test_supplier_photo_{uuid.uuid4().hex[:8]}.jpg"
        
        response = requests.post(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}/completion-photos",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"url": test_photo_url}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "photo" in data, "Response should contain photo object"
        assert data["photo"]["url"] == test_photo_url, "Photo URL should match"
        assert "uploaded_by" in data["photo"], "Photo should have uploaded_by"
        assert "uploaded_by_name" in data["photo"], "Photo should have uploaded_by_name"
        assert "uploaded_by_role" in data["photo"], "Photo should have uploaded_by_role"
        assert "uploaded_at" in data["photo"], "Photo should have uploaded_at"
        print(f"✓ Supplier added photo: {data['photo']}")
        
        # Store for cleanup
        self.__class__.supplier_photo_url = test_photo_url
    
    def test_customer_can_add_photo_to_completed_demand(self, customer_token):
        """Test 2: POST /api/demands/{demand_id}/completion-photos — customer can add photo"""
        test_photo_url = f"/uploads/test_customer_photo_{uuid.uuid4().hex[:8]}.jpg"
        
        response = requests.post(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}/completion-photos",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"url": test_photo_url}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "photo" in data, "Response should contain photo object"
        assert data["photo"]["url"] == test_photo_url, "Photo URL should match"
        print(f"✓ Customer added photo: {data['photo']}")
        
        # Store for cleanup
        self.__class__.customer_photo_url = test_photo_url
    
    def test_verify_photos_persisted_in_demand(self, customer_token):
        """Verify photos were actually persisted in the demand"""
        response = requests.get(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        photos = data.get("completion_photos", [])
        
        # Check if our test photos are in the list
        photo_urls = [p.get("url") for p in photos]
        
        if hasattr(self.__class__, 'supplier_photo_url'):
            assert self.__class__.supplier_photo_url in photo_urls, "Supplier photo should be persisted"
            print(f"✓ Supplier photo verified in demand: {self.__class__.supplier_photo_url}")
        
        if hasattr(self.__class__, 'customer_photo_url'):
            assert self.__class__.customer_photo_url in photo_urls, "Customer photo should be persisted"
            print(f"✓ Customer photo verified in demand: {self.__class__.customer_photo_url}")
    
    def test_user_can_delete_own_photo(self, customer_token):
        """Test 4: DELETE /api/demands/{demand_id}/completion-photos — user can delete own photo"""
        if not hasattr(self.__class__, 'customer_photo_url'):
            pytest.skip("No customer photo to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}/completion-photos",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"url": self.__class__.customer_photo_url}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        print(f"✓ Customer deleted own photo: {self.__class__.customer_photo_url}")
        
        # Verify deletion
        verify_response = requests.get(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        photos = verify_response.json().get("completion_photos", [])
        photo_urls = [p.get("url") for p in photos]
        assert self.__class__.customer_photo_url not in photo_urls, "Deleted photo should not be in list"
        print("✓ Photo deletion verified")
    
    def test_user_cannot_delete_another_users_photo(self, customer_token):
        """Test 5: DELETE /api/demands/{demand_id}/completion-photos — user cannot delete another user's photo"""
        if not hasattr(self.__class__, 'supplier_photo_url'):
            pytest.skip("No supplier photo to test with")
        
        response = requests.delete(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}/completion-photos",
            headers={"Authorization": f"Bearer {customer_token}"},
            json={"url": self.__class__.supplier_photo_url}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ Customer correctly forbidden from deleting supplier's photo")
    
    def test_cleanup_supplier_photo(self, supplier_token):
        """Cleanup: Delete supplier's test photo"""
        if not hasattr(self.__class__, 'supplier_photo_url'):
            pytest.skip("No supplier photo to cleanup")
        
        response = requests.delete(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}/completion-photos",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"url": self.__class__.supplier_photo_url}
        )
        assert response.status_code == 200, f"Cleanup failed: {response.status_code}: {response.text}"
        print(f"✓ Cleanup: Supplier photo deleted")


class TestCompletionPhotosValidation:
    """Tests for validation and error cases"""
    
    def test_cannot_add_photo_to_non_completed_demand(self, supplier_token):
        """Test 3: POST /api/demands/{demand_id}/completion-photos — returns 400 for non-completed demands"""
        # First, find a non-completed demand or use a known one
        # We'll try to add a photo to a demand that's not completed
        
        # Get list of demands to find a non-completed one
        response = requests.get(
            f"{BASE_URL}/api/demands",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        if response.status_code == 200:
            demands = response.json()
            non_completed = next((d for d in demands if d.get("status") != "completed"), None)
            
            if non_completed:
                test_photo_url = f"/uploads/test_invalid_{uuid.uuid4().hex[:8]}.jpg"
                add_response = requests.post(
                    f"{BASE_URL}/api/demands/{non_completed['id']}/completion-photos",
                    headers={"Authorization": f"Bearer {supplier_token}"},
                    json={"url": test_photo_url}
                )
                assert add_response.status_code == 400, f"Expected 400 for non-completed demand, got {add_response.status_code}: {add_response.text}"
                print(f"✓ Correctly rejected photo upload to non-completed demand (status: {non_completed.get('status')})")
            else:
                # Create a test with a fake demand ID
                test_photo_url = f"/uploads/test_invalid_{uuid.uuid4().hex[:8]}.jpg"
                add_response = requests.post(
                    f"{BASE_URL}/api/demands/fake-demand-id-12345/completion-photos",
                    headers={"Authorization": f"Bearer {supplier_token}"},
                    json={"url": test_photo_url}
                )
                assert add_response.status_code in [400, 404], f"Expected 400 or 404, got {add_response.status_code}"
                print(f"✓ Correctly rejected photo upload to non-existent demand")
        else:
            pytest.skip("Could not fetch demands list")
    
    def test_photo_url_required(self, supplier_token):
        """Test that photo URL is required"""
        response = requests.post(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}/completion-photos",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={}
        )
        assert response.status_code == 400, f"Expected 400 for missing URL, got {response.status_code}: {response.text}"
        print("✓ Correctly rejected request without photo URL")
    
    def test_delete_nonexistent_photo(self, supplier_token):
        """Test deleting a photo that doesn't exist"""
        response = requests.delete(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_BLACKLIST}/completion-photos",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"url": "/uploads/nonexistent_photo_12345.jpg"}
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent photo, got {response.status_code}: {response.text}"
        print("✓ Correctly returned 404 for nonexistent photo")


class TestCompletionPhotosOnPriceIncreaseDemand:
    """Test completion photos on price_increase type demand"""
    
    def test_add_and_verify_photo_on_price_increase_demand(self, supplier_token):
        """Test adding photo to price_increase type completed demand"""
        test_photo_url = f"/uploads/test_price_increase_{uuid.uuid4().hex[:8]}.jpg"
        
        # Add photo
        response = requests.post(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_PRICE_INCREASE}/completion-photos",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"url": test_photo_url}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Added photo to price_increase demand")
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_PRICE_INCREASE}",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        assert verify_response.status_code == 200
        data = verify_response.json()
        
        assert data.get("completion_type") == "price_increase", "Demand should be price_increase type"
        photos = data.get("completion_photos", [])
        photo_urls = [p.get("url") for p in photos]
        assert test_photo_url in photo_urls, "Photo should be in completion_photos"
        print(f"✓ Photo verified on price_increase demand")
        
        # Cleanup
        cleanup_response = requests.delete(
            f"{BASE_URL}/api/demands/{COMPLETED_DEMAND_PRICE_INCREASE}/completion-photos",
            headers={"Authorization": f"Bearer {supplier_token}"},
            json={"url": test_photo_url}
        )
        assert cleanup_response.status_code == 200
        print("✓ Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
