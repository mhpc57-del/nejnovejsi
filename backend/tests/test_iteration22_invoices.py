"""
Iteration 22 - Invoice System Backend Tests
Tests for:
- GET /api/invoices/my - user's invoices
- GET /api/invoices/{id}/pdf - PDF download
- GET /api/invoices/{id}/xml - XML download
- GET /api/admin/invoices - admin list invoices
- GET /api/admin/invoices/download-zip - admin ZIP export
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


class TestInvoiceEndpoints:
    """Invoice API endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def supplier_token(self):
        """Get supplier auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        assert response.status_code == 200, f"Supplier login failed: {response.text}"
        return response.json()["access_token"]
    
    # ============ USER INVOICE ENDPOINTS ============
    
    def test_get_my_invoices_authenticated_customer(self, customer_token):
        """GET /api/invoices/my returns user's invoices (may be empty for test user)"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/my",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Test user may have no invoices - that's expected
        print(f"Customer has {len(data)} invoices")
    
    def test_get_my_invoices_authenticated_supplier(self, supplier_token):
        """GET /api/invoices/my returns user's invoices for supplier"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/my",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Supplier has {len(data)} invoices")
    
    def test_get_my_invoices_unauthenticated(self):
        """GET /api/invoices/my returns 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/invoices/my")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
    
    # ============ ADMIN INVOICE ENDPOINTS ============
    
    def test_admin_get_all_invoices(self, admin_token):
        """GET /api/admin/invoices returns all invoices for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Admin sees {len(data)} total invoices")
    
    def test_admin_get_invoices_by_month(self, admin_token):
        """GET /api/admin/invoices?month=2026-04 filters by month"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"month": "2026-04"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Verify all returned invoices are from April 2026
        for inv in data:
            assert inv.get("issue_date", "").startswith("2026-04"), f"Invoice {inv.get('invoice_number')} not from 2026-04"
        print(f"Admin sees {len(data)} invoices for 2026-04")
    
    def test_admin_invoices_forbidden_for_customer(self, customer_token):
        """GET /api/admin/invoices returns 403 for non-admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_admin_invoices_forbidden_for_supplier(self, supplier_token):
        """GET /api/admin/invoices returns 403 for supplier"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    # ============ ZIP DOWNLOAD ============
    
    def test_admin_download_zip(self, admin_token):
        """GET /api/admin/invoices/download-zip returns ZIP for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/download-zip",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"month": "2026-04"}
        )
        # May return 404 if no invoices for that month, or 200 with ZIP
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}: {response.text}"
        if response.status_code == 200:
            assert response.headers.get("content-type") == "application/zip", "Should return ZIP"
            assert len(response.content) > 0, "ZIP should have content"
            print("ZIP download successful")
        else:
            print("No invoices for 2026-04 (404 expected)")
    
    def test_admin_download_zip_forbidden_for_customer(self, customer_token):
        """GET /api/admin/invoices/download-zip returns 403 for non-admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices/download-zip",
            headers={"Authorization": f"Bearer {customer_token}"},
            params={"month": "2026-04"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


class TestInvoicePdfXmlDownload:
    """Tests for PDF/XML download endpoints - requires existing invoice"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def customer_token(self):
        """Get customer auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def existing_invoice_id(self, admin_token):
        """Get an existing invoice ID from admin endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/invoices",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        pytest.skip("No invoices in database to test PDF/XML download")
    
    def test_download_pdf_as_admin(self, admin_token, existing_invoice_id):
        """GET /api/invoices/{id}/pdf returns PDF for admin"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/{existing_invoice_id}/pdf",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert "application/pdf" in response.headers.get("content-type", ""), "Should return PDF"
        assert len(response.content) > 0, "PDF should have content"
        print("PDF download successful")
    
    def test_download_xml_as_admin(self, admin_token, existing_invoice_id):
        """GET /api/invoices/{id}/xml returns XML for admin"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/{existing_invoice_id}/xml",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert "xml" in response.headers.get("content-type", "").lower(), "Should return XML"
        assert len(response.content) > 0, "XML should have content"
        print("XML download successful")
    
    def test_download_pdf_nonexistent_invoice(self, admin_token):
        """GET /api/invoices/{id}/pdf returns 404 for nonexistent invoice"""
        response = requests.get(
            f"{BASE_URL}/api/invoices/nonexistent-id-12345/pdf",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_download_pdf_unauthenticated(self, existing_invoice_id):
        """GET /api/invoices/{id}/pdf returns 401/403 without auth"""
        response = requests.get(f"{BASE_URL}/api/invoices/{existing_invoice_id}/pdf")
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
