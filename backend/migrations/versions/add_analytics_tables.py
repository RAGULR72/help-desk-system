"""add analytics tables

Revision ID: bb02cc03dd04
Revises: aa01bb02cc03
Create Date: 2026-01-07 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'bb02cc03dd04'
down_revision = 'aa01bb02cc03'
branch_labels = None
depends_on = None


def upgrade():
    # Create daily_metrics table
    op.create_table(
        'daily_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('tickets_created', sa.Integer(), default=0),
        sa.Column('tickets_resolved', sa.Integer(), default=0),
        sa.Column('tickets_closed', sa.Integer(), default=0),
        sa.Column('tickets_reopened', sa.Integer(), default=0),
        sa.Column('avg_first_response_time', sa.Float(), default=0.0),
        sa.Column('avg_resolution_time', sa.Float(), default=0.0),
        sa.Column('median_resolution_time', sa.Float(), default=0.0),
        sa.Column('sla_met_count', sa.Integer(), default=0),
        sa.Column('sla_breached_count', sa.Integer(), default=0),
        sa.Column('sla_compliance_rate', sa.Float(), default=0.0),
        sa.Column('avg_customer_rating', sa.Float(), default=0.0),
        sa.Column('total_ratings', sa.Integer(), default=0),
        sa.Column('priority_breakdown', sa.JSON(), default={}),
        sa.Column('category_breakdown', sa.JSON(), default={}),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('date')
    )
    op.create_index('ix_daily_metrics_date', 'daily_metrics', ['date'])

    # Create technician_performance table
    op.create_table(
        'technician_performance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('technician_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('tickets_assigned', sa.Integer(), default=0),
        sa.Column('tickets_resolved', sa.Integer(), default=0),
        sa.Column('tickets_closed', sa.Integer(), default=0),
        sa.Column('tickets_reopened', sa.Integer(), default=0),
        sa.Column('avg_response_time', sa.Float(), default=0.0),
        sa.Column('avg_resolution_time', sa.Float(), default=0.0),
        sa.Column('total_work_time', sa.Float(), default=0.0),
        sa.Column('avg_customer_rating', sa.Float(), default=0.0),
        sa.Column('total_ratings', sa.Integer(), default=0),
        sa.Column('first_contact_resolution_rate', sa.Float(), default=0.0),
        sa.Column('sla_met', sa.Integer(), default=0),
        sa.Column('sla_breached', sa.Integer(), default=0),
        sa.Column('sla_compliance_rate', sa.Float(), default=0.0),
        sa.Column('category_performance', sa.JSON(), default={}),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['technician_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_technician_performance_technician_id', 'technician_performance', ['technician_id'])
    op.create_index('ix_technician_performance_date', 'technician_performance', ['date'])

    # Create ticket_volume_forecasting table
    op.create_table(
        'ticket_volume_forecasting',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('forecast_date', sa.Date(), nullable=False),
        sa.Column('forecast_created_at', sa.DateTime(), nullable=True),
        sa.Column('predicted_volume', sa.Integer(), nullable=False),
        sa.Column('confidence_level', sa.Float(), default=0.0),
        sa.Column('prediction_range_low', sa.Integer(), nullable=True),
        sa.Column('prediction_range_high', sa.Integer(), nullable=True),
        sa.Column('actual_volume', sa.Integer(), nullable=True),
        sa.Column('forecast_accuracy', sa.Float(), nullable=True),
        sa.Column('predicted_by_category', sa.JSON(), default={}),
        sa.Column('predicted_by_priority', sa.JSON(), default={}),
        sa.Column('model_version', sa.String(length=50), default='v1.0'),
        sa.Column('model_parameters', sa.JSON(), default={}),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ticket_volume_forecasting_forecast_date', 'ticket_volume_forecasting', ['forecast_date'])

    # Create hourly_ticket_distribution table
    op.create_table(
        'hourly_ticket_distribution',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('hour', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('ticket_count', sa.Integer(), default=0),
        sa.Column('critical_count', sa.Integer(), default=0),
        sa.Column('high_count', sa.Integer(), default=0),
        sa.Column('normal_count', sa.Integer(), default=0),
        sa.Column('low_count', sa.Integer(), default=0),
        sa.Column('avg_response_time', sa.Float(), default=0.0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_hourly_ticket_distribution_date', 'hourly_ticket_distribution', ['date'])

    # Create category_trends table
    op.create_table(
        'category_trends',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('category', sa.String(length=100), nullable=False),
        sa.Column('ticket_count', sa.Integer(), default=0),
        sa.Column('resolved_count', sa.Integer(), default=0),
        sa.Column('avg_resolution_time', sa.Float(), default=0.0),
        sa.Column('avg_customer_rating', sa.Float(), default=0.0),
        sa.Column('sla_compliance_rate', sa.Float(), default=0.0),
        sa.Column('volume_trend', sa.String(length=20), default='stable'),
        sa.Column('trend_percentage', sa.Float(), default=0.0),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_category_trends_date', 'category_trends', ['date'])
    op.create_index('ix_category_trends_category', 'category_trends', ['category'])

    # Create analytics_reports table
    op.create_table(
        'analytics_reports',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('report_type', sa.String(length=50), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('filters', sa.JSON(), default={}),
        sa.Column('report_data', sa.JSON(), nullable=True),
        sa.Column('file_path', sa.String(length=500), nullable=True),
        sa.Column('file_format', sa.String(length=20), nullable=True),
        sa.Column('is_scheduled', sa.Integer(), default=0),
        sa.Column('schedule_frequency', sa.String(length=20), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('last_generated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create sla_compliance_log table
    op.create_table(
        'sla_compliance_log',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticket_id', sa.Integer(), nullable=False),
        sa.Column('sla_type', sa.String(length=50), nullable=False),
        sa.Column('target_time', sa.DateTime(), nullable=False),
        sa.Column('actual_time', sa.DateTime(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.Column('breach_duration', sa.Float(), default=0.0),
        sa.Column('ticket_priority', sa.String(length=20), nullable=True),
        sa.Column('ticket_category', sa.String(length=100), nullable=True),
        sa.Column('assigned_technician_id', sa.Integer(), nullable=True),
        sa.Column('breach_reason', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ),
        sa.ForeignKeyConstraint(['assigned_technician_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_sla_compliance_log_ticket_id', 'sla_compliance_log', ['ticket_id'])


def downgrade():
    op.drop_index('ix_sla_compliance_log_ticket_id', 'sla_compliance_log')
    op.drop_table('sla_compliance_log')
    op.drop_table('analytics_reports')
    op.drop_index('ix_category_trends_category', 'category_trends')
    op.drop_index('ix_category_trends_date', 'category_trends')
    op.drop_table('category_trends')
    op.drop_index('ix_hourly_ticket_distribution_date', 'hourly_ticket_distribution')
    op.drop_table('hourly_ticket_distribution')
    op.drop_index('ix_ticket_volume_forecasting_forecast_date', 'ticket_volume_forecasting')
    op.drop_table('ticket_volume_forecasting')
    op.drop_index('ix_technician_performance_date', 'technician_performance')
    op.drop_index('ix_technician_performance_technician_id', 'technician_performance')
    op.drop_table('technician_performance')
    op.drop_index('ix_daily_metrics_date', 'daily_metrics')
    op.drop_table('daily_metrics')
