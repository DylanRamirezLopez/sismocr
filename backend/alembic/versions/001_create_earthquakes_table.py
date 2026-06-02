"""create earthquakes table with postgis

Revision ID: 001
Revises:
Create Date: 2026-06-02 03:30:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    op.create_table(
        "earthquakes",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("external_id", sa.String(255), unique=True, nullable=False),
        sa.Column("magnitude", sa.Float, nullable=False),
        sa.Column("depth_km", sa.Float, nullable=False),
        sa.Column("latitude", sa.Float, nullable=False),
        sa.Column("longitude", sa.Float, nullable=False),
        sa.Column("location_description", sa.Text, nullable=True),
        sa.Column("province", sa.String(100), nullable=True),
        sa.Column(
            "source",
            sa.Enum("usgs", "ovsicori", "rsn", "merged", name="sourceenum"),
            nullable=False,
            server_default="usgs",
        ),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index("ix_earthquakes_external_id", "earthquakes", ["external_id"])
    op.create_index("ix_earthquakes_magnitude", "earthquakes", ["magnitude"])
    op.create_index("ix_earthquakes_occurred_at", "earthquakes", ["occurred_at"])

    op.execute(
        """
        SELECT AddGeometryColumn('earthquakes', 'location', 4326, 'POINT', 2)
        """
    )
    op.create_index("ix_earthquakes_location_gist", "earthquakes", [sa.text("location")], postgresql_using="gist")

    op.execute(
        """
        CREATE INDEX ix_earthquakes_occurred_at_brin
        ON earthquakes USING brin (occurred_at)
        WITH (pages_per_range = 32)
        """
    )


def downgrade() -> None:
    op.drop_table("earthquakes")
    op.execute("DROP TYPE IF EXISTS sourceenum")
