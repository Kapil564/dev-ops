from alembic import op
import sqlalchemy as sa

revision = "0002_create_inventory_items"
down_revision = "0001_create_tasks"
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "inventory_items" not in inspector.get_table_names():
        op.create_table(
            "inventory_items",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("sku", sa.String(length=80), nullable=False, unique=True),
            sa.Column("category", sa.String(length=80), nullable=False, server_default="General"),
            sa.Column("quantity", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("unit_price", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="IN_STOCK"),
            sa.Column("supplier", sa.String(length=150), nullable=False, server_default="Primary Vendor"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

def downgrade():
    op.drop_table("inventory_items")
