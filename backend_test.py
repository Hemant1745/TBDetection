#!/usr/bin/env python3
"""
Backend API Testing for TB Detection System
Tests all authentication and application endpoints
"""

import requests
import sys
import json
import io
import base64
from datetime import datetime
from PIL import Image
import numpy as np

class TBDetectionAPITester:
    def __init__(self, base_url="https://xray-diagnosis-ai.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.access_token = None
        self.refresh_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        
        # Add Authorization header if we have a token
        headers = {}
        if self.access_token:
            headers['Authorization'] = f'Bearer {self.access_token}'
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = self.session.post(url, data=data, files=files, headers=headers)
                else:
                    response = self.session.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, None

    def create_test_image(self):
        """Create a test chest X-ray image"""
        # Create a simple grayscale image that looks like an X-ray
        img = np.random.randint(50, 200, (224, 224, 3), dtype=np.uint8)
        # Add some chest-like structure
        img[50:170, 60:160] = np.random.randint(80, 150, (120, 100, 3))
        
        pil_img = Image.fromarray(img)
        img_buffer = io.BytesIO()
        pil_img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        return img_buffer

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n🔐 Testing Authentication Flow...")
        
        # First try admin login to ensure we have working auth
        admin_success = self.test_admin_login()
        if not admin_success:
            print("Admin login failed, trying registration...")
            
            # Test registration
            register_data = {
                "name": "Test User",
                "email": f"test_{datetime.now().strftime('%H%M%S')}@example.com",
                "password": "testpass123"
            }
            
            success, response = self.run_test(
                "User Registration",
                "POST",
                "auth/register",
                200,
                data=register_data
            )
            
            if success and response:
                try:
                    result = response.json()
                    # Store tokens for subsequent requests
                    self.access_token = result.get('access_token')
                    self.refresh_token = result.get('refresh_token')
                    
                    if not self.access_token:
                        self.log_test("Registration Token Storage", False, "No access_token in response")
                        return False
                    else:
                        self.log_test("Registration Token Storage", True, "Access token received and stored")
                        
                except Exception as e:
                    self.log_test("Registration Token Storage", False, f"JSON parse error: {str(e)}")
                    return False
            
            if not success:
                return False
        
        # Test /auth/me (should work after login/registration)
        success, response = self.run_test(
            "Get Current User",
            "GET", 
            "auth/me",
            200
        )
        
        return success

    def test_admin_login(self):
        """Test admin login and store tokens"""
        login_data = {
            "email": "admin@example.com",
            "password": "admin123"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and response:
            try:
                result = response.json()
                # Store tokens for subsequent requests
                self.access_token = result.get('access_token')
                self.refresh_token = result.get('refresh_token')
                
                if not self.access_token:
                    self.log_test("Token Storage", False, "No access_token in response")
                    return False
                else:
                    self.log_test("Token Storage", True, "Access token received and stored")
                
                # Test /auth/me after login
                success, response = self.run_test(
                    "Get Admin User Info",
                    "GET",
                    "auth/me", 
                    200
                )
                
            except Exception as e:
                self.log_test("Token Storage", False, f"JSON parse error: {str(e)}")
                return False
        
        return success

    def test_prediction_flow(self):
        """Test TB prediction with image upload"""
        print("\n🧠 Testing AI Prediction Flow...")
        
        # Create test image
        test_image = self.create_test_image()
        
        # Test prediction endpoint
        files = {'file': ('test_xray.png', test_image, 'image/png')}
        
        try:
            url = f"{self.base_url}/predict"
            headers = {}
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'
                
            response = self.session.post(url, files=files, headers=headers)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    result = response.json()
                    required_fields = ['id', 'probability', 'result', 'severity', 'original_image']
                    missing_fields = [f for f in required_fields if f not in result]
                    
                    if missing_fields:
                        success = False
                        details += f", Missing fields: {missing_fields}"
                    else:
                        details += f", Probability: {result['probability']:.3f}, Result: {result['result']}"
                        # Store scan ID for later tests
                        self.scan_id = result['id']
                        
                except Exception as e:
                    success = False
                    details += f", JSON parse error: {str(e)}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test("TB Prediction with Image Upload", success, details)
            return success
            
        except Exception as e:
            self.log_test("TB Prediction with Image Upload", False, f"Exception: {str(e)}")
            return False

    def test_stats_and_scans(self):
        """Test stats and scans endpoints"""
        print("\n📊 Testing Stats and Scans...")
        
        # Test stats
        success, response = self.run_test(
            "Get User Stats",
            "GET",
            "stats",
            200
        )
        
        if success and response:
            try:
                stats = response.json()
                required_stats = ['total_scans', 'tb_detected', 'normal_cases', 'possible_tb']
                missing_stats = [s for s in required_stats if s not in stats]
                if missing_stats:
                    self.log_test("Stats Content Validation", False, f"Missing: {missing_stats}")
                else:
                    self.log_test("Stats Content Validation", True, f"All stats present")
            except:
                self.log_test("Stats Content Validation", False, "Invalid JSON response")
        
        # Test scans list
        success, response = self.run_test(
            "Get Scans List",
            "GET",
            "scans",
            200
        )
        
        # Test individual scan if we have a scan_id
        if hasattr(self, 'scan_id'):
            success, response = self.run_test(
                "Get Individual Scan",
                "GET",
                f"scans/{self.scan_id}",
                200
            )

    def test_report_generation(self):
        """Test PDF report generation"""
        print("\n📄 Testing Report Generation...")
        
        if not hasattr(self, 'scan_id'):
            self.log_test("PDF Report Generation", False, "No scan ID available")
            return False
        
        try:
            url = f"{self.base_url}/report/{self.scan_id}?patient_name=Test Patient&patient_age=30&patient_gender=M"
            headers = {}
            if self.access_token:
                headers['Authorization'] = f'Bearer {self.access_token}'
                
            response = self.session.get(url, headers=headers)
            
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            details = f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type', 'unknown')}"
            
            if success:
                details += f", PDF Size: {len(response.content)} bytes"
            
            self.log_test("PDF Report Generation", success, details)
            return success
            
        except Exception as e:
            self.log_test("PDF Report Generation", False, f"Exception: {str(e)}")
            return False

    def test_auth_protection(self):
        """Test that protected endpoints require authentication"""
        print("\n🔒 Testing Auth Protection...")
        
        # Create new session without auth
        unauth_session = requests.Session()
        
        protected_endpoints = [
            ("GET", "auth/me"),
            ("GET", "stats"), 
            ("GET", "scans"),
            ("POST", "predict")
        ]
        
        for method, endpoint in protected_endpoints:
            try:
                url = f"{self.base_url}/{endpoint}"
                if method == "GET":
                    response = unauth_session.get(url)
                else:
                    response = unauth_session.post(url)
                
                success = response.status_code == 401
                details = f"Status: {response.status_code} (expected 401)"
                
                self.log_test(f"Auth Protection - {method} {endpoint}", success, details)
                
            except Exception as e:
                self.log_test(f"Auth Protection - {method} {endpoint}", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting TB Detection API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test auth flow
        auth_success = self.test_auth_flow()
        
        if auth_success:
            # Test prediction flow
            self.test_prediction_flow()
            
            # Test stats and scans
            self.test_stats_and_scans()
            
            # Test report generation
            self.test_report_generation()
        
        # Test auth protection (always run)
        self.test_auth_protection()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1

def main():
    tester = TBDetectionAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())