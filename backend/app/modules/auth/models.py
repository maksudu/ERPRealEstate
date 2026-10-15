from sqlalchemy import Column, BigInteger, String, Boolean, JSON, ForeignKey, TIMESTAMP, DateTime, Enum, func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum

class AuditActionType(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    CUSTOM = "CUSTOM"

class Organization(Base):
    __tablename__ = "sys_organizations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_code = Column(String(32), unique=True, nullable=False, index=True)
    legal_name_en = Column(String(191), nullable=False)
    legal_name_bn = Column(String(191), nullable=False)
    tin_number = Column(String(64), nullable=True)
    bin_vat_number = Column(String(64), nullable=True)
    rehab_membership_number = Column(String(64), nullable=True)
    parent_organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Self-referential hierarchy
    parent = relationship("Organization", remote_side=[id], backref="subsidiaries")
    users = relationship("User", back_populates="organization")


class Role(Base):
    __tablename__ = "sys_roles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    role_code = Column(String(64), unique=True, nullable=False, index=True)
    role_name = Column(String(128), nullable=False)
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())


class User(Base):
    __tablename__ = "sys_users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    organization_id = Column(BigInteger, ForeignKey("sys_organizations.id", ondelete="RESTRICT"), nullable=False)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(191), unique=True, nullable=False, index=True)
    phone_number = Column(String(32), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    full_name_en = Column(String(128), nullable=False)
    full_name_bn = Column(String(128), nullable=False)
    is_group_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="users")
    project_assignments = relationship("UserProjectAssignment", back_populates="user", cascade="all, delete-orphan")


class UserProjectAssignment(Base):
    __tablename__ = "sys_user_project_assignments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("sys_users.id", ondelete="CASCADE"), nullable=False)
    project_id = Column(BigInteger, nullable=False, index=True)
    role_code = Column(String(64), nullable=False)
    can_view_financials = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="project_assignments")


class AuditTrail(Base):
    __tablename__ = "sys_audit_trails"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, primary_key=True, server_default=func.now())
    user_id = Column(BigInteger, nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    microservice_name = Column(String(64), nullable=False)
    entity_name = Column(String(64), nullable=False, index=True)
    entity_id = Column(String(64), nullable=True)
    action_type = Column(Enum(AuditActionType), nullable=False)
    payload_before = Column(JSON, nullable=True)
    payload_after = Column(JSON, nullable=True)
