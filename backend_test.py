#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class BuildCompliancePortalTester:
    def __init__(self, base_url="https://compliance-dash-14.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = "test_session_1767843667274"  # From MongoDB setup
        self.user_id = "test-user-1767843667274"
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
        # Enhanced Dashboard IDs
        self.trigger_id = None
        self.event_id = None

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

    # ============ ENHANCED DASHBOARD TESTS ============

    def test_seed_default_triggers(self):
        """Test seeding default construction triggers"""
        try:
            response = requests.post(f"{self.api_url}/triggers/seed-defaults", json={}, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                created_count = data.get('created_count', 0)
                total_defaults = data.get('total_defaults', 0)
                details += f", Created: {created_count}/{total_defaults} triggers"
            return self.log_test("Seed Default Triggers", success, details)
        except Exception as e:
            return self.log_test("Seed Default Triggers", False, f"Error: {str(e)}")

    def test_list_triggers(self):
        """Test listing all trigger templates"""
        try:
            response = requests.get(f"{self.api_url}/triggers", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} triggers"
                # Check for some expected default triggers
                trigger_names = [t.get('name', '') for t in data]
                if 'Delay Notice Required' in trigger_names and 'Variation Claim Due' in trigger_names:
                    details += ", Default triggers found"
                else:
                    details += ", WARNING: Some default triggers missing"
            return self.log_test("List Triggers", success, details)
        except Exception as e:
            return self.log_test("List Triggers", False, f"Error: {str(e)}")

    def test_create_custom_trigger(self):
        """Test creating a custom trigger template"""
        try:
            trigger_data = {
                "name": "Test Custom Trigger",
                "event_type": "general",
                "description": "Custom trigger for testing purposes",
                "importance": "medium",
                "next_steps": "Complete test action",
                "outcome": "Test outcome",
                "days_to_orange": 5,
                "days_to_red": 2,
                "causes_red_flag": True,
                "requires_due_date": True,
                "requires_value": False,
                "min_value_for_red": 0.0
            }
            response = requests.post(f"{self.api_url}/triggers", json=trigger_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.trigger_id = data.get('trigger_id')
                details += f", Trigger ID: {self.trigger_id}"
                # Verify it's not a system trigger
                if not data.get('is_system', False):
                    details += ", Custom trigger created correctly"
                else:
                    details += ", WARNING: Custom trigger marked as system"
            return self.log_test("Create Custom Trigger", success, details)
        except Exception as e:
            return self.log_test("Create Custom Trigger", False, f"Error: {str(e)}")

    def test_update_trigger(self):
        """Test updating a custom trigger template"""
        if not self.trigger_id:
            return self.log_test("Update Trigger", False, "No trigger ID available")
        
        try:
            update_data = {
                "description": "Updated test trigger description",
                "days_to_orange": 10,
                "days_to_red": 3
            }
            response = requests.patch(f"{self.api_url}/triggers/{self.trigger_id}", json=update_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            return self.log_test("Update Trigger", success, details)
        except Exception as e:
            return self.log_test("Update Trigger", False, f"Error: {str(e)}")

    def test_get_trigger(self):
        """Test getting a specific trigger template"""
        if not self.trigger_id:
            return self.log_test("Get Trigger", False, "No trigger ID available")
        
        try:
            response = requests.get(f"{self.api_url}/triggers/{self.trigger_id}", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Name: {data.get('name', 'Unknown')}"
            return self.log_test("Get Trigger", success, details)
        except Exception as e:
            return self.log_test("Get Trigger", False, f"Error: {str(e)}")

    def test_delete_custom_trigger(self):
        """Test deleting a custom trigger (should work)"""
        if not self.trigger_id:
            return self.log_test("Delete Custom Trigger", False, "No trigger ID available")
        
        try:
            response = requests.delete(f"{self.api_url}/triggers/{self.trigger_id}", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            return self.log_test("Delete Custom Trigger", success, details)
        except Exception as e:
            return self.log_test("Delete Custom Trigger", False, f"Error: {str(e)}")

    def test_delete_system_trigger_fails(self):
        """Test that deleting system triggers fails"""
        try:
            # First get a system trigger ID
            response = requests.get(f"{self.api_url}/triggers", headers=self.headers, timeout=10)
            if response.status_code != 200:
                return self.log_test("Delete System Trigger (Should Fail)", False, "Could not get triggers list")
            
            triggers = response.json()
            system_trigger = next((t for t in triggers if t.get('is_system', False)), None)
            if not system_trigger:
                return self.log_test("Delete System Trigger (Should Fail)", False, "No system triggers found")
            
            # Try to delete system trigger - should fail
            response = requests.delete(f"{self.api_url}/triggers/{system_trigger['trigger_id']}", headers=self.headers, timeout=10)
            success = response.status_code == 403  # Should be forbidden
            details = f"Status: {response.status_code} (Expected 403)"
            if success:
                details += ", Correctly prevented system trigger deletion"
            return self.log_test("Delete System Trigger (Should Fail)", success, details)
        except Exception as e:
            return self.log_test("Delete System Trigger (Should Fail)", False, f"Error: {str(e)}")

    def test_create_project_event(self):
        """Test creating a project event with trigger"""
        if not self.project_id:
            return self.log_test("Create Project Event", False, "No project ID available")
        
        try:
            # First get a trigger to use
            response = requests.get(f"{self.api_url}/triggers", headers=self.headers, timeout=10)
            if response.status_code != 200:
                return self.log_test("Create Project Event", False, "Could not get triggers list")
            
            triggers = response.json()
            if not triggers:
                return self.log_test("Create Project Event", False, "No triggers available")
            
            trigger = triggers[0]  # Use first available trigger
            
            # Create event with due date in 14 days (should be green)
            event_data = {
                "project_id": self.project_id,
                "trigger_id": trigger['trigger_id'],
                "title": "Test Event - Green Status",
                "description": "Test event for status color calculation",
                "due_date": (datetime.now() + timedelta(days=14)).isoformat(),
                "value": 5000.0,
                "notes": "Test event notes"
            }
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/events", json=event_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.event_id = data.get('event_id')
                status_color = data.get('status_color', 'unknown')
                details += f", Event ID: {self.event_id}, Status Color: {status_color}"
                if status_color == 'green':
                    details += " (Correct - 14 days out)"
                else:
                    details += f" (Expected green for 14 days out)"
            return self.log_test("Create Project Event", success, details)
        except Exception as e:
            return self.log_test("Create Project Event", False, f"Error: {str(e)}")

    def test_list_project_events(self):
        """Test listing project events with calculated status colors"""
        if not self.project_id:
            return self.log_test("List Project Events", False, "No project ID available")
        
        try:
            response = requests.get(f"{self.api_url}/projects/{self.project_id}/events", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} events"
                if data:
                    # Check if status colors are calculated
                    colors = [e.get('status_color') for e in data]
                    details += f", Colors: {set(colors)}"
            return self.log_test("List Project Events", success, details)
        except Exception as e:
            return self.log_test("List Project Events", False, f"Error: {str(e)}")

    def test_status_color_scenarios(self):
        """Test different status color calculation scenarios"""
        if not self.project_id:
            return self.log_test("Status Color Scenarios", False, "No project ID available")
        
        try:
            # Get a trigger for testing
            response = requests.get(f"{self.api_url}/triggers", headers=self.headers, timeout=10)
            if response.status_code != 200:
                return self.log_test("Status Color Scenarios", False, "Could not get triggers")
            
            triggers = response.json()
            if not triggers:
                return self.log_test("Status Color Scenarios", False, "No triggers available")
            
            trigger = triggers[0]
            scenario_results = []
            
            # Scenario 1: Orange status (5 days out, default threshold 7 days)
            event_data = {
                "project_id": self.project_id,
                "trigger_id": trigger['trigger_id'],
                "title": "Test Event - Orange Status",
                "due_date": (datetime.now() + timedelta(days=5)).isoformat(),
                "value": 1000.0
            }
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/events", json=event_data, headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                color = data.get('status_color', 'unknown')
                scenario_results.append(f"5 days out: {color}")
            
            # Scenario 2: Red status (overdue)
            event_data = {
                "project_id": self.project_id,
                "trigger_id": trigger['trigger_id'],
                "title": "Test Event - Red Status",
                "due_date": (datetime.now() - timedelta(days=1)).isoformat(),
                "value": 1000.0
            }
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/events", json=event_data, headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                color = data.get('status_color', 'unknown')
                scenario_results.append(f"Overdue: {color}")
            
            # Scenario 3: Test trigger that doesn't cause red flag
            non_red_trigger = next((t for t in triggers if not t.get('causes_red_flag', True)), None)
            if non_red_trigger:
                event_data = {
                    "project_id": self.project_id,
                    "trigger_id": non_red_trigger['trigger_id'],
                    "title": "Test Event - No Red Flag",
                    "due_date": (datetime.now() - timedelta(days=1)).isoformat()
                }
                response = requests.post(f"{self.api_url}/projects/{self.project_id}/events", json=event_data, headers=self.headers, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    color = data.get('status_color', 'unknown')
                    scenario_results.append(f"No red flag trigger overdue: {color}")
            
            success = len(scenario_results) > 0
            details = f"Scenarios tested: {'; '.join(scenario_results)}"
            return self.log_test("Status Color Scenarios", success, details)
        except Exception as e:
            return self.log_test("Status Color Scenarios", False, f"Error: {str(e)}")

    def test_update_project_event(self):
        """Test updating a project event and status transitions"""
        if not self.project_id or not self.event_id:
            return self.log_test("Update Project Event", False, "No project ID or event ID available")
        
        try:
            # Test completing an event (should turn green)
            update_data = {
                "status": "completed",
                "notes": "Event completed during testing"
            }
            response = requests.patch(f"{self.api_url}/projects/{self.project_id}/events/{self.event_id}", 
                                    json=update_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                # Verify the event is now completed by getting the events list
                response = requests.get(f"{self.api_url}/projects/{self.project_id}/events", headers=self.headers, timeout=10)
                if response.status_code == 200:
                    events = response.json()
                    updated_event = next((e for e in events if e['event_id'] == self.event_id), None)
                    if updated_event:
                        status = updated_event.get('status')
                        color = updated_event.get('status_color')
                        details += f", Status: {status}, Color: {color}"
                        if status == 'completed' and color == 'green':
                            details += " (Correct - completed events are green)"
            
            return self.log_test("Update Project Event", success, details)
        except Exception as e:
            return self.log_test("Update Project Event", False, f"Error: {str(e)}")

    def test_manual_status_override(self):
        """Test manual status override functionality"""
        if not self.project_id or not self.event_id:
            return self.log_test("Manual Status Override", False, "No project ID or event ID available")
        
        try:
            # Test manual override to orange
            update_data = {
                "manual_status_override": "orange",
                "override_reason": "Manual override for testing"
            }
            response = requests.patch(f"{self.api_url}/projects/{self.project_id}/events/{self.event_id}", 
                                    json=update_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                # Verify the override worked
                response = requests.get(f"{self.api_url}/projects/{self.project_id}/events", headers=self.headers, timeout=10)
                if response.status_code == 200:
                    events = response.json()
                    updated_event = next((e for e in events if e['event_id'] == self.event_id), None)
                    if updated_event:
                        override = updated_event.get('manual_status_override')
                        color = updated_event.get('status_color')
                        details += f", Override: {override}, Color: {color}"
                        if override == 'orange' and color == 'orange':
                            details += " (Override working correctly)"
            
            return self.log_test("Manual Status Override", success, details)
        except Exception as e:
            return self.log_test("Manual Status Override", False, f"Error: {str(e)}")

    def test_delete_project_event(self):
        """Test deleting a project event"""
        if not self.project_id or not self.event_id:
            return self.log_test("Delete Project Event", False, "No project ID or event ID available")
        
        try:
            response = requests.delete(f"{self.api_url}/projects/{self.project_id}/events/{self.event_id}", 
                                     headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            return self.log_test("Delete Project Event", success, details)
        except Exception as e:
            return self.log_test("Delete Project Event", False, f"Error: {str(e)}")

    def test_list_clients(self):
        """Test listing clients with aggregated data"""
        try:
            response = requests.get(f"{self.api_url}/clients", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} clients"
                if data:
                    # Check if aggregated fields are present
                    client = data[0]
                    fields = ['client_name', 'project_count', 'action_items', 'overdue_items']
                    present_fields = [f for f in fields if f in client]
                    details += f", Fields: {present_fields}"
            return self.log_test("List Clients", success, details)
        except Exception as e:
            return self.log_test("List Clients", False, f"Error: {str(e)}")

    def test_projects_with_status(self):
        """Test listing projects with calculated status colors"""
        try:
            response = requests.get(f"{self.api_url}/projects/with-status", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} projects"
                if data:
                    # Check if status fields are present
                    project = data[0]
                    status_fields = ['status_color', 'next_due_date', 'pending_events_count']
                    present_fields = [f for f in status_fields if f in project]
                    details += f", Status fields: {present_fields}"
                    
                    # Check status colors
                    colors = [p.get('status_color') for p in data]
                    unique_colors = set(colors)
                    details += f", Colors: {unique_colors}"
            return self.log_test("Projects with Status", success, details)
        except Exception as e:
            return self.log_test("Projects with Status", False, f"Error: {str(e)}")

    def test_project_status(self):
        """Test getting individual project status"""
        if not self.project_id:
            return self.log_test("Project Status", False, "No project ID available")
        
        try:
            response = requests.get(f"{self.api_url}/projects/{self.project_id}/status", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                overall_status = data.get('overall_status', 'unknown')
                red_count = data.get('red_events_count', 0)
                orange_count = data.get('orange_events_count', 0)
                pending_count = data.get('total_pending_events', 0)
                details += f", Overall: {overall_status}, Red: {red_count}, Orange: {orange_count}, Pending: {pending_count}"
            return self.log_test("Project Status", success, details)
        except Exception as e:
            return self.log_test("Project Status", False, f"Error: {str(e)}")

    # ============ CONSTRUCTION PROGRAM TESTS ============

    def test_get_program_tasks(self):
        """Test getting program tasks for a project"""
        if not self.project_id:
            return self.log_test("Get Program Tasks", False, "No project ID available")
        
        try:
            response = requests.get(f"{self.api_url}/projects/{self.project_id}/program", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} tasks"
            return self.log_test("Get Program Tasks", success, details)
        except Exception as e:
            return self.log_test("Get Program Tasks", False, f"Error: {str(e)}")

    def test_create_program_task(self):
        """Test creating a program task"""
        if not self.project_id:
            return self.log_test("Create Program Task", False, "No project ID available")
        
        try:
            task_data = {
                "project_id": self.project_id,
                "name": "Foundation Works",
                "description": "Excavation and concrete foundation work",
                "start_date": "2024-02-01",
                "end_date": "2024-02-28",
                "color": "#3b82f6"
            }
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/program", json=task_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.task_id = data.get('task_id')
                details += f", Task ID: {self.task_id}"
            return self.log_test("Create Program Task", success, details)
        except Exception as e:
            return self.log_test("Create Program Task", False, f"Error: {str(e)}")

    def test_update_program_task(self):
        """Test updating a program task"""
        if not self.project_id or not self.task_id:
            return self.log_test("Update Program Task", False, "No project ID or task ID available")
        
        try:
            update_data = {"progress": 50, "status": "in_progress"}
            response = requests.patch(f"{self.api_url}/projects/{self.project_id}/program/{self.task_id}", 
                                    json=update_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            return self.log_test("Update Program Task", success, details)
        except Exception as e:
            return self.log_test("Update Program Task", False, f"Error: {str(e)}")

    def test_create_subcontractor(self):
        """Test creating and inviting a subcontractor"""
        if not self.project_id:
            return self.log_test("Create Subcontractor", False, "No project ID available")
        
        try:
            subcontractor_data = {
                "project_id": self.project_id,
                "company_name": "ABC Electrical Services",
                "contact_name": "John Smith",
                "email": "john@abcelectrical.com",
                "phone": "+61 400 123 456",
                "trade": "Electrical"
            }
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/subcontractors", 
                                   json=subcontractor_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.subcontractor_id = data.get('subcontractor_id')
                details += f", Subcontractor ID: {self.subcontractor_id}"
            return self.log_test("Create Subcontractor", success, details)
        except Exception as e:
            return self.log_test("Create Subcontractor", False, f"Error: {str(e)}")

    def test_list_subcontractors(self):
        """Test listing subcontractors for a project"""
        if not self.project_id:
            return self.log_test("List Subcontractors", False, "No project ID available")
        
        try:
            response = requests.get(f"{self.api_url}/projects/{self.project_id}/subcontractors", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} subcontractors"
            return self.log_test("List Subcontractors", success, details)
        except Exception as e:
            return self.log_test("List Subcontractors", False, f"Error: {str(e)}")

    def test_create_subcontract(self):
        """Test creating a draft subcontract"""
        if not self.project_id or not self.subcontractor_id:
            return self.log_test("Create Subcontract", False, "No project ID or subcontractor ID available")
        
        try:
            subcontract_data = {
                "project_id": self.project_id,
                "subcontractor_id": self.subcontractor_id,
                "title": "Electrical Works Subcontract",
                "contract_value": 150000.0,
                "scope_of_work": "Complete electrical installation including power, lighting, and data systems",
                "terms": "Standard AS4000 subcontract terms apply"
            }
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/subcontracts", 
                                   json=subcontract_data, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                self.subcontract_id = data.get('subcontract_id')
                details += f", Subcontract ID: {self.subcontract_id}"
            return self.log_test("Create Subcontract", success, details)
        except Exception as e:
            return self.log_test("Create Subcontract", False, f"Error: {str(e)}")

    def test_list_subcontracts(self):
        """Test listing subcontracts for a project"""
        if not self.project_id:
            return self.log_test("List Subcontracts", False, "No project ID available")
        
        try:
            response = requests.get(f"{self.api_url}/projects/{self.project_id}/subcontracts", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} subcontracts"
            return self.log_test("List Subcontracts", success, details)
        except Exception as e:
            return self.log_test("List Subcontracts", False, f"Error: {str(e)}")

    def test_issue_subcontract(self):
        """Test issuing a subcontract"""
        if not self.project_id or not self.subcontract_id:
            return self.log_test("Issue Subcontract", False, "No project ID or subcontract ID available")
        
        try:
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/subcontracts/{self.subcontract_id}/issue", 
                                   json={}, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            return self.log_test("Issue Subcontract", success, details)
        except Exception as e:
            return self.log_test("Issue Subcontract", False, f"Error: {str(e)}")

    def test_sign_subcontract(self):
        """Test signing a subcontract"""
        if not self.project_id or not self.subcontract_id:
            return self.log_test("Sign Subcontract", False, "No project ID or subcontract ID available")
        
        try:
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/subcontracts/{self.subcontract_id}/sign", 
                                   json={}, headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            return self.log_test("Sign Subcontract", success, details)
        except Exception as e:
            return self.log_test("Sign Subcontract", False, f"Error: {str(e)}")

    def test_list_claim_templates(self):
        """Test listing claim templates for a project"""
        if not self.project_id:
            return self.log_test("List Claim Templates", False, "No project ID available")
        
        try:
            response = requests.get(f"{self.api_url}/projects/{self.project_id}/templates", headers=self.headers, timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Count: {len(data)} templates"
            return self.log_test("List Claim Templates", success, details)
        except Exception as e:
            return self.log_test("List Claim Templates", False, f"Error: {str(e)}")

    def test_csv_program_import(self):
        """Test CSV program import functionality"""
        if not self.project_id:
            return self.log_test("CSV Program Import", False, "No project ID available")
        
        try:
            # Create test CSV content
            csv_content = """task_name,start_date,end_date,subcontractor_name,subcontractor_trade,subcontractor_email
Site Preparation,2024-03-01,2024-03-15,Ground Works Ltd,Earthworks,contact@groundworks.com
Foundation Works,2024-03-16,2024-04-30,Concrete Solutions,Concrete,info@concretesolutions.com
Structural Steel,2024-05-01,2024-06-15,Steel Masters,Structural,admin@steelmasters.com
Electrical Rough-in,2024-06-01,2024-07-15,Power Systems,Electrical,jobs@powersystems.com
Plumbing Rough-in,2024-06-01,2024-07-15,Aqua Tech,Plumbing,contact@aquatech.com"""
            
            # Create a temporary file-like object
            import io
            csv_file = io.BytesIO(csv_content.encode('utf-8'))
            
            # Prepare multipart form data
            files = {'file': ('test_program.csv', csv_file, 'text/csv')}
            headers_without_content_type = {k: v for k, v in self.headers.items() if k != 'Content-Type'}
            
            response = requests.post(
                f"{self.api_url}/projects/{self.project_id}/program/import",
                files=files,
                headers=headers_without_content_type,
                timeout=30
            )
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                tasks_created = data.get('tasks_created', 0)
                subcontractors_created = data.get('subcontractors_created', 0)
                errors = data.get('errors', [])
                details += f", Tasks: {tasks_created}, Subcontractors: {subcontractors_created}"
                if errors:
                    details += f", Errors: {len(errors)}"
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Raw response: {response.text[:100]}"
                    
            return self.log_test("CSV Program Import", success, details)
        except Exception as e:
            return self.log_test("CSV Program Import", False, f"Error: {str(e)}")

    def test_issue_subcontract_workflow(self):
        """Test the complete Issue Subcontract workflow from Gantt chart task actions"""
        print("\n🔄 Testing Issue Subcontract Workflow...")
        
        if not self.project_id:
            return self.log_test("Issue Subcontract Workflow", False, "No project ID available")
        
        workflow_success = True
        workflow_details = []
        
        try:
            # Step 1: Create a task without subcontractor assigned
            task_data = {
                "project_id": self.project_id,
                "name": "Roofing Works",
                "description": "Complete roofing installation and waterproofing",
                "start_date": "2024-04-01",
                "end_date": "2024-04-30",
                "color": "#ef4444"
            }
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/program", 
                                   json=task_data, headers=self.headers, timeout=10)
            
            if response.status_code != 200:
                workflow_success = False
                workflow_details.append(f"Failed to create task: {response.status_code}")
            else:
                task_data_response = response.json()
                unassigned_task_id = task_data_response.get('task_id')
                workflow_details.append(f"✅ Created unassigned task: {unassigned_task_id}")
                
                # Step 2: Test PATCH endpoint for assigning subcontractor to task
                # First create a subcontractor for assignment
                subcontractor_data = {
                    "project_id": self.project_id,
                    "company_name": "Roofing Specialists Ltd",
                    "contact_name": "Mike Johnson",
                    "email": "mike@roofingspecialists.com",
                    "phone": "+61 400 987 654",
                    "trade": "Roofing"
                }
                response = requests.post(f"{self.api_url}/projects/{self.project_id}/subcontractors", 
                                       json=subcontractor_data, headers=self.headers, timeout=10)
                
                if response.status_code != 200:
                    workflow_success = False
                    workflow_details.append(f"Failed to create subcontractor: {response.status_code}")
                else:
                    sub_data = response.json()
                    new_subcontractor_id = sub_data.get('subcontractor_id')
                    workflow_details.append(f"✅ Created subcontractor: {new_subcontractor_id}")
                    
                    # Step 3: Test PATCH endpoint to assign subcontractor to task
                    assign_data = {"assigned_subcontractor_id": new_subcontractor_id}
                    response = requests.patch(f"{self.api_url}/projects/{self.project_id}/program/{unassigned_task_id}", 
                                            json=assign_data, headers=self.headers, timeout=10)
                    
                    if response.status_code != 200:
                        workflow_success = False
                        workflow_details.append(f"Failed to assign subcontractor to task: {response.status_code}")
                    else:
                        workflow_details.append("✅ Successfully assigned subcontractor to task")
                        
                        # Step 4: Test POST endpoint to create draft subcontract
                        subcontract_data = {
                            "project_id": self.project_id,
                            "subcontractor_id": new_subcontractor_id,
                            "title": "Roofing Works Subcontract",
                            "contract_value": 85000.0,
                            "scope_of_work": "Complete roofing installation including tiles, gutters, and waterproofing membrane",
                            "start_date": "2024-04-01",
                            "end_date": "2024-04-30",
                            "terms": "Payment terms: 30 days net. AS4000 subcontract conditions apply."
                        }
                        response = requests.post(f"{self.api_url}/projects/{self.project_id}/subcontracts", 
                                               json=subcontract_data, headers=self.headers, timeout=10)
                        
                        if response.status_code != 200:
                            workflow_success = False
                            workflow_details.append(f"Failed to create draft subcontract: {response.status_code}")
                        else:
                            contract_data = response.json()
                            new_subcontract_id = contract_data.get('subcontract_id')
                            workflow_details.append(f"✅ Created draft subcontract: {new_subcontract_id}")
                            
                            # Verify it's in draft status
                            if contract_data.get('status') == 'draft':
                                workflow_details.append("✅ Subcontract created in draft status")
                            else:
                                workflow_success = False
                                workflow_details.append(f"❌ Expected draft status, got: {contract_data.get('status')}")
                            
                            # Step 5: Test POST endpoint to issue subcontract (draft -> issued)
                            response = requests.post(f"{self.api_url}/projects/{self.project_id}/subcontracts/{new_subcontract_id}/issue", 
                                                   json={}, headers=self.headers, timeout=10)
                            
                            if response.status_code != 200:
                                workflow_success = False
                                workflow_details.append(f"Failed to issue subcontract: {response.status_code}")
                            else:
                                workflow_details.append("✅ Successfully issued subcontract")
                                
                                # Verify status changed to issued
                                response = requests.get(f"{self.api_url}/projects/{self.project_id}/subcontracts", 
                                                      headers=self.headers, timeout=10)
                                if response.status_code == 200:
                                    contracts = response.json()
                                    issued_contract = next((c for c in contracts if c['subcontract_id'] == new_subcontract_id), None)
                                    if issued_contract and issued_contract.get('status') == 'issued':
                                        workflow_details.append("✅ Subcontract status changed to issued")
                                    else:
                                        workflow_success = False
                                        workflow_details.append(f"❌ Expected issued status, got: {issued_contract.get('status') if issued_contract else 'not found'}")
                                
                                # Step 6: Test POST endpoint to sign subcontract (issued -> signed)
                                response = requests.post(f"{self.api_url}/projects/{self.project_id}/subcontracts/{new_subcontract_id}/sign", 
                                                       json={}, headers=self.headers, timeout=10)
                                
                                if response.status_code != 200:
                                    workflow_success = False
                                    workflow_details.append(f"Failed to sign subcontract: {response.status_code}")
                                else:
                                    workflow_details.append("✅ Successfully signed subcontract")
                                    
                                    # Verify status changed to signed
                                    response = requests.get(f"{self.api_url}/projects/{self.project_id}/subcontracts", 
                                                          headers=self.headers, timeout=10)
                                    if response.status_code == 200:
                                        contracts = response.json()
                                        signed_contract = next((c for c in contracts if c['subcontract_id'] == new_subcontract_id), None)
                                        if signed_contract and signed_contract.get('status') == 'signed':
                                            workflow_details.append("✅ Subcontract status changed to signed")
                                            workflow_details.append("✅ Complete workflow: draft -> issue -> sign successful")
                                        else:
                                            workflow_success = False
                                            workflow_details.append(f"❌ Expected signed status, got: {signed_contract.get('status') if signed_contract else 'not found'}")
            
            details = "; ".join(workflow_details)
            return self.log_test("Issue Subcontract Workflow", workflow_success, details)
            
        except Exception as e:
            return self.log_test("Issue Subcontract Workflow", False, f"Error: {str(e)}")

    def test_assign_subcontractor_to_existing_task(self):
        """Test assigning subcontractor to an existing task without subcontractor"""
        if not self.project_id or not self.task_id or not self.subcontractor_id:
            return self.log_test("Assign Subcontractor to Task", False, "Missing required IDs")
        
        try:
            # Test the PATCH endpoint for assigning subcontractor
            assign_data = {"assigned_subcontractor_id": self.subcontractor_id}
            response = requests.patch(f"{self.api_url}/projects/{self.project_id}/program/{self.task_id}", 
                                    json=assign_data, headers=self.headers, timeout=10)
            
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                # Verify the assignment by getting the task
                response = requests.get(f"{self.api_url}/projects/{self.project_id}/program", 
                                      headers=self.headers, timeout=10)
                if response.status_code == 200:
                    tasks = response.json()
                    updated_task = next((t for t in tasks if t['task_id'] == self.task_id), None)
                    if updated_task and updated_task.get('assigned_subcontractor_id') == self.subcontractor_id:
                        details += ", Subcontractor successfully assigned"
                    else:
                        success = False
                        details += ", Assignment verification failed"
            
            return self.log_test("Assign Subcontractor to Task", success, details)
        except Exception as e:
            return self.log_test("Assign Subcontractor to Task", False, f"Error: {str(e)}")

    def test_trigger_templates_integration_with_project_creation(self):
        """Test the complete trigger templates integration with project creation flow"""
        print("\n🔄 Testing Trigger Templates Integration with Project Creation...")
        
        integration_success = True
        integration_details = []
        created_event_ids = []
        
        try:
            # Step 1: Ensure Default Triggers Exist
            print("Step 1: Seeding default triggers...")
            response = requests.post(f"{self.api_url}/triggers/seed-defaults", json={}, headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                integration_details.append(f"✅ Seeded {data.get('created_count', 0)}/{data.get('total_defaults', 0)} default triggers")
            else:
                integration_success = False
                integration_details.append(f"❌ Failed to seed default triggers: {response.status_code}")
                
            # Step 2: Verify triggers exist
            print("Step 2: Verifying triggers exist...")
            response = requests.get(f"{self.api_url}/triggers", headers=self.headers, timeout=10)
            if response.status_code == 200:
                triggers = response.json()
                if len(triggers) >= 5:  # Should have at least 5 default triggers
                    integration_details.append(f"✅ Found {len(triggers)} triggers available")
                    # Store first few triggers for testing
                    test_triggers = triggers[:3]  # Use first 3 triggers for testing
                else:
                    integration_success = False
                    integration_details.append(f"❌ Expected at least 5 triggers, found {len(triggers)}")
                    return self.log_test("Trigger Templates Integration", integration_success, "; ".join(integration_details))
            else:
                integration_success = False
                integration_details.append(f"❌ Failed to get triggers list: {response.status_code}")
                return self.log_test("Trigger Templates Integration", integration_success, "; ".join(integration_details))
            
            # Step 3: Create a new project
            print("Step 3: Creating new project...")
            project_data = {
                "name": "Trigger Integration Test Project",
                "client_name": "Test Client for Triggers",
                "client_email": "triggertest@testcorp.com",
                "contract_type": "AS4000",
                "description": "Test project for trigger templates integration",
                "starting_value": 2000000.0,
                "current_value": 2000000.0,
                "start_date": "2024-02-01",
                "original_completion_date": "2024-12-31",
                "current_completion_date": "2024-12-31",
                "location": "Sydney CBD",
                "owner": "Test Development Corp",
                "builder": "Test Construction Ltd"
            }
            response = requests.post(f"{self.api_url}/projects", json=project_data, headers=self.headers, timeout=10)
            if response.status_code == 200:
                project_data_response = response.json()
                test_project_id = project_data_response.get('project_id')
                integration_details.append(f"✅ Created test project: {test_project_id}")
            else:
                integration_success = False
                integration_details.append(f"❌ Failed to create test project: {response.status_code}")
                return self.log_test("Trigger Templates Integration", integration_success, "; ".join(integration_details))
            
            # Step 4: Create events for each selected trigger
            print("Step 4: Creating events for selected triggers...")
            for i, trigger in enumerate(test_triggers):
                trigger_id = trigger['trigger_id']
                trigger_name = trigger['name']
                
                # Create event with different due dates to test status colors
                days_offset = [21, 5, -2][i]  # Green, Orange, Red scenarios
                due_date = (datetime.now() + timedelta(days=days_offset)).isoformat()
                
                event_data = {
                    "project_id": test_project_id,
                    "trigger_id": trigger_id,
                    "title": trigger_name,
                    "description": trigger.get('description', ''),
                    "due_date": due_date,
                    "value": 10000.0 * (i + 1),  # Different values for testing
                    "notes": trigger.get('next_steps', '')
                }
                
                response = requests.post(f"{self.api_url}/projects/{test_project_id}/events", 
                                       json=event_data, headers=self.headers, timeout=10)
                if response.status_code == 200:
                    event_response = response.json()
                    event_id = event_response.get('event_id')
                    status_color = event_response.get('status_color', 'unknown')
                    created_event_ids.append(event_id)
                    integration_details.append(f"✅ Created event '{trigger_name}' (ID: {event_id}, Color: {status_color})")
                else:
                    integration_success = False
                    integration_details.append(f"❌ Failed to create event for trigger '{trigger_name}': {response.status_code}")
            
            # Step 5: Verify events on project
            print("Step 5: Verifying events on project...")
            response = requests.get(f"{self.api_url}/projects/{test_project_id}/events", headers=self.headers, timeout=10)
            if response.status_code == 200:
                events = response.json()
                if len(events) >= len(test_triggers):
                    integration_details.append(f"✅ Found {len(events)} events on project")
                    
                    # Verify each event has required fields
                    for event in events:
                        if all(field in event for field in ['trigger_id', 'title', 'status_color']):
                            trigger_id = event['trigger_id']
                            title = event['title']
                            status_color = event['status_color']
                            integration_details.append(f"✅ Event '{title}' has trigger_id: {trigger_id}, status_color: {status_color}")
                        else:
                            integration_success = False
                            missing_fields = [f for f in ['trigger_id', 'title', 'status_color'] if f not in event]
                            integration_details.append(f"❌ Event missing fields: {missing_fields}")
                else:
                    integration_success = False
                    integration_details.append(f"❌ Expected at least {len(test_triggers)} events, found {len(events)}")
            else:
                integration_success = False
                integration_details.append(f"❌ Failed to get project events: {response.status_code}")
            
            # Step 6: Test event customization
            print("Step 6: Testing event customization...")
            if created_event_ids:
                test_event_id = created_event_ids[0]
                
                # Test updating due_date and value
                custom_due_date = (datetime.now() + timedelta(days=2)).isoformat()  # Should be red
                update_data = {
                    "due_date": custom_due_date,
                    "value": 25000.0,
                    "notes": "Updated during integration testing"
                }
                
                response = requests.patch(f"{self.api_url}/projects/{test_project_id}/events/{test_event_id}", 
                                        json=update_data, headers=self.headers, timeout=10)
                if response.status_code == 200:
                    integration_details.append("✅ Successfully updated event with custom due_date and value")
                    
                    # Verify status_color changed based on new due date
                    response = requests.get(f"{self.api_url}/projects/{test_project_id}/events", headers=self.headers, timeout=10)
                    if response.status_code == 200:
                        updated_events = response.json()
                        updated_event = next((e for e in updated_events if e['event_id'] == test_event_id), None)
                        if updated_event:
                            new_status_color = updated_event.get('status_color')
                            integration_details.append(f"✅ Event status_color updated to: {new_status_color} (due in 2 days)")
                            if new_status_color in ['orange', 'red']:  # Should be orange or red for 2 days
                                integration_details.append("✅ Status color calculation working correctly")
                            else:
                                integration_details.append(f"⚠️ Expected orange/red for 2 days out, got {new_status_color}")
                        else:
                            integration_success = False
                            integration_details.append("❌ Could not find updated event")
                else:
                    integration_success = False
                    integration_details.append(f"❌ Failed to update event: {response.status_code}")
            
            # Step 7: Verify project status calculation
            print("Step 7: Verifying project status calculation...")
            response = requests.get(f"{self.api_url}/projects/with-status", headers=self.headers, timeout=10)
            if response.status_code == 200:
                projects_with_status = response.json()
                test_project = next((p for p in projects_with_status if p['project_id'] == test_project_id), None)
                if test_project:
                    project_status_color = test_project.get('status_color')
                    pending_events_count = test_project.get('pending_events_count', 0)
                    next_due_date = test_project.get('next_due_date')
                    integration_details.append(f"✅ Project status: {project_status_color}, Pending events: {pending_events_count}, Next due: {next_due_date}")
                else:
                    integration_success = False
                    integration_details.append("❌ Test project not found in projects with status")
            else:
                integration_success = False
                integration_details.append(f"❌ Failed to get projects with status: {response.status_code}")
            
            details = "; ".join(integration_details)
            return self.log_test("Trigger Templates Integration with Project Creation", integration_success, details)
            
        except Exception as e:
            return self.log_test("Trigger Templates Integration with Project Creation", False, f"Error: {str(e)}")

    # ============ NEW FEATURE TESTS (Review Request) ============
    
    def test_notice_status_flow(self):
        """Test the complete notice status flow: create -> submit -> approve"""
        print("\n🔄 Testing Notice Status Flow...")
        
        if not self.project_id:
            return self.log_test("Notice Status Flow", False, "No project ID available")
        
        flow_success = True
        flow_details = []
        notice_id = None
        
        try:
            # Step 1: Create notice with claimed_amount
            notice_data = {
                "project_id": self.project_id,
                "title": "Test Variation Notice - Status Flow",
                "notice_type": "variation",
                "content": "Test notice for status flow testing with claimed amount",
                "recipient_email": "client@testcorp.com",
                "claimed_amount": 25000.0
            }
            response = requests.post(f"{self.api_url}/notices", json=notice_data, headers=self.headers, timeout=10)
            
            if response.status_code != 200:
                flow_success = False
                flow_details.append(f"Failed to create notice: {response.status_code}")
            else:
                data = response.json()
                notice_id = data.get('notice_id')
                claimed_amount = data.get('claimed_amount')
                status = data.get('status')
                flow_details.append(f"✅ Created notice: {notice_id}, Status: {status}, Claimed: ${claimed_amount}")
                
                if status != 'draft':
                    flow_success = False
                    flow_details.append(f"❌ Expected draft status, got: {status}")
                
                # Step 2: Submit notice
                response = requests.post(f"{self.api_url}/notices/{notice_id}/submit", json={}, headers=self.headers, timeout=10)
                
                if response.status_code != 200:
                    flow_success = False
                    flow_details.append(f"Failed to submit notice: {response.status_code}")
                else:
                    flow_details.append("✅ Successfully submitted notice")
                    
                    # Verify status changed to submitted
                    response = requests.get(f"{self.api_url}/notices", headers=self.headers, timeout=10)
                    if response.status_code == 200:
                        notices = response.json()
                        submitted_notice = next((n for n in notices if n['notice_id'] == notice_id), None)
                        if submitted_notice and submitted_notice.get('status') == 'submitted':
                            flow_details.append("✅ Notice status changed to submitted")
                        else:
                            flow_success = False
                            flow_details.append(f"❌ Expected submitted status, got: {submitted_notice.get('status') if submitted_notice else 'not found'}")
                    
                    # Step 3: Approve notice with approved_amount (as query param)
                    approved_amount = 20000.0
                    response = requests.post(f"{self.api_url}/notices/{notice_id}/approve?approved_amount={approved_amount}", 
                                           json={}, headers=self.headers, timeout=10)
                    
                    if response.status_code != 200:
                        flow_success = False
                        flow_details.append(f"Failed to approve notice: {response.status_code}")
                    else:
                        approval_data = response.json()
                        returned_amount = approval_data.get('approved_amount')
                        flow_details.append(f"✅ Successfully approved notice with amount: ${returned_amount}")
                        
                        # Verify status changed to approved and amounts are correct
                        response = requests.get(f"{self.api_url}/notices", headers=self.headers, timeout=10)
                        if response.status_code == 200:
                            notices = response.json()
                            approved_notice = next((n for n in notices if n['notice_id'] == notice_id), None)
                            if approved_notice:
                                final_status = approved_notice.get('status')
                                final_claimed = approved_notice.get('claimed_amount')
                                final_approved = approved_notice.get('approved_amount')
                                
                                if final_status == 'approved':
                                    flow_details.append("✅ Notice status changed to approved")
                                else:
                                    flow_success = False
                                    flow_details.append(f"❌ Expected approved status, got: {final_status}")
                                
                                if final_claimed == 25000.0 and final_approved == 20000.0:
                                    flow_details.append(f"✅ Amounts correct - Claimed: ${final_claimed}, Approved: ${final_approved}")
                                else:
                                    flow_success = False
                                    flow_details.append(f"❌ Amount mismatch - Claimed: ${final_claimed}, Approved: ${final_approved}")
                        
                        # Step 4: Verify project totals updated
                        response = requests.get(f"{self.api_url}/projects/{self.project_id}", headers=self.headers, timeout=10)
                        if response.status_code == 200:
                            project = response.json()
                            total_claimed = project.get('total_claimed', 0)
                            total_approved = project.get('total_approved', 0)
                            flow_details.append(f"✅ Project totals updated - Claimed: ${total_claimed}, Approved: ${total_approved}")
                        else:
                            flow_success = False
                            flow_details.append("❌ Failed to verify project totals")
            
            details = "; ".join(flow_details)
            return self.log_test("Notice Status Flow", flow_success, details)
            
        except Exception as e:
            return self.log_test("Notice Status Flow", False, f"Error: {str(e)}")

    def test_archive_project_flow(self):
        """Test the complete archive project flow"""
        print("\n🔄 Testing Archive Project Flow...")
        
        if not self.project_id:
            return self.log_test("Archive Project Flow", False, "No project ID available")
        
        flow_success = True
        flow_details = []
        
        try:
            # Step 1: Archive the project
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/archive", json={}, headers=self.headers, timeout=10)
            
            if response.status_code != 200:
                flow_success = False
                flow_details.append(f"Failed to archive project: {response.status_code}")
            else:
                flow_details.append("✅ Successfully archived project")
                
                # Step 2: Verify archived project not in main list
                response = requests.get(f"{self.api_url}/projects", headers=self.headers, timeout=10)
                if response.status_code == 200:
                    projects = response.json()
                    archived_in_main = any(p['project_id'] == self.project_id for p in projects)
                    if not archived_in_main:
                        flow_details.append("✅ Archived project not in main projects list")
                    else:
                        flow_success = False
                        flow_details.append("❌ Archived project still appears in main projects list")
                else:
                    flow_success = False
                    flow_details.append(f"Failed to get main projects list: {response.status_code}")
                
                # Step 3: Verify archived project in archived list
                response = requests.get(f"{self.api_url}/projects/archived", headers=self.headers, timeout=10)
                if response.status_code == 200:
                    archived_projects = response.json()
                    found_in_archived = any(p['project_id'] == self.project_id for p in archived_projects)
                    if found_in_archived:
                        flow_details.append(f"✅ Found project in archived list ({len(archived_projects)} total archived)")
                    else:
                        flow_success = False
                        flow_details.append("❌ Archived project not found in archived list")
                else:
                    flow_success = False
                    flow_details.append(f"Failed to get archived projects list: {response.status_code}")
                
                # Step 4: Unarchive the project
                response = requests.post(f"{self.api_url}/projects/{self.project_id}/unarchive", json={}, headers=self.headers, timeout=10)
                
                if response.status_code != 200:
                    flow_success = False
                    flow_details.append(f"Failed to unarchive project: {response.status_code}")
                else:
                    flow_details.append("✅ Successfully unarchived project")
                    
                    # Step 5: Verify project back in main list
                    response = requests.get(f"{self.api_url}/projects", headers=self.headers, timeout=10)
                    if response.status_code == 200:
                        projects = response.json()
                        back_in_main = any(p['project_id'] == self.project_id for p in projects)
                        if back_in_main:
                            flow_details.append("✅ Unarchived project back in main projects list")
                        else:
                            flow_success = False
                            flow_details.append("❌ Unarchived project not found in main projects list")
                    else:
                        flow_success = False
                        flow_details.append(f"Failed to verify unarchived project: {response.status_code}")
            
            details = "; ".join(flow_details)
            return self.log_test("Archive Project Flow", flow_success, details)
            
        except Exception as e:
            return self.log_test("Archive Project Flow", False, f"Error: {str(e)}")

    def test_email_drafts_flow(self):
        """Test email drafts creation and listing"""
        print("\n🔄 Testing Email Drafts Flow...")
        
        if not self.project_id:
            return self.log_test("Email Drafts Flow", False, "No project ID available")
        
        flow_success = True
        flow_details = []
        draft_id = None
        
        try:
            # Step 1: Create email draft
            email_data = {
                "project_id": self.project_id,
                "to_email": "client@testcorp.com",
                "subject": "Test Email Draft - Project Update",
                "body": "This is a test email draft for project communication. Please review the attached documents and provide feedback."
            }
            response = requests.post(f"{self.api_url}/projects/{self.project_id}/emails", json=email_data, headers=self.headers, timeout=10)
            
            if response.status_code != 200:
                flow_success = False
                flow_details.append(f"Failed to create email draft: {response.status_code}")
            else:
                data = response.json()
                draft_id = data.get('draft_id')
                status = data.get('status')
                to_email = data.get('to_email')
                subject = data.get('subject')
                flow_details.append(f"✅ Created email draft: {draft_id}, Status: {status}, To: {to_email}")
                
                if status != 'draft':
                    flow_success = False
                    flow_details.append(f"❌ Expected draft status, got: {status}")
                
                # Step 2: List email drafts for the project
                response = requests.get(f"{self.api_url}/projects/{self.project_id}/emails", headers=self.headers, timeout=10)
                
                if response.status_code != 200:
                    flow_success = False
                    flow_details.append(f"Failed to list email drafts: {response.status_code}")
                else:
                    drafts = response.json()
                    found_draft = any(d['draft_id'] == draft_id for d in drafts)
                    if found_draft:
                        flow_details.append(f"✅ Found created draft in list ({len(drafts)} total drafts)")
                        
                        # Verify draft details
                        created_draft = next((d for d in drafts if d['draft_id'] == draft_id), None)
                        if created_draft:
                            if (created_draft.get('subject') == email_data['subject'] and 
                                created_draft.get('to_email') == email_data['to_email']):
                                flow_details.append("✅ Draft details match created data")
                            else:
                                flow_success = False
                                flow_details.append("❌ Draft details don't match created data")
                    else:
                        flow_success = False
                        flow_details.append("❌ Created draft not found in list")
                
                # Step 3: Create another draft to test multiple drafts
                email_data2 = {
                    "project_id": self.project_id,
                    "to_email": "contractor@example.com",
                    "subject": "Test Email Draft 2 - Variation Notice",
                    "body": "Second test email draft for variation notice communication."
                }
                response = requests.post(f"{self.api_url}/projects/{self.project_id}/emails", json=email_data2, headers=self.headers, timeout=10)
                
                if response.status_code == 200:
                    data2 = response.json()
                    draft_id2 = data2.get('draft_id')
                    flow_details.append(f"✅ Created second email draft: {draft_id2}")
                    
                    # Verify both drafts in list
                    response = requests.get(f"{self.api_url}/projects/{self.project_id}/emails", headers=self.headers, timeout=10)
                    if response.status_code == 200:
                        drafts = response.json()
                        if len(drafts) >= 2:
                            flow_details.append(f"✅ Multiple drafts working ({len(drafts)} total drafts)")
                        else:
                            flow_success = False
                            flow_details.append(f"❌ Expected at least 2 drafts, found {len(drafts)}")
                else:
                    flow_success = False
                    flow_details.append(f"Failed to create second email draft: {response.status_code}")
            
            details = "; ".join(flow_details)
            return self.log_test("Email Drafts Flow", flow_success, details)
            
        except Exception as e:
            return self.log_test("Email Drafts Flow", False, f"Error: {str(e)}")

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
        
        # Enhanced Dashboard tests
        print("\n🎯 Testing Enhanced Dashboard Features...")
        self.test_seed_default_triggers()
        self.test_list_triggers()
        self.test_create_custom_trigger()
        self.test_update_trigger()
        self.test_get_trigger()
        self.test_delete_system_trigger_fails()
        self.test_create_project_event()
        self.test_list_project_events()
        self.test_status_color_scenarios()
        self.test_update_project_event()
        self.test_manual_status_override()
        self.test_list_clients()
        self.test_projects_with_status()
        self.test_project_status()
        self.test_delete_project_event()
        self.test_delete_custom_trigger()
        
        # Trigger Templates Integration Test (as requested)
        print("\n🎯 Testing Trigger Templates Integration with Project Creation...")
        self.test_trigger_templates_integration_with_project_creation()
        
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
        
        # Construction Program tests
        self.test_get_program_tasks()
        self.test_create_program_task()
        self.test_update_program_task()
        self.test_csv_program_import()  # Test CSV import functionality
        self.test_create_subcontractor()
        self.test_list_subcontractors()
        self.test_create_subcontract()
        self.test_list_subcontracts()
        self.test_issue_subcontract()
        self.test_sign_subcontract()
        self.test_list_claim_templates()
        
        # Issue Subcontract Workflow Tests (NEW)
        self.test_issue_subcontract_workflow()
        self.test_assign_subcontractor_to_existing_task()
        
        # NEW FEATURE TESTS (Review Request)
        print("\n🆕 Testing New Features (Review Request)...")
        self.test_notice_status_flow()
        self.test_archive_project_flow()
        self.test_email_drafts_flow()
        
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

    def run_enhanced_dashboard_tests_only(self):
        """Run only the Enhanced Dashboard tests"""
        print("🚀 Starting Enhanced Dashboard Tests")
        print("=" * 60)
        
        # Basic setup
        self.test_health_check()
        self.test_auth_me()
        self.test_create_project()
        
        # Enhanced Dashboard Tests
        print("\n🎯 Testing Trigger Library APIs...")
        self.test_seed_default_triggers()
        self.test_list_triggers()
        self.test_create_custom_trigger()
        self.test_update_trigger()
        self.test_get_trigger()
        self.test_delete_system_trigger_fails()
        
        print("\n🎯 Testing Project Events APIs...")
        self.test_create_project_event()
        self.test_list_project_events()
        self.test_status_color_scenarios()
        self.test_update_project_event()
        self.test_manual_status_override()
        self.test_delete_project_event()
        
        print("\n🎯 Testing Dashboard APIs...")
        self.test_list_clients()
        self.test_projects_with_status()
        self.test_project_status()
        
        print("\n🎯 Cleanup...")
        self.test_delete_custom_trigger()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Enhanced Dashboard tests passed!")
            return 0
        else:
            print("⚠️  Some Enhanced Dashboard tests failed. Check the logs above.")
            return 1

    def run_issue_subcontract_tests_only(self):
        """Run only the Issue Subcontract workflow tests"""
        print("🚀 Starting Issue Subcontract Workflow Tests")
        print("=" * 60)
        
        # Basic setup
        self.test_health_check()
        self.test_auth_me()
        self.test_create_project()
        
        # Issue Subcontract Workflow Tests
        self.test_issue_subcontract_workflow()
        self.test_assign_subcontractor_to_existing_task()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Issue Subcontract workflow tests passed!")
            return 0
        else:
            print("⚠️  Some Issue Subcontract workflow tests failed. Check the logs above.")
            return 1

def main():
    """Main test runner"""
    tester = BuildCompliancePortalTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())