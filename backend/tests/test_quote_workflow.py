"""
Test Quote/Budget Workflow for CraftBolt.cz
Tests the new feature: Supplier uploads budget file, Customer accepts/rejects with reason

Flow:
1. Customer creates demand
2. Supplier accepts demand (status -> in_progress)
3. Supplier submits quote with file
4. Customer accepts or rejects quote (with mandatory reason for rejection)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CUSTOMER_EMAIL = "testvendulka@test.cz"
CUSTOMER_PASSWORD = "TestHeslo123!"
SUPPLIER_EMAIL = "test_supplier_chat@test.cz"
SUPPLIER_PASSWORD = "TestHeslo123"
ADMIN_EMAIL = "m.schwarzer@email.cz"
ADMIN_PASSWORD = "CraftBolt2026!"


class TestQuoteWorkflow:
    """Test the complete quote/budget workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.customer_token = None
        self.supplier_token = None
        self.demand_id = None
        self.quote_id = None
    
    def login_customer(self):
        """Login as customer and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        assert response.status_code == 200, f"Customer login failed: {response.text}"
        data = response.json()
        self.customer_token = data["access_token"]
        return self.customer_token
    
    def login_supplier(self):
        """Login as supplier and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL,
            "password": SUPPLIER_PASSWORD
        })
        assert response.status_code == 200, f"Supplier login failed: {response.text}"
        data = response.json()
        self.supplier_token = data["access_token"]
        return self.supplier_token
    
    def test_01_customer_login(self):
        """Test customer can login"""
        token = self.login_customer()
        assert token is not None
        print(f"✓ Customer logged in successfully")
    
    def test_02_supplier_login(self):
        """Test supplier can login"""
        token = self.login_supplier()
        assert token is not None
        print(f"✓ Supplier logged in successfully")
    
    def test_03_create_demand_as_customer(self):
        """Customer creates a new demand"""
        self.login_customer()
        
        response = self.session.post(f"{BASE_URL}/api/demands", json={
            "title": "TEST_Quote_Workflow_Demand",
            "description": "Test demand for quote workflow testing",
            "category": "Elektrikáři – silnoproud",
            "address": "Praha 1, Česká republika",
            "latitude": 50.0755,
            "longitude": 14.4378,
            "budget_min": 5000,
            "budget_max": 15000
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        
        assert response.status_code == 200, f"Create demand failed: {response.text}"
        data = response.json()
        assert "id" in data
        assert data["status"] == "open"
        self.demand_id = data["id"]
        print(f"✓ Demand created with ID: {self.demand_id}")
        return self.demand_id
    
    def test_04_supplier_accepts_demand(self):
        """Supplier accepts the demand (status -> in_progress)"""
        # First create demand as customer
        self.login_customer()
        response = self.session.post(f"{BASE_URL}/api/demands", json={
            "title": "TEST_Quote_Accept_Demand",
            "description": "Test demand for supplier acceptance",
            "category": "Elektrikáři – silnoproud",
            "address": "Praha 2, Česká republika"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        assert response.status_code == 200
        self.demand_id = response.json()["id"]
        
        # Now login as supplier and accept
        self.login_supplier()
        response = self.session.post(
            f"{BASE_URL}/api/demands/{self.demand_id}/accept",
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        assert response.status_code == 200, f"Accept demand failed: {response.text}"
        
        # Verify status changed to in_progress
        response = self.session.get(
            f"{BASE_URL}/api/demands/{self.demand_id}",
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress", f"Expected in_progress, got {data['status']}"
        assert data["assigned_supplier_id"] is not None
        print(f"✓ Supplier accepted demand, status is now in_progress")
        return self.demand_id


class TestQuoteSubmission:
    """Test quote submission by supplier"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.customer_token = None
        self.supplier_token = None
        self.demand_id = None
    
    def setup_in_progress_demand(self):
        """Create a demand and have supplier accept it"""
        # Login customer and create demand
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        self.customer_token = response.json()["access_token"]
        
        response = self.session.post(f"{BASE_URL}/api/demands", json={
            "title": f"TEST_Quote_Submit_{int(time.time())}",
            "description": "Test demand for quote submission",
            "category": "Elektrikáři – silnoproud",
            "address": "Praha 3"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        self.demand_id = response.json()["id"]
        
        # Login supplier and accept
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL, "password": SUPPLIER_PASSWORD
        })
        self.supplier_token = response.json()["access_token"]
        
        self.session.post(
            f"{BASE_URL}/api/demands/{self.demand_id}/accept",
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        return self.demand_id
    
    def test_05_supplier_submit_quote_success(self):
        """Supplier can submit a quote with file_url, file_name, amount, note"""
        self.setup_in_progress_demand()
        
        response = self.session.post(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes",
            json={
                "file_url": "/api/uploads/test-budget.pdf",
                "file_name": "rozpocet_elektrika.pdf",
                "amount": 12500,
                "note": "Kompletní rozpočet včetně materiálu"
            },
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        
        assert response.status_code == 200, f"Submit quote failed: {response.text}"
        data = response.json()
        assert "quote" in data
        assert data["quote"]["status"] == "pending"
        assert data["quote"]["amount"] == 12500
        assert data["quote"]["file_name"] == "rozpocet_elektrika.pdf"
        print(f"✓ Quote submitted successfully with ID: {data['quote']['id']}")
    
    def test_06_quote_requires_file(self):
        """Quote submission requires file_url"""
        self.setup_in_progress_demand()
        
        response = self.session.post(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes",
            json={
                "amount": 10000,
                "note": "Missing file"
            },
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "soubor" in response.json()["detail"].lower() or "file" in response.json()["detail"].lower()
        print(f"✓ Quote correctly requires file_url")
    
    def test_07_only_assigned_supplier_can_submit(self):
        """Only the assigned supplier can submit quotes"""
        self.setup_in_progress_demand()
        
        # Try to submit as customer (should fail)
        response = self.session.post(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes",
            json={
                "file_url": "/api/uploads/test.pdf",
                "file_name": "test.pdf",
                "amount": 5000
            },
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Non-supplier correctly rejected from submitting quote")
    
    def test_08_quote_only_for_in_progress_demand(self):
        """Quotes can only be submitted for in_progress demands"""
        # Create demand but don't accept it (stays open)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        self.customer_token = response.json()["access_token"]
        
        response = self.session.post(f"{BASE_URL}/api/demands", json={
            "title": f"TEST_Quote_Open_{int(time.time())}",
            "description": "Test demand that stays open",
            "category": "Elektrikáři – silnoproud",
            "address": "Praha 4"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        demand_id = response.json()["id"]
        
        # Login as supplier but don't accept - try to submit quote
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL, "password": SUPPLIER_PASSWORD
        })
        self.supplier_token = response.json()["access_token"]
        
        response = self.session.post(
            f"{BASE_URL}/api/demands/{demand_id}/quotes",
            json={
                "file_url": "/api/uploads/test.pdf",
                "file_name": "test.pdf",
                "amount": 5000
            },
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        
        # Should fail because demand is not in_progress
        assert response.status_code in [400, 403], f"Expected 400/403, got {response.status_code}: {response.text}"
        print(f"✓ Quote correctly rejected for non-in_progress demand")


class TestQuoteAcceptReject:
    """Test customer accepting/rejecting quotes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.customer_token = None
        self.supplier_token = None
        self.demand_id = None
        self.quote_id = None
    
    def setup_demand_with_quote(self):
        """Create demand, accept it, and submit a quote"""
        # Login customer and create demand
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        self.customer_token = response.json()["access_token"]
        
        response = self.session.post(f"{BASE_URL}/api/demands", json={
            "title": f"TEST_Quote_AcceptReject_{int(time.time())}",
            "description": "Test demand for accept/reject",
            "category": "Elektrikáři – silnoproud",
            "address": "Praha 5"
        }, headers={"Authorization": f"Bearer {self.customer_token}"})
        self.demand_id = response.json()["id"]
        
        # Login supplier and accept demand
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL, "password": SUPPLIER_PASSWORD
        })
        self.supplier_token = response.json()["access_token"]
        
        self.session.post(
            f"{BASE_URL}/api/demands/{self.demand_id}/accept",
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        
        # Submit quote
        response = self.session.post(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes",
            json={
                "file_url": "/api/uploads/budget.pdf",
                "file_name": "budget.pdf",
                "amount": 15000,
                "note": "Test quote"
            },
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        self.quote_id = response.json()["quote"]["id"]
        return self.demand_id, self.quote_id
    
    def test_09_customer_accept_quote(self):
        """Customer can accept a quote"""
        self.setup_demand_with_quote()
        
        response = self.session.put(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes/{self.quote_id}/accept",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 200, f"Accept quote failed: {response.text}"
        
        # Verify quote status changed
        response = self.session.get(
            f"{BASE_URL}/api/demands/{self.demand_id}",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        data = response.json()
        quote = next((q for q in data.get("quotes", []) if q["id"] == self.quote_id), None)
        assert quote is not None
        assert quote["status"] == "accepted"
        assert data.get("agreed_price") == 15000  # Should set agreed_price
        print(f"✓ Customer accepted quote successfully")
    
    def test_10_customer_reject_quote_requires_reason(self):
        """Customer must provide reason when rejecting quote"""
        self.setup_demand_with_quote()
        
        # Try to reject without reason
        response = self.session.put(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes/{self.quote_id}/reject",
            json={},
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "důvod" in response.json()["detail"].lower() or "reason" in response.json()["detail"].lower()
        print(f"✓ Reject correctly requires reason")
    
    def test_11_customer_reject_quote_with_reason(self):
        """Customer can reject quote with mandatory reason"""
        self.setup_demand_with_quote()
        
        response = self.session.put(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes/{self.quote_id}/reject",
            json={"reason": "Cena je příliš vysoká, očekával jsem max 10000 Kč"},
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        assert response.status_code == 200, f"Reject quote failed: {response.text}"
        
        # Verify quote status and reason
        response = self.session.get(
            f"{BASE_URL}/api/demands/{self.demand_id}",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        data = response.json()
        quote = next((q for q in data.get("quotes", []) if q["id"] == self.quote_id), None)
        assert quote is not None
        assert quote["status"] == "rejected"
        assert quote["rejection_reason"] == "Cena je příliš vysoká, očekával jsem max 10000 Kč"
        print(f"✓ Customer rejected quote with reason")
    
    def test_12_only_customer_can_accept_reject(self):
        """Only the demand customer can accept/reject quotes"""
        self.setup_demand_with_quote()
        
        # Try to accept as supplier (should fail)
        response = self.session.put(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes/{self.quote_id}/accept",
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print(f"✓ Non-customer correctly rejected from accepting quote")
    
    def test_13_multiple_quotes_allowed(self):
        """Supplier can submit multiple quotes (after rejection)"""
        self.setup_demand_with_quote()
        
        # Reject first quote
        self.session.put(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes/{self.quote_id}/reject",
            json={"reason": "Too expensive"},
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        
        # Submit second quote
        response = self.session.post(
            f"{BASE_URL}/api/demands/{self.demand_id}/quotes",
            json={
                "file_url": "/api/uploads/budget_v2.pdf",
                "file_name": "budget_v2.pdf",
                "amount": 10000,
                "note": "Revised quote with lower price"
            },
            headers={"Authorization": f"Bearer {self.supplier_token}"}
        )
        
        assert response.status_code == 200, f"Second quote failed: {response.text}"
        
        # Verify both quotes exist
        response = self.session.get(
            f"{BASE_URL}/api/demands/{self.demand_id}",
            headers={"Authorization": f"Bearer {self.customer_token}"}
        )
        data = response.json()
        assert len(data.get("quotes", [])) == 2
        print(f"✓ Multiple quotes allowed")


class TestQuoteResponseStructure:
    """Test that quotes array is returned correctly in demand response"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_14_quotes_array_structure(self):
        """Verify quotes array has correct structure in demand response"""
        # Login customer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        customer_token = response.json()["access_token"]
        
        # Create demand
        response = self.session.post(f"{BASE_URL}/api/demands", json={
            "title": f"TEST_Quote_Structure_{int(time.time())}",
            "description": "Test quote structure",
            "category": "Elektrikáři – silnoproud",
            "address": "Praha 6"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        demand_id = response.json()["id"]
        
        # Login supplier and accept
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL, "password": SUPPLIER_PASSWORD
        })
        supplier_token = response.json()["access_token"]
        
        self.session.post(
            f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        # Submit quote
        self.session.post(
            f"{BASE_URL}/api/demands/{demand_id}/quotes",
            json={
                "file_url": "/api/uploads/structure_test.pdf",
                "file_name": "structure_test.pdf",
                "amount": 8000,
                "note": "Structure test note"
            },
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        # Get demand and verify quote structure
        response = self.session.get(
            f"{BASE_URL}/api/demands/{demand_id}",
            headers={"Authorization": f"Bearer {customer_token}"}
        )
        data = response.json()
        
        assert "quotes" in data, "quotes field missing from demand response"
        assert len(data["quotes"]) > 0, "quotes array is empty"
        
        quote = data["quotes"][0]
        required_fields = ["id", "supplier_id", "supplier_name", "file_url", "file_name", 
                          "amount", "note", "status", "rejection_reason", "created_at", "responded_at"]
        
        for field in required_fields:
            assert field in quote, f"Missing field: {field}"
        
        assert quote["status"] == "pending"
        assert quote["amount"] == 8000
        assert quote["file_name"] == "structure_test.pdf"
        assert quote["rejection_reason"] is None
        print(f"✓ Quote structure is correct with all required fields")


class TestFileExtensionValidation:
    """Test file extension validation for quotes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_15_allowed_extensions(self):
        """Test that allowed extensions are accepted"""
        # Login customer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        customer_token = response.json()["access_token"]
        
        # Create demand
        response = self.session.post(f"{BASE_URL}/api/demands", json={
            "title": f"TEST_Extensions_{int(time.time())}",
            "description": "Test extensions",
            "category": "Elektrikáři – silnoproud",
            "address": "Praha 7"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        demand_id = response.json()["id"]
        
        # Login supplier and accept
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL, "password": SUPPLIER_PASSWORD
        })
        supplier_token = response.json()["access_token"]
        
        self.session.post(
            f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        # Test allowed extensions
        allowed_exts = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png"]
        for ext in allowed_exts:
            response = self.session.post(
                f"{BASE_URL}/api/demands/{demand_id}/quotes",
                json={
                    "file_url": f"/api/uploads/test.{ext}",
                    "file_name": f"budget.{ext}",
                    "amount": 5000
                },
                headers={"Authorization": f"Bearer {supplier_token}"}
            )
            assert response.status_code == 200, f"Extension {ext} should be allowed: {response.text}"
        
        print(f"✓ All allowed extensions accepted: {allowed_exts}")
    
    def test_16_disallowed_extensions(self):
        """Test that disallowed extensions are rejected"""
        # Login customer
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD
        })
        customer_token = response.json()["access_token"]
        
        # Create demand
        response = self.session.post(f"{BASE_URL}/api/demands", json={
            "title": f"TEST_BadExt_{int(time.time())}",
            "description": "Test bad extensions",
            "category": "Elektrikáři – silnoproud",
            "address": "Praha 8"
        }, headers={"Authorization": f"Bearer {customer_token}"})
        demand_id = response.json()["id"]
        
        # Login supplier and accept
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": SUPPLIER_EMAIL, "password": SUPPLIER_PASSWORD
        })
        supplier_token = response.json()["access_token"]
        
        self.session.post(
            f"{BASE_URL}/api/demands/{demand_id}/accept",
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        # Test disallowed extension
        response = self.session.post(
            f"{BASE_URL}/api/demands/{demand_id}/quotes",
            json={
                "file_url": "/api/uploads/test.exe",
                "file_name": "malware.exe",
                "amount": 5000
            },
            headers={"Authorization": f"Bearer {supplier_token}"}
        )
        
        assert response.status_code == 400, f"Extension exe should be rejected: {response.text}"
        print(f"✓ Disallowed extensions correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
