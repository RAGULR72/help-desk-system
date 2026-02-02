"""
Workflow automation service for the help desk application
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Dict, List, Optional, Any
import json
from datetime import datetime, timedelta
from models import User
from workflow_system.workflow_models import (
    WorkflowTemplate,
    WorkflowInstance,
    WorkflowRule,
    WorkflowApproval,
    WorkflowEscalation,
    WorkflowStatus,
    WorkflowCategory
)
from sqlalchemy.exc import SQLAlchemyError
import uuid


class WorkflowService:
    """
    Service class for handling workflow automation with drag-and-drop builder,
    approval processes, conditional routing, and escalation procedures
    """
    
    def __init__(self, db: Session):
        self.db = db

    def get_workflow_config(self) -> Dict:
        """
        Get aggregate workflow configuration for the UI
        """
        templates = self.db.query(WorkflowTemplate).all()
        rules = self.db.query(WorkflowRule).all()
        categories = self.db.query(WorkflowCategory).all()

        from ticket_system.models import Ticket
        
        # Calculate tickets_count for categories
        # Note: Tickets use string category names, so we match on name
        category_data = []
        for cat in categories:
            count = self.db.query(Ticket).filter(Ticket.category == cat.name).count()
            category_data.append({
                "id": cat.id,
                "name": cat.name,
                "description": cat.description,
                "color": cat.color,
                "tickets_count": count
            })

        # Process templates for frontend
        workflow_data = []
        for t in templates:
            t_count = self.db.query(Ticket).filter(Ticket.category == t.category).count()
            workflow_data.append({
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "category": t.category,
                "status": t.status.value if hasattr(t.status, 'value') else t.status,
                "steps_count": len(t.definition.get('nodes', [])),
                "avg_resolution": "2.4h", # Placeholder
                "tickets_processed": t_count
            })

        return {
            "workflows": workflow_data,
            "automation_rules": rules,
            "categories": category_data
        }

    def create_category(self, name: str, description: str = None, color: str = "#6366f1") -> WorkflowCategory:
        try:
            cat = WorkflowCategory(name=name, description=description, color=color)
            self.db.add(cat)
            self.db.commit()
            self.db.refresh(cat)
            return cat
        except SQLAlchemyError:
            self.db.rollback()
            return None

    def delete_category(self, category_id: int) -> bool:
        try:
            cat = self.db.query(WorkflowCategory).filter(WorkflowCategory.id == category_id).first()
            if cat:
                self.db.delete(cat)
                self.db.commit()
                return True
            return False
        except SQLAlchemyError:
            self.db.rollback()
            return False

    def toggle_rule(self, rule_id: int) -> Optional[WorkflowRule]:
        try:
            rule = self.db.query(WorkflowRule).filter(WorkflowRule.id == rule_id).first()
            if rule:
                rule.is_active = not rule.is_active
                self.db.commit()
                self.db.refresh(rule)
                return rule
            return None
        except SQLAlchemyError:
            self.db.rollback()
            return None

    def delete_workflow_template(self, template_id: int) -> bool:
        try:
            template = self.db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
            if template:
                self.db.delete(template)
                self.db.commit()
                return True
            return False
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def create_workflow_template(
        self,
        name: str,
        description: str,
        category: str,
        definition: Dict,
        created_by: int,
        status: WorkflowStatus = WorkflowStatus.DRAFT
    ) -> WorkflowTemplate:
        """
        Create a new workflow template
        """
        try:
            template = WorkflowTemplate(
                name=name,
                description=description,
                category=category,
                definition=definition,
                created_by=created_by,
                status=status
            )
            
            self.db.add(template)
            self.db.commit()
            self.db.refresh(template)
            return template
        except SQLAlchemyError:
            self.db.rollback()
            return None
    
    def get_workflow_template(self, template_id: int) -> WorkflowTemplate:
        """
        Get a workflow template by ID
        """
        try:
            return self.db.query(WorkflowTemplate).filter(
                WorkflowTemplate.id == template_id
            ).first()
        except SQLAlchemyError:
            return None
    
    def get_workflow_templates(
        self, 
        category: str = None, 
        status: WorkflowStatus = None,
        limit: int = 20,
        offset: int = 0
    ) -> List[WorkflowTemplate]:
        """
        Get workflow templates with optional filters
        """
        try:
            query = self.db.query(WorkflowTemplate)
            
            if category:
                query = query.filter(WorkflowTemplate.category == category)
            
            if status:
                query = query.filter(WorkflowTemplate.status == status)
            
            return query.order_by(WorkflowTemplate.created_at.desc()).offset(offset).limit(limit).all()
        except SQLAlchemyError:
            return []
    
    def update_workflow_template(
        self,
        template_id: int,
        name: str = None,
        description: str = None,
        category: str = None,
        definition: Dict = None,
        status: WorkflowStatus = None
    ) -> bool:
        """
        Update a workflow template
        """
        try:
            template = self.db.query(WorkflowTemplate).filter(
                WorkflowTemplate.id == template_id
            ).first()
            
            if not template:
                return False
            
            if name is not None:
                template.name = name
            if description is not None:
                template.description = description
            if category is not None:
                template.category = category
            if definition is not None:
                template.definition = definition
            if status is not None:
                template.status = status
            
            template.updated_at = datetime.utcnow()
            self.db.commit()
            return True
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def activate_workflow_template(self, template_id: int) -> bool:
        """
        Activate a workflow template
        """
        try:
            template = self.db.query(WorkflowTemplate).filter(
                WorkflowTemplate.id == template_id
            ).first()
            
            if not template:
                return False
            
            template.status = WorkflowStatus.ACTIVE
            template.updated_at = datetime.utcnow()
            self.db.commit()
            return True
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def start_workflow_instance(
        self,
        template_id: int,
        entity_type: str,
        entity_id: int,
        initial_context: Dict = None
    ) -> WorkflowInstance:
        """
        Start a new workflow instance
        """
        try:
            template = self.db.query(WorkflowTemplate).filter(
                and_(
                    WorkflowTemplate.id == template_id,
                    WorkflowTemplate.status == WorkflowStatus.ACTIVE
                )
            ).first()
            
            if not template:
                return None
            
            instance = WorkflowInstance(
                workflow_template_id=template_id,
                entity_type=entity_type,
                entity_id=entity_id,
                context=initial_context or {},
                current_node_id=self._get_start_node_id(template.definition)
            )
            
            self.db.add(instance)
            self.db.commit()
            self.db.refresh(instance)
            
            # Execute the first node
            self._execute_workflow_node(instance, template.definition)
            
            return instance
        except SQLAlchemyError:
            self.db.rollback()
            return None
    
    def _get_start_node_id(self, definition: Dict) -> str:
        """
        Get the ID of the start node from workflow definition
        """
        if 'nodes' in definition:
            for node in definition['nodes']:
                if node.get('type') == 'start':
                    return node['id']
        return None
    
    def _execute_workflow_node(self, instance: WorkflowInstance, definition: Dict):
        """
        Execute the current node in the workflow
        """
        current_node_id = instance.current_node_id
        if not current_node_id:
            return
        
        # Find the current node in the definition
        current_node = None
        for node in definition.get('nodes', []):
            if node['id'] == current_node_id:
                current_node = node
                break
        
        if not current_node:
            return
        
        # Process based on node type
        if current_node['type'] == 'action':
            self._execute_action_node(current_node, instance)
        elif current_node['type'] == 'condition':
            self._evaluate_condition_node(current_node, instance, definition)
        elif current_node['type'] == 'approval':
            self._create_approval_node(current_node, instance)
        elif current_node['type'] == 'end':
            self._complete_workflow_instance(instance)
    
    def _execute_action_node(self, node: Dict, instance: WorkflowInstance):
        """
        Execute an action node in the workflow
        """
        action_config = node.get('data', {})
        action_type = action_config.get('actionType')
        
        # Update workflow context with action results
        context = instance.context or {}
        
        if action_type == 'assign_ticket':
            # Assign ticket to a user
            assignee_id = action_config.get('assigneeId')
            context['assigned_to'] = assignee_id
        elif action_type == 'send_notification':
            # Send notification
            notification_config = action_config.get('notification')
            context['notification_sent'] = True
            context['notification_config'] = notification_config
        elif action_type == 'update_status':
            # Update status
            new_status = action_config.get('status')
            context['status'] = new_status
        
        instance.context = context
        self.db.commit()
        
        # Move to next node
        self._move_to_next_node(instance, node, action_config.get('condition', 'always'))
    
    def _evaluate_condition_node(self, node: Dict, instance: WorkflowInstance, definition: Dict):
        """
        Evaluate a condition node and move to appropriate next node
        """
        condition_config = node.get('data', {})
        condition_type = condition_config.get('conditionType')
        
        context = instance.context or {}
        condition_met = False
        
        if condition_type == 'ticket_priority':
            priority = context.get('priority', 'normal')
            required_priority = condition_config.get('priority')
            condition_met = priority == required_priority
        elif condition_type == 'ticket_category':
            category = context.get('category', '')
            required_category = condition_config.get('category')
            condition_met = category == required_category
        elif condition_type == 'user_role':
            user_role = context.get('user_role', 'user')
            required_role = condition_config.get('role')
            condition_met = user_role == required_role
        elif condition_type == 'custom':
            # Evaluate custom condition from context
            custom_condition = condition_config.get('customCondition', '')
            # This is a simplified version - in a real implementation, you'd have a more sophisticated
            # condition evaluation system
            condition_met = True  # Placeholder for actual condition evaluation
        
        # Move to next node based on condition result
        self._move_to_next_node(instance, node, 'true' if condition_met else 'false')
    
    def _create_approval_node(self, node: Dict, instance: WorkflowInstance):
        """
        Create an approval request for an approval node
        """
        approval_config = node.get('data', {})
        approver_id = approval_config.get('approverId')
        
        if not approver_id:
            # If no specific approver, we might look up based on role or other criteria
            approver_id = self._find_approver_for_context(instance.context, approval_config)
        
        if approver_id:
            approval = WorkflowApproval(
                workflow_instance_id=instance.id,
                node_id=node['id'],
                approver_id=approver_id,
                status='pending'
            )
            
            self.db.add(approval)
            self.db.commit()
    
    def _find_approver_for_context(self, context: Dict, approval_config: Dict) -> int:
        """
        Find appropriate approver based on context and approval configuration
        """
        # This is a simplified implementation - in a real system you'd have more sophisticated
        # logic to determine the approver based on context, role, permissions, etc.
        return 1  # Return a default approver ID
    
    def _move_to_next_node(self, instance: WorkflowInstance, current_node: Dict, condition: str = 'always'):
        """
        Move workflow instance to the next node based on condition
        """
        # Find connections from the current node
        connections = []
        for conn in instance.template.definition.get('connections', []):
            if conn.get('source') == current_node['id']:
                connections.append(conn)
        
        # Find the appropriate next node based on condition
        next_node_id = None
        for conn in connections:
            # If condition matches or if it's the default connection
            if (conn.get('condition') == condition or 
                (condition == 'always' and not conn.get('condition')) or
                (condition == 'true' and conn.get('condition') in ['true', 'yes']) or
                (condition == 'false' and conn.get('condition') in ['false', 'no'])):
                next_node_id = conn.get('target')
                break
        
        if next_node_id:
            instance.current_node_id = next_node_id
            self.db.commit()
            
            # Execute the next node
            self._execute_workflow_node(instance, instance.template.definition)
    
    def _complete_workflow_instance(self, instance: WorkflowInstance):
        """
        Complete a workflow instance
        """
        instance.status = 'completed'
        instance.completed_at = datetime.utcnow()
        self.db.commit()
    
    def approve_workflow_node(self, instance_id: int, node_id: str, approver_id: int, comments: str = None) -> bool:
        """
        Approve a workflow node
        """
        try:
            approval = self.db.query(WorkflowApproval).filter(
                and_(
                    WorkflowApproval.workflow_instance_id == instance_id,
                    WorkflowApproval.node_id == node_id,
                    WorkflowApproval.approver_id == approver_id,
                    WorkflowApproval.status == 'pending'
                )
            ).first()
            
            if not approval:
                return False
            
            approval.status = 'approved'
            approval.comments = comments
            approval.approved_at = datetime.utcnow()
            
            # Update the workflow instance to continue execution
            instance = self.db.query(WorkflowInstance).filter(
                WorkflowInstance.id == instance_id
            ).first()
            
            if instance:
                # Move to next node after approval
                self._move_to_next_node(instance, 
                                      self._get_node_by_id(instance.template.definition, node_id),
                                      'approved')
            
            self.db.commit()
            return True
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def reject_workflow_node(self, instance_id: int, node_id: str, approver_id: int, comments: str = None) -> bool:
        """
        Reject a workflow node
        """
        try:
            approval = self.db.query(WorkflowApproval).filter(
                and_(
                    WorkflowApproval.workflow_instance_id == instance_id,
                    WorkflowApproval.node_id == node_id,
                    WorkflowApproval.approver_id == approver_id,
                    WorkflowApproval.status == 'pending'
                )
            ).first()
            
            if not approval:
                return False
            
            approval.status = 'rejected'
            approval.comments = comments
            approval.approved_at = datetime.utcnow()
            
            # Update the workflow instance to handle rejection
            instance = self.db.query(WorkflowInstance).filter(
                WorkflowInstance.id == instance_id
            ).first()
            
            if instance:
                # In a real implementation, you might have different logic for rejected nodes
                instance.status = 'rejected'
                instance.completed_at = datetime.utcnow()
            
            self.db.commit()
            return True
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def _get_node_by_id(self, definition: Dict, node_id: str) -> Dict:
        """
        Get a node by its ID from the workflow definition
        """
        for node in definition.get('nodes', []):
            if node['id'] == node_id:
                return node
        return None
    
    def create_workflow_rule(
        self,
        name: str,
        description: str,
        condition: Dict,
        action: Dict,
        priority: int,
        created_by: int,
        is_active: bool = True
    ) -> WorkflowRule:
        """
        Create a conditional routing rule
        """
        try:
            rule = WorkflowRule(
                name=name,
                description=description,
                condition=condition,
                action=action,
                priority=priority,
                created_by=created_by,
                is_active=is_active
            )
            
            self.db.add(rule)
            self.db.commit()
            self.db.refresh(rule)
            return rule
        except SQLAlchemyError:
            self.db.rollback()
            return None
    
    def evaluate_workflow_rules(self, entity_type: str, entity_data: Dict) -> List[WorkflowRule]:
        """
        Evaluate workflow rules against entity data
        """
        try:
            # Get all active rules
            rules = self.db.query(WorkflowRule).filter(
                WorkflowRule.is_active == True
            ).order_by(WorkflowRule.priority.desc()).all()
            
            matching_rules = []
            for rule in rules:
                if self._evaluate_condition(rule.condition, entity_data):
                    matching_rules.append(rule)
            
            return matching_rules
        except SQLAlchemyError:
            return []
    
    def _evaluate_condition(self, condition: Dict, entity_data: Dict) -> bool:
        """
        Evaluate a condition against entity data
        """
        # This is a simplified condition evaluator
        # In a real implementation, you'd have a more sophisticated system
        condition_type = condition.get('type')
        
        if condition_type == 'field_equals':
            field = condition.get('field')
            value = condition.get('value')
            return entity_data.get(field) == value
        elif condition_type == 'field_contains':
            field = condition.get('field')
            value = condition.get('value')
            field_value = entity_data.get(field, '')
            return value in str(field_value)
        elif condition_type == 'field_greater_than':
            field = condition.get('field')
            value = condition.get('value')
            try:
                return float(entity_data.get(field, 0)) > float(value)
            except (ValueError, TypeError):
                return False
        elif condition_type == 'field_less_than':
            field = condition.get('field')
            value = condition.get('value')
            try:
                return float(entity_data.get(field, 0)) < float(value)
            except (ValueError, TypeError):
                return False
        else:
            # For complex conditions, you might use a more advanced evaluation system
            return True
    
    def create_escalation(
        self,
        workflow_instance_id: int,
        rule_name: str,
        trigger_condition: str,
        target: Dict,
        notes: str = None
    ) -> WorkflowEscalation:
        """
        Create an escalation record
        """
        try:
            escalation = WorkflowEscalation(
                workflow_instance_id=workflow_instance_id,
                rule_name=rule_name,
                trigger_condition=trigger_condition,
                target=target,
                notes=notes
            )
            
            self.db.add(escalation)
            self.db.commit()
            self.db.refresh(escalation)
            
            # Execute the escalation action
            self._execute_escalation_action(escalation)
            
            return escalation
        except SQLAlchemyError:
            self.db.rollback()
            return None
    
    def _execute_escalation_action(self, escalation: WorkflowEscalation):
        """
        Execute the action specified in the escalation
        """
        # This would implement the actual escalation action
        # For example, reassigning a ticket, sending notifications, etc.
        pass
    
    def check_for_escalations(self):
        """
        Check for workflows that need to be escalated based on time thresholds
        """
        try:
            # Find workflow instances that have been running too long
            # This is a simplified implementation - in a real system you'd have more complex
            # escalation rules based on SLAs, time thresholds, etc.
            cutoff_time = datetime.utcnow() - timedelta(hours=24)  # 24 hours threshold
            
            instances = self.db.query(WorkflowInstance).filter(
                and_(
                    WorkflowInstance.status == 'running',
                    WorkflowInstance.started_at < cutoff_time
                )
            ).all()
            
            for instance in instances:
                # Create escalation for instances running too long
                self.create_escalation(
                    workflow_instance_id=instance.id,
                    rule_name='Time Threshold Exceeded',
                    trigger_condition=f'Workflow running for more than 24 hours',
                    target={'type': 'reassign', 'to': 'manager'},
                    notes='Workflow escalated due to time threshold'
                )
        except SQLAlchemyError:
            pass


# Global workflow service instance
workflow_service = None

def get_workflow_service(db: Session) -> WorkflowService:
    """
    Get workflow service instance
    """
    global workflow_service
    if workflow_service is None:
        workflow_service = WorkflowService(db)
    else:
        workflow_service.db = db  # Update session
    return workflow_service