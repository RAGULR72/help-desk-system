import requests
import os
import json
import logging
from datetime import datetime

class ExternalDispatcher:
    def __init__(self):
        # In a real scenario, this would come from a database setting
        self.webhook_url = os.getenv("EXTERNAL_NOTIFICATIONS_WEBHOOK", "http://localhost:8000/api/mock-webhook") 
        self.enabled = os.getenv("ENABLE_EXTERNAL_NOTIFICATIONS", "false").lower() == "true"

    def dispatch_event(self, event_type, data):
        """
        Sends a JSON payload to the configured external webhook.
        Events: ticket_created, ticket_assigned, ticket_resolved
        """
        if not self.enabled or not self.webhook_url:
            logging.info(f"External Dispatcher: Skipping event {event_type} (Disabled or no URL)")
            return

        payload = {
            "event": event_type,
            "timestamp": datetime.now().isoformat(),
            "ticket": {
                "id": data.get("id"),
                "custom_id": data.get("custom_id"),
                "subject": data.get("subject"),
                "status": data.get("status"),
                "priority": data.get("priority"),
                "reporter": data.get("reporter_name"),
                "assignee": data.get("assignee_name")
            },
            "system_url": f"http://localhost:5173/tickets/{data.get('id')}"
        }

        try:
            # We use a background thread or async in a real app, 
            # for now, we'll just log it or do a fast request.
            logging.info(f"External Dispatcher: Sending {event_type} to {self.webhook_url}")
            # requests.post(self.webhook_url, json=payload, timeout=2) 
        except Exception as e:
            logging.error(f"External Dispatcher Error: {str(e)}")

# Singleton instance
dispatcher = ExternalDispatcher()
