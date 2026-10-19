"""
Legal & Statutory Compliance Models (PROMPT 12)
"""

from app.modules.projects.models import AuthorityClearance, AuthorityClearanceCondition
from app.modules.operations.models import CourtCase, CourtCaseDocument, CourtCaseHearing
from sqlalchemy import BigInteger, Column, Date, Integer, JSON, String, TIMESTAMP
from sqlalchemy.sql import func
from app.core.database import Base


class LegalComplianceRecord(Base):
    """Configurable operational record supporting the legal-compliance work areas."""

    __tablename__ = "leg_compliance_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    area = Column(String(48), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    reference_no = Column(String(128), nullable=True, index=True)
    project_id = Column(BigInteger, nullable=True, index=True)
    status = Column(String(64), nullable=True, index=True)
    due_date = Column(Date, nullable=True, index=True)
    data = Column(JSON, nullable=False, default=dict)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class LegalAuditEvent(Base):
    """Append-only change history for legal compliance records."""

    __tablename__ = "leg_compliance_audit_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(BigInteger, nullable=True, index=True)
    area = Column(String(48), nullable=False, index=True)
    action = Column(String(16), nullable=False)
    actor = Column(String(128), nullable=False)
    before_data = Column(JSON, nullable=True)
    after_data = Column(JSON, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)

__all__ = [
    "AuthorityClearance",
    "AuthorityClearanceCondition",
    "CourtCase",
    "CourtCaseDocument",
    "CourtCaseHearing",
    "LegalComplianceRecord",
    "LegalAuditEvent",
]
