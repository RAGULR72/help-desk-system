"""add auto-assignment tables

Revision ID: aa01bb02cc03
Revises: c044bfb07b22
Create Date: 2026-01-07 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'aa01bb02cc03'
down_revision = 'c044bfb07b22'
branch_labels = None
depends_on = None


def upgrade():
    # Create assignment_rules table
    op.create_table(
        'assignment_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('priority', sa.Integer(), default=0),
        sa.Column('criteria', sa.JSON(), default={}),
        sa.Column('strategy', sa.String(length=50), default='balanced'),
        sa.Column('tech_pool', sa.JSON(), default=[]),
        sa.Column('consider_workload', sa.Boolean(), default=True),
        sa.Column('consider_skills', sa.Boolean(), default=True),
        sa.Column('consider_location', sa.Boolean(), default=False),
        sa.Column('consider_performance', sa.Boolean(), default=True),
        sa.Column('max_tickets_per_tech', sa.Integer(), default=10),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create technician_skills table
    op.create_table(
        'technician_skills',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('skill_name', sa.String(length=100), nullable=False),
        sa.Column('proficiency_level', sa.Integer(), default=3),
        sa.Column('is_certified', sa.Boolean(), default=False),
        sa.Column('certification_name', sa.String(length=200), nullable=True),
        sa.Column('tickets_resolved', sa.Integer(), default=0),
        sa.Column('avg_resolution_time_hours', sa.Float(), default=0.0),
        sa.Column('customer_satisfaction', sa.Float(), default=0.0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_technician_skills_user_id', 'technician_skills', ['user_id'])

    # Create technician_availability table
    op.create_table(
        'technician_availability',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), default='available'),
        sa.Column('working_hours', sa.JSON(), default={}),
        sa.Column('active_tickets', sa.Integer(), default=0),
        sa.Column('max_capacity', sa.Integer(), default=10),
        sa.Column('current_location', sa.String(length=200), nullable=True),
        sa.Column('is_field_tech', sa.Boolean(), default=False),
        sa.Column('last_active_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index('ix_technician_availability_user_id', 'technician_availability', ['user_id'])

    # Create assignment_history table
    op.create_table(
        'assignment_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('assigned_to', sa.Integer(), nullable=False),
        sa.Column('assigned_by', sa.String(length=50), default='auto'),
        sa.Column('rule_id', sa.Integer(), nullable=True),
        sa.Column('strategy_used', sa.String(length=50), nullable=True),
        sa.Column('skill_match_score', sa.Float(), default=0.0),
        sa.Column('workload_score', sa.Float(), default=0.0),
        sa.Column('location_score', sa.Float(), default=0.0),
        sa.Column('overall_score', sa.Float(), default=0.0),
        sa.Column('was_reassigned', sa.Boolean(), default=False),
        sa.Column('reassignment_reason', sa.String(length=200), nullable=True),
        sa.Column('resolution_time_hours', sa.Float(), nullable=True),
        sa.Column('customer_rating', sa.Integer(), nullable=True),
        sa.Column('assignment_metadata', sa.JSON(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=True),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.ForeignKeyConstraint(['assigned_to'], ['users.id'], ),
        sa.ForeignKeyConstraint(['rule_id'], ['assignment_rules.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_assignment_history_ticket_id', 'assignment_history', ['ticket_id'])
    op.create_index('ix_assignment_history_assigned_to', 'assignment_history', ['assigned_to'])

    # Create auto_assignment_config table
    op.create_table(
        'auto_assignment_config',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), default=True),
        sa.Column('default_strategy', sa.String(length=50), default='balanced'),
        sa.Column('skill_weight', sa.Integer(), default=40),
        sa.Column('workload_weight', sa.Integer(), default=30),
        sa.Column('performance_weight', sa.Integer(), default=20),
        sa.Column('location_weight', sa.Integer(), default=10),
        sa.Column('fallback_to_manager', sa.Boolean(), default=True),
        sa.Column('manager_id', sa.Integer(), nullable=True),
        sa.Column('notify_on_assignment', sa.Boolean(), default=True),
        sa.Column('notify_tech_via_email', sa.Boolean(), default=True),
        sa.Column('notify_tech_via_sms', sa.Boolean(), default=False),
        sa.Column('prevent_overload', sa.Boolean(), default=True),
        sa.Column('respect_working_hours', sa.Boolean(), default=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['manager_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('auto_assignment_config')
    op.drop_index('ix_assignment_history_assigned_to', 'assignment_history')
    op.drop_index('ix_assignment_history_ticket_id', 'assignment_history')
    op.drop_table('assignment_history')
    op.drop_index('ix_technician_availability_user_id', 'technician_availability')
    op.drop_table('technician_availability')
    op.drop_index('ix_technician_skills_user_id', 'technician_skills')
    op.drop_table('technician_skills')
    op.drop_table('assignment_rules')
