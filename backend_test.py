#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class BuildCompliancePortalTester:
    def __init__(self, base_url="https://projectguard.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = "test_session_1767745066182"  # From MongoDB setup
        self.user_id = "test-user-1767745066182"
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }
        self.tests_run = 0
        self.tests_passed = 0
        self.project_id = None
        self.deadline_id = None
        self.notice_id = None
        self.questionnaire_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED {details}")
        else:
            print(f"❌ {name} - FAILED {details}")
        return success

    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            return self.log_test("Health Check", success, details)
        except Exception as e:
            return self.log_test("Health Check", False, f"Error: {str(e)}")

    def test_auth_me(self):
        """Test authentication endpoint"""
        try:
            response = requests.get(f"{self.api_url}/auth/me", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", User: {data.get('name', 'Unknown')}, Role: {data.get('role', 'Unknown')}"
            return self.log_test("Authentication (/auth/me)", success, details)
        except Exception as e:
            return self.log_test("Authentication (/auth/me)", False, f"Error: {str(e)}")

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        try:
            response = requests.get(f"{self.api_url}/dashboard/stats", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Projects: {data.get('total_projects', 0)}, Deadlines: {data.get('pending_deadlines', 0)}"
            return self.log_test("Dashboard Stats", success, details)
        except Exception as e:
            return self.log_test("Dashboard Stats", False, f"Error: {str(e)}")

    def test_create_project(self):
        """Test project creation"""
        try:
            project_data = {
                "name": "Test Project - Contract Compliance",
                "client_name": "Test Client Corp",
                "client_email": "client@testcorp.com",
                "contract_type": "AS4000",
                "description": "Test project for contract compliance portal"
            }
            response = requests.post(f"{self.api_url}/projects", json=project_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.project_id = data.get('project_id')
                details += f", Project ID: {self.project_id}"
            return self.log_test("Create Project", success, details)
        except Exception as e:
            return self.log_test("Create Project", False, f"Error: {str(e)}")

    def test_list_projects(self):
        """Test listing projects"""
        try:
            response = requests.get(f"{self.api_url}/projects", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} projects"
            return self.log_test("List Projects", success, details)
        except Exception as e:
            return self.log_test("List Projects", False, f"Error: {str(e)}")

    def test_create_deadline(self):
        """Test deadline creation"""
        if not self.project_id:
            return self.log_test("Create Deadline", False, "No project ID available")
        
        try:
            deadline_data = {
                "project_id": self.project_id,
                "title": "Test Deadline - EOT Response",
                "description": "Test deadline for extension of time response",
                "due_date": (datetime.now() + timedelta(days=14)).isoformat(),
                "priority": "high"
            }
            response = requests.post(f"{self.api_url}/deadlines", json=deadline_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.deadline_id = data.get('deadline_id')
                details += f", Deadline ID: {self.deadline_id}"
            return self.log_test("Create Deadline", success, details)
        except Exception as e:
            return self.log_test("Create Deadline", False, f"Error: {str(e)}")

    def test_list_deadlines(self):
        """Test listing deadlines"""
        try:
            response = requests.get(f"{self.api_url}/deadlines", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} deadlines"
            return self.log_test("List Deadlines", success, details)
        except Exception as e:
            return self.log_test("List Deadlines", False, f"Error: {str(e)}")

    def test_create_notice(self):
        """Test notice creation"""
        if not self.project_id:
            return self.log_test("Create Notice", False, "No project ID available")
        
        try:
            notice_data = {
                "project_id": self.project_id,
                "title": "Test Notice - Variation Claim",
                "notice_type": "variation",
                "content": "This is a test notice for variation claim under the contract terms.",
                "recipient_email": "client@testcorp.com"
            }
            response = requests.post(f"{self.api_url}/notices", json=notice_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.notice_id = data.get('notice_id')
                details += f", Notice ID: {self.notice_id}"
            return self.log_test("Create Notice", success, details)
        except Exception as e:
            return self.log_test("Create Notice", False, f"Error: {str(e)}")

    def test_list_notices(self):
        """Test listing notices"""
        try:
            response = requests.get(f"{self.api_url}/notices", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} notices"
            return self.log_test("List Notices", success, details)
        except Exception as e:
            return self.log_test("List Notices", False, f"Error: {str(e)}")

    def test_create_questionnaire(self):
        """Test questionnaire creation"""
        if not self.project_id:
            return self.log_test("Create Questionnaire", False, "No project ID available")
        
        try:
            questionnaire_data = {
                "project_id": self.project_id,
                "title": "Test Questionnaire - Latent Conditions",
                "category": "latent_conditions",
                "questions": [
                    {"id": 1, "text": "Were any unexpected site conditions encountered?", "type": "text"},
                    {"id": 2, "text": "What was the nature of the latent condition?", "type": "text"},
                    {"id": 3, "text": "What additional costs were incurred?", "type": "text"}
                ]
            }
            response = requests.post(f"{self.api_url}/questionnaires", json=questionnaire_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.questionnaire_id = data.get('questionnaire_id')
                details += f", Questionnaire ID: {self.questionnaire_id}"
            return self.log_test("Create Questionnaire", success, details)
        except Exception as e:
            return self.log_test("Create Questionnaire", False, f"Error: {str(e)}")

    def test_list_questionnaires(self):
        """Test listing questionnaires"""
        try:
            response = requests.get(f"{self.api_url}/questionnaires", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} questionnaires"
            return self.log_test("List Questionnaires", success, details)
        except Exception as e:
            return self.log_test("List Questionnaires", False, f"Error: {str(e)}")

    def test_list_notifications(self):
        """Test listing notifications"""
        try:
            response = requests.get(f"{self.api_url}/notifications", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} notifications"
            return self.log_test("List Notifications", success, details)
        except Exception as e:
            return self.log_test("List Notifications", False, f"Error: {str(e)}")

    def test_list_users(self):
        """Test listing users (lawyer/admin only)"""
        try:
            response = requests.get(f"{self.api_url}/users", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} users"
            return self.log_test("List Users", success, details)
        except Exception as e:
            return self.log_test("List Users", False, f"Error: {str(e)}")

    def test_issue_notice(self):
        """Test issuing a notice"""
        if not self.notice_id:
            return self.log_test("Issue Notice", False, "No notice ID available")
        
        try:
            response = requests.post(f"{self.api_url}/notices/{self.notice_id}/issue", json={}, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            return self.log_test("Issue Notice", success, details)
        except Exception as e:
            return self.log_test("Issue Notice", False, f"Error: {str(e)}")

    def test_complete_deadline(self):
        """Test completing a deadline"""
        if not self.deadline_id:
            return self.log_test("Complete Deadline", False, "No deadline ID available")
        
        try:
            response = requests.patch(f"{self.api_url}/deadlines/{self.deadline_id}", 
                                    json={"status": "completed"}, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            return self.log_test("Complete Deadline", success, details)
        except Exception as e:
            return self.log_test("Complete Deadline", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting MLA Contract Compliance Portal Backend Tests")
        print("=" * 60)
        
        # Basic health and auth tests
        self.test_health_check()
        self.test_auth_me()
        self.test_dashboard_stats()
        
        # Project management tests
        self.test_create_project()
        self.test_list_projects()
        
        # Deadline management tests
        self.test_create_deadline()
        self.test_list_deadlines()
        
        # Notice management tests
        self.test_create_notice()
        self.test_list_notices()
        
        # Questionnaire management tests
        self.test_create_questionnaire()
        self.test_list_questionnaires()
        
        # Notification tests
        self.test_list_notifications()
        
        # User management tests
        self.test_list_users()
        
        # Workflow tests
        self.test_issue_notice()
        self.test_complete_deadline()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed. Check the logs above.")
            return 1

def main():
    """Main test runner"""
    tester = MLAPortalTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())