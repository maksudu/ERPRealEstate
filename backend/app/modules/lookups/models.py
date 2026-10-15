from sqlalchemy import Column, BigInteger, String, Boolean, Integer, JSON, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.core.database import Base

class LookupCategory(Base):
    __tablename__ = "sys_lookup_categories"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    category_code = Column(String(64), unique=True, nullable=False, index=True)
    category_name = Column(String(128), nullable=False)
    description = Column(String(255), nullable=True)
    is_hierarchical = Column(Boolean, default=False)
    is_system_locked = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    items = relationship("LookupItem", back_populates="category", cascade="all, delete-orphan")


class LookupItem(Base):
    __tablename__ = "sys_lookup_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    category_id = Column(BigInteger, ForeignKey("sys_lookup_categories.id", ondelete="CASCADE"), nullable=False)
    item_code = Column(String(64), nullable=False)
    item_name_en = Column(String(191), nullable=False)
    item_name_bn = Column(String(191), nullable=False)
    parent_id = Column(BigInteger, ForeignKey("sys_lookup_items.id", ondelete="SET NULL"), nullable=True)
    color_badge = Column(String(32), nullable=True)
    sort_order = Column(Integer, default=0)
    metadata_json = Column("metadata", JSON, nullable=True)
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(BigInteger, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    category = relationship("LookupCategory", back_populates="items")
    children = relationship("LookupItem", backref="parent", remote_side=[id])
