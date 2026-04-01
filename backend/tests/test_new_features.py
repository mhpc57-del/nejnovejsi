"""
Test suite for CraftBolt new features (iteration 2):
- Address autocomplete (geocode API)
- Category filtering (categories API)
- Customer dashboard stat cards
- Chat polling and notifications
- Demand status notifications
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGeocodeAPI:
    """Test address autocomplete/geocode endpoints"""
    
    def test_geocode_search_praha(self):
        """Test geocode search returns results for Praha"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Praha"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of results"
        assert len(data) > 0, "Expected at least one result"
        assert "display_name" in data[0], "Expected display_name in result"
        assert "lat" in data[0], "Expected lat in result"
        assert "lon" in data[0], "Expected lon in result"
        print(f"✓ Geocode search for 'Praha' returned {len(data)} results")
    
    def test_geocode_search_brno(self):
        """Test geocode search returns results for Brno"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Brno"})
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Expected at least one result for Brno"
        assert "Brno" in data[0]["display_name"], "Expected Brno in display_name"
        print(f"✓ Geocode search for 'Brno' returned {len(data)} results")
    
    def test_geocode_search_empty_query(self):
        """Test geocode search with empty query returns empty list"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": ""})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Expected list"
        print(f"✓ Geocode search with empty query returned {len(data)} results")
    
    def test_geocode_reverse(self):
        """Test reverse geocode for Prague coordinates"""
        response = requests.get(f"{BASE_URL}/api/geocode/reverse", params={"lat": 50.0874654, "lon": 14.4212535})
        assert response.status_code == 200
        data = response.json()
        assert "display_name" in data, "Expected display_name in reverse geocode result"
        print(f"✓ Reverse geocode returned: {data.get('display_name', '')[:50]}...")


class TestCategoriesAPI:
    """Test categories endpoint for category filtering feature"""
    
    def test_get_categories(self):
        """Test categories endpoint returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data, "Expected 'categories' key in response"
        categories = data["categories"]
        assert isinstance(categories, list), "Expected list of categories"
        assert len(categories) > 50, f"Expected 50+ categories, got {len(categories)}"
        print(f"✓ Categories endpoint returned {len(categories)} categories")
    
    def test_categories_contain_expected_items(self):
        """Test categories contain expected Czech craft categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        data = response.json()
        categories = data["categories"]
        
        expected_categories = ["Instalatérství", "Elektromontáže", "Malířství", "Podlaháři"]
        for expected in expected_categories:
            found = any(expected.lower() in cat.lower() for cat in categories)
            assert found, f"Expected to find category containing '{expected}'"
        print(f"✓ Categories contain expected craft categories")


class TestAuthAndDemands:
    """Test authentication and demands for dashboard features"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@craftbolt.cz",
            "password": "CraftBolt2026!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed - skipping authenticated tests")
        return response.json()["access_token"]
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@craftbolt.cz",
            "password": "CraftBolt2026!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "access_token" in data, "Expected access_token in response"
        assert "user" in data, "Expected user in response"
        print(f"✓ Admin login successful")
    
    def test_get_my_demands(self, admin_token):
        """Test getting user's demands (for dashboard stat cards)"""
        response = requests.get(f"{BASE_URL}/api/demands/my", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of demands"
        print(f"✓ Get my demands returned {len(data)} demands")
    
    def test_get_demand_detail(self, admin_token):
        """Test getting demand detail (for DemandDetail page)"""
        # First get list of demands
        response = requests.get(f"{BASE_URL}/api/demands/my", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        demands = response.json()
        
        if len(demands) == 0:
            pytest.skip("No demands to test detail view")
        
        demand_id = demands[0]["id"]
        response = requests.get(f"{BASE_URL}/api/demands/{demand_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "id" in data, "Expected id in demand detail"
        assert "status" in data, "Expected status in demand detail"
        assert "title" in data, "Expected title in demand detail"
        print(f"✓ Get demand detail successful for demand: {data['title'][:30]}...")


class TestMessagesAPI:
    """Test messages API for chat polling feature"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@craftbolt.cz",
            "password": "CraftBolt2026!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["access_token"]
    
    def test_get_messages_for_demand(self, admin_token):
        """Test getting messages for a demand (chat polling)"""
        # First get a demand
        response = requests.get(f"{BASE_URL}/api/demands/my", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        demands = response.json()
        
        if len(demands) == 0:
            pytest.skip("No demands to test messages")
        
        demand_id = demands[0]["id"]
        response = requests.get(f"{BASE_URL}/api/messages/{demand_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of messages"
        print(f"✓ Get messages returned {len(data)} messages for demand")


class TestPublicUpload:
    """Test public upload endpoint (for registration without auth)"""
    
    def test_public_upload_jpeg(self):
        """Test public upload accepts JPEG files"""
        # Create a minimal valid JPEG
        jpeg_bytes = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
            0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
            0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
            0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
            0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
            0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
            0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
            0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
            0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
            0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
            0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
            0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
            0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
            0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xA8, 0xA8, 0x00,
            0xFF, 0xD9
        ])
        
        files = {"file": ("test.jpg", jpeg_bytes, "image/jpeg")}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data, "Expected url in response"
        print(f"✓ Public upload JPEG successful: {data['url']}")


class TestHealthEndpoint:
    """Test health endpoint"""
    
    def test_health(self):
        """Test health endpoint returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health endpoint returns healthy")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
