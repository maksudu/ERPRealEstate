"""
Legal & Statutory Compliance Models (PROMPT 12)
"""

from app.modules.projects.models import AuthorityClearance, AuthorityClearanceCondition
from app.modules.operations.models import CourtCase, CourtCaseDocument, CourtCaseHearing

__all__ = [
    "AuthorityClearance",
    "AuthorityClearanceCondition",
    "CourtCase",
    "CourtCaseDocument",
    "CourtCaseHearing",
]
