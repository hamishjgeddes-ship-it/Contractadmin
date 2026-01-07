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
        self.document_id = None
        self.assistance_request_id = None
        # Construction Program IDs
        self.task_id = None
        self.subcontractor_id = None
        self.subcontract_id = None

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
        """Test project creation with new fields"""
        try:
            project_data = {
                "name": "Test Project - Contract Compliance",
                "client_name": "Test Client Corp",
                "client_email": "client@testcorp.com",
                "contract_type": "AS4000",
                "description": "Test project for contract compliance portal",
                "starting_value": 1000000.0,
                "current_value": 1050000.0,
                "start_date": "2024-01-15",
                "original_completion_date": "2024-12-31",
                "current_completion_date": "2025-01-15",
                "location": "Melbourne CBD",
                "owner": "ABC Development Corp",
                "builder": "XYZ Construction Ltd",
                "subcontractors": "Electrical Co\nPlumbing Co\nConcrete Co",
                "client_team_members": "John Smith - Project Manager\nJane Doe - Site Engineer",
                "bc_team_members": "Mike Johnson - Contract Admin\nSarah Wilson - Legal Advisor"
            }
            response = requests.post(f"{self.api_url}/projects", json=project_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.project_id = data.get('project_id')
                details += f", Project ID: {self.project_id}"
                # Verify new fields are saved
                if data.get('location') == "Melbourne CBD" and data.get('owner') == "ABC Development Corp":
                    details += ", New fields saved correctly"
                else:
                    details += ", WARNING: New fields may not be saved"
            return self.log_test("Create Project with New Fields", success, details)
        except Exception as e:
            return self.log_test("Create Project with New Fields", False, f"Error: {str(e)}")

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

    def test_list_documents(self):
        """Test listing documents"""
        try:
            response = requests.get(f"{self.api_url}/documents", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} documents"
            return self.log_test("List Documents", success, details)
        except Exception as e:
            return self.log_test("List Documents", False, f"Error: {str(e)}")

    def test_create_assistance_request(self):
        """Test creating assistance request"""
        if not self.project_id:
            return self.log_test("Create Assistance Request", False, "No project ID available")
        
        try:
            request_data = {
                "project_id": self.project_id,
                "subject": "Test Assistance Request",
                "message": "Need help with contract interpretation for variation claim",
                "priority": "normal"
            }
            response = requests.post(f"{self.api_url}/assistance-requests", json=request_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.assistance_request_id = data.get('request_id')
                details += f", Request ID: {self.assistance_request_id}"
            return self.log_test("Create Assistance Request", success, details)
        except Exception as e:
            return self.log_test("Create Assistance Request", False, f"Error: {str(e)}")

    def test_list_assistance_requests(self):
        """Test listing assistance requests"""
        try:
            response = requests.get(f"{self.api_url}/assistance-requests", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} requests"
            return self.log_test("List Assistance Requests", success, details)
        except Exception as e:
            return self.log_test("List Assistance Requests", False, f"Error: {str(e)}")

    def test_available_integrations(self):
        """Test available integrations endpoint"""
        try:
            response = requests.get(f"{self.api_url}/integrations/available", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                integrations = data.get('integrations', [])
                details += f", Count: {len(integrations)} integrations"
            return self.log_test("Available Integrations", success, details)
        except Exception as e:
            return self.log_test("Available Integrations", False, f"Error: {str(e)}")

    def test_project_summary(self):
        """Test project summary endpoint"""
        if not self.project_id:
            return self.log_test("Project Summary", False, "No project ID available")
        
        try:
            response = requests.get(f"{self.api_url}/projects/{self.project_id}/summary", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                outstanding = data.get('outstanding', {})
                details += f", Outstanding items: {outstanding.get('total_action_items', 0)}"
            return self.log_test("Project Summary", success, details)
        except Exception as e:
            return self.log_test("Project Summary", False, f"Error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Build Compliance Portal Backend Tests")
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
        
        # Document library tests
        self.test_list_documents()
        
        # Assistance request tests
        self.test_create_assistance_request()
        self.test_list_assistance_requests()
        
        # Integration tests
        self.test_available_integrations()
        
        # Project summary tests
        self.test_project_summary()
        
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
    tester = BuildCompliancePortalTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())