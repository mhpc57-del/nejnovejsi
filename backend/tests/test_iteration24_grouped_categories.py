"""
Iteration 24 - Test grouped categories API
Tests that GET /api/categories returns both 'categories' (flat array) and 'grouped' (object with Řemesla and Služby keys)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGroupedCategoriesAPI:
    """Test the /api/categories endpoint returns grouped categories"""
    
    def test_categories_endpoint_returns_both_keys(self):
        """Test that /api/categories returns both 'categories' and 'grouped' keys"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "categories" in data, "Response should contain 'categories' key"
        assert "grouped" in data, "Response should contain 'grouped' key"
    
    def test_categories_is_flat_array(self):
        """Test that 'categories' is a flat sorted array"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        categories = data.get("categories", [])
        
        assert isinstance(categories, list), "'categories' should be a list"
        assert len(categories) > 0, "'categories' should not be empty"
        
        # Check it's sorted alphabetically (case-insensitive)
        sorted_cats = sorted(categories, key=lambda x: x.lower())
        assert categories == sorted_cats, "'categories' should be sorted alphabetically"
    
    def test_grouped_has_remesla_and_sluzby(self):
        """Test that 'grouped' contains 'Řemesla' and 'Služby' keys"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        grouped = data.get("grouped", {})
        
        assert isinstance(grouped, dict), "'grouped' should be a dictionary"
        assert "Řemesla" in grouped, "'grouped' should contain 'Řemesla' key"
        assert "Služby" in grouped, "'grouped' should contain 'Služby' key"
    
    def test_remesla_has_46_items(self):
        """Test that 'Řemesla' group has 46 items"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        remesla = data.get("grouped", {}).get("Řemesla", [])
        
        assert isinstance(remesla, list), "'Řemesla' should be a list"
        assert len(remesla) == 46, f"'Řemesla' should have 46 items, got {len(remesla)}"
    
    def test_sluzby_has_78_items(self):
        """Test that 'Služby' group has 78 items"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        sluzby = data.get("grouped", {}).get("Služby", [])
        
        assert isinstance(sluzby, list), "'Služby' should be a list"
        assert len(sluzby) == 78, f"'Služby' should have 78 items, got {len(sluzby)}"
    
    def test_grouped_items_are_sorted(self):
        """Test that items within each group are sorted alphabetically"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        grouped = data.get("grouped", {})
        
        for group_name, items in grouped.items():
            sorted_items = sorted(items, key=lambda x: x.lower())
            assert items == sorted_items, f"Items in '{group_name}' should be sorted alphabetically"
    
    def test_flat_categories_contains_all_grouped_items(self):
        """Test that flat 'categories' contains all items from both groups"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        categories = set(data.get("categories", []))
        grouped = data.get("grouped", {})
        
        remesla = set(grouped.get("Řemesla", []))
        sluzby = set(grouped.get("Služby", []))
        
        # All items from Řemesla should be in categories
        assert remesla.issubset(categories), "All 'Řemesla' items should be in 'categories'"
        
        # All items from Služby should be in categories
        assert sluzby.issubset(categories), "All 'Služby' items should be in 'categories'"
    
    def test_specific_categories_in_correct_groups(self):
        """Test that specific categories are in the correct groups"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        data = response.json()
        grouped = data.get("grouped", {})
        remesla = grouped.get("Řemesla", [])
        sluzby = grouped.get("Služby", [])
        
        # Test some specific Řemesla items
        assert "Elektrikáři – silnoproud" in remesla, "'Elektrikáři – silnoproud' should be in Řemesla"
        assert "Zedníci" in remesla, "'Zedníci' should be in Řemesla"
        assert "Instalatéři" in remesla, "'Instalatéři' should be in Řemesla"
        
        # Test some specific Služby items
        assert "AI služby" in sluzby, "'AI služby' should be in Služby"
        assert "IT, software" in sluzby, "'IT, software' should be in Služby"
        assert "Úklidové práce" in sluzby, "'Úklidové práce' should be in Služby"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
