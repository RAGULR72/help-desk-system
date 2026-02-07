"""Add no_punch_out columns to attendance

Revision ID: d8f2a3b5c6e7
Revises: ab00b5553398
Create Date: 2026-02-07

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd8f2a3b5c6e7'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Add no_punch_out_reason column
    try:
        op.add_column('attendance', sa.Column('no_punch_out_reason', sa.String(), nullable=True))
    except Exception as e:
        print(f"Column no_punch_out_reason may already exist: {e}")
    
    # Add no_punch_out_notified column
    try:
        op.add_column('attendance', sa.Column('no_punch_out_notified', sa.DateTime(), nullable=True))
    except Exception as e:
        print(f"Column no_punch_out_notified may already exist: {e}")


def downgrade():
    try:
        op.drop_column('attendance', 'no_punch_out_reason')
    except Exception:
        pass
    try:
        op.drop_column('attendance', 'no_punch_out_notified')
    except Exception:
        pass
