import pytest
from decimal import Decimal
from app.modules.accounts.services import post_double_entry_voucher

@pytest.mark.asyncio
async def test_unbalanced_voucher_rejected_with_400(async_client, admin_headers):
    """
    Posting a voucher where Total Debit != Total Credit must be rejected with 400 Bad Request.
    """
    unbalanced_payload = {
        "voucher_type": "Journal",
        "voucher_date": "2026-10-16",
        "project_id": 1,
        "narration": "Unbalanced Test Voucher",
        "entries": [
            {
                "account_id": 1,
                "debit_amount": 100000.00,
                "credit_amount": 0.00,
                "narration": "WIP Cost Debit"
            },
            {
                "account_id": 2,
                "debit_amount": 0.00,
                "credit_amount": 80000.00,  # Difference of 20,000!
                "narration": "Accounts Payable Credit"
            }
        ]
    }
    response = await async_client.post(
        "/api/v1/accounts/vouchers",
        headers=admin_headers,
        json=unbalanced_payload
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "Double-entry balance violation" in detail
    assert "Total Debit" in detail and "Total Credit" in detail


@pytest.mark.asyncio
async def test_single_line_voucher_rejected_with_400(async_client, admin_headers):
    """
    A double-entry voucher must contain at least 2 entry lines.
    """
    single_line_payload = {
        "voucher_type": "Journal",
        "voucher_date": "2026-10-16",
        "narration": "Single Line Violation",
        "entries": [
            {
                "account_id": 1,
                "debit_amount": 50000.00,
                "credit_amount": 0.00
            }
        ]
    }
    response = await async_client.post(
        "/api/v1/accounts/vouchers",
        headers=admin_headers,
        json=single_line_payload
    )
    assert response.status_code == 400
    assert "at least 2 entry lines" in response.json()["detail"]


@pytest.mark.asyncio
async def test_zero_amount_voucher_rejected_with_400(async_client, admin_headers):
    """
    Vouchers with 0.00 amount must be rejected with 400 Bad Request.
    """
    zero_payload = {
        "voucher_type": "Journal",
        "voucher_date": "2026-10-16",
        "narration": "Zero Amount Violation",
        "entries": [
            {"account_id": 1, "debit_amount": 0.00, "credit_amount": 0.00},
            {"account_id": 2, "debit_amount": 0.00, "credit_amount": 0.00}
        ]
    }
    response = await async_client.post(
        "/api/v1/accounts/vouchers",
        headers=admin_headers,
        json=zero_payload
    )
    assert response.status_code == 400
    assert "greater than zero" in response.json()["detail"]


@pytest.mark.asyncio
async def test_post_double_entry_service_math_safety():
    """
    Direct service check: post_double_entry_voucher raises ValueError on unequal debits and credits.
    """
    unbalanced_lines = [
        {"account_code": "11010", "account_name_en": "Cash", "account_type": "Asset", "debit": 5000, "credit": 0},
        {"account_code": "21030", "account_name_en": "Advance", "account_type": "Liability", "debit": 0, "credit": 4900}
    ]
    with pytest.raises(ValueError) as exc:
        await post_double_entry_voucher(
            db=None,
            organization_id=1,
            project_id=1,
            voucher_type="Cash_Receipt",
            narration="Test",
            line_entries=unbalanced_lines
        )
    assert "Unbalanced Double-Entry" in str(exc.value)
