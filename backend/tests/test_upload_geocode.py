"""
Backend tests for CraftBolt - Upload and Geocode endpoints
Tests the bug fixes:
1. Public upload endpoint (no auth required) - POST /api/upload/public
2. Geocode search endpoint - GET /api/geocode/search
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic health check tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")

    def test_root_endpoint(self):
        """Test /api/ returns API info"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "CraftBolt" in data.get("message", "")
        print("✓ Root endpoint working")


class TestPublicUpload:
    """Tests for public upload endpoint - Bug fix #1"""
    
    def test_public_upload_jpeg_without_auth(self):
        """Test POST /api/upload/public accepts JPEG without authentication"""
        # Create a minimal valid JPEG image (1x1 pixel)
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
            0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xA8, 0xF1, 0x7E, 0xA9,
            0x00, 0x00, 0x00, 0x00, 0xFF, 0xD9
        ])
        
        files = {'file': ('test_image.jpg', io.BytesIO(jpeg_bytes), 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data, "Response should contain 'url'"
        assert "filename" in data, "Response should contain 'filename'"
        assert data["url"].startswith("/api/uploads/"), f"URL should start with /api/uploads/, got {data['url']}"
        print(f"✓ Public upload JPEG without auth: {data['url']}")
        return data["url"]

    def test_public_upload_png_without_auth(self):
        """Test POST /api/upload/public accepts PNG without authentication"""
        # Minimal valid PNG (1x1 pixel, red)
        png_bytes = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
            0x00, 0x00, 0x03, 0x00, 0x01, 0x00, 0x05, 0xFE, 0xD4, 0xEF, 0x00, 0x00,
            0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {'file': ('test_image.png', io.BytesIO(png_bytes), 'image/png')}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data
        print(f"✓ Public upload PNG without auth: {data['url']}")

    def test_public_upload_webp_without_auth(self):
        """Test POST /api/upload/public accepts WebP without authentication"""
        # Minimal valid WebP (1x1 pixel)
        webp_bytes = bytes([
            0x52, 0x49, 0x46, 0x46, 0x1A, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
            0x56, 0x50, 0x38, 0x4C, 0x0D, 0x00, 0x00, 0x00, 0x2F, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00
        ])
        
        files = {'file': ('test_image.webp', io.BytesIO(webp_bytes), 'image/webp')}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data
        print(f"✓ Public upload WebP without auth: {data['url']}")

    def test_public_upload_gif_without_auth(self):
        """Test POST /api/upload/public accepts GIF without authentication"""
        # Minimal valid GIF (1x1 pixel)
        gif_bytes = bytes([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
            0x00, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x21, 0xF9, 0x04, 0x01, 0x00,
            0x00, 0x00, 0x00, 0x2C, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
            0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3B
        ])
        
        files = {'file': ('test_image.gif', io.BytesIO(gif_bytes), 'image/gif')}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data
        print(f"✓ Public upload GIF without auth: {data['url']}")

    def test_public_upload_bmp_by_extension(self):
        """Test POST /api/upload/public accepts BMP by file extension"""
        # Minimal BMP header
        bmp_bytes = bytes([
            0x42, 0x4D, 0x3A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x36, 0x00,
            0x00, 0x00, 0x28, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x00,
            0x00, 0x00, 0x01, 0x00, 0x18, 0x00, 0x00, 0x00, 0x00, 0x00, 0x04, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0x00, 0x00, 0x00
        ])
        
        files = {'file': ('test_image.bmp', io.BytesIO(bmp_bytes), 'image/bmp')}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "url" in data
        print(f"✓ Public upload BMP: {data['url']}")

    def test_public_upload_rejects_invalid_format(self):
        """Test POST /api/upload/public rejects unsupported file formats"""
        # Create a text file
        text_content = b"This is not an image"
        
        files = {'file': ('test.txt', io.BytesIO(text_content), 'text/plain')}
        response = requests.post(f"{BASE_URL}/api/upload/public", files=files)
        
        assert response.status_code == 400, f"Expected 400 for invalid format, got {response.status_code}"
        print("✓ Public upload correctly rejects invalid format")

    def test_authenticated_upload_requires_auth(self):
        """Test POST /api/upload (authenticated) requires authentication"""
        jpeg_bytes = bytes([0xFF, 0xD8, 0xFF, 0xE0] + [0x00] * 100 + [0xFF, 0xD9])
        
        files = {'file': ('test_image.jpg', io.BytesIO(jpeg_bytes), 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        
        # Should return 403 (Forbidden) or 401 (Unauthorized) without auth
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Authenticated upload correctly requires auth")


class TestGeocodeSearch:
    """Tests for geocode search endpoint - Bug fix #2"""
    
    def test_geocode_search_praha(self):
        """Test GET /api/geocode/search returns results for Praha"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Praha"})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one result for Praha"
        
        # Check first result has expected fields
        first = data[0]
        assert "display_name" in first, "Result should have display_name"
        assert "lat" in first, "Result should have lat"
        assert "lon" in first, "Result should have lon"
        assert "Praha" in first["display_name"], "Result should contain Praha"
        print(f"✓ Geocode search Praha: {len(data)} results, first: {first['display_name'][:50]}...")

    def test_geocode_search_brno(self):
        """Test GET /api/geocode/search returns results for Brno"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Brno"})
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0, "Should return results for Brno"
        assert "Brno" in data[0]["display_name"]
        print(f"✓ Geocode search Brno: {len(data)} results")

    def test_geocode_search_street_address(self):
        """Test GET /api/geocode/search with street address"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Václavské náměstí Praha"})
        
        assert response.status_code == 200
        data = response.json()
        # May or may not return results depending on Nominatim
        print(f"✓ Geocode search street address: {len(data)} results")

    def test_geocode_search_empty_query(self):
        """Test GET /api/geocode/search with empty query"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": ""})
        
        # Should return 200 with empty results or 422 validation error
        assert response.status_code in [200, 422], f"Expected 200 or 422, got {response.status_code}"
        print("✓ Geocode search handles empty query")

    def test_geocode_search_returns_czech_results(self):
        """Test geocode search is limited to Czech Republic"""
        response = requests.get(f"{BASE_URL}/api/geocode/search", params={"q": "Praha"})
        
        assert response.status_code == 200
        data = response.json()
        
        # All results should be in Czech Republic
        for result in data:
            address = result.get("address", {})
            country_code = address.get("country_code", "")
            assert country_code == "cz", f"Expected Czech results, got country_code: {country_code}"
        print("✓ Geocode search returns only Czech results")


class TestGeocodeReverse:
    """Tests for reverse geocode endpoint"""
    
    def test_geocode_reverse_prague_center(self):
        """Test GET /api/geocode/reverse for Prague center coordinates"""
        response = requests.get(f"{BASE_URL}/api/geocode/reverse", params={
            "lat": 50.0874654,
            "lon": 14.4212535
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "display_name" in data, "Response should have display_name"
        assert "Praha" in data["display_name"], "Should return Prague address"
        print(f"✓ Reverse geocode Prague: {data['display_name'][:60]}...")


class TestCategories:
    """Tests for categories endpoint"""
    
    def test_get_categories(self):
        """Test GET /api/categories returns list of categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) > 0
        print(f"✓ Categories endpoint: {len(data['categories'])} categories")


class TestAuth:
    """Tests for authentication endpoints"""
    
    def test_login_admin(self):
        """Test POST /api/auth/login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@craftbolt.cz",
            "password": "CraftBolt2026!"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == "admin@craftbolt.cz"
        assert data["user"]["role"] == "admin"
        print("✓ Admin login successful")
        return data["access_token"]

    def test_login_invalid_credentials(self):
        """Test POST /api/auth/login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        print("✓ Invalid login correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
