import pytest
from datetime import date

@pytest.mark.asyncio
async def test_hierarchical_coa_tree(async_client, admin_headers):
    """
    Test 5-Tier Chart of Accounts Hierarchy retrieval.
    """
    response = await async_client.get(
        "/api/v1/accounts/coa/hierarchy",
        headers=admin_headers
    )
    assert response.status_code == 200
    tree = response.json()
    assert isinstance(tree, list)


@pytest.mark.asyncio
async def test_cost_center_creation_and_variance(async_client, admin_headers):
    """
    Test Cost Center creation and Budget vs Actual Cost Variance report.
    """
    cc_payload = {
        "project_id": 1,
        "cost_center_code": "CC-TEST-SUPER-01",
        "name": "Tower A Superstructure Framing",
        "wbs_stage": "SUPERSTRUCTURE",
        "budget_allocated": 5000000.00,
        "is_active": True
    }
    response = await async_client.post(
        "/api/v1/accounts/cost-centers",
        headers=admin_headers,
        json=cc_payload
    )
    assert response.status_code in [201, 400] # 400 if already created in earlier test run

    # Fetch variance report
    var_res = await async_client.get(
        "/api/v1/accounts/cost-centers/variance",
        headers=admin_headers
    )
    assert var_res.status_code == 200
    data = var_res.json()
    assert "total_budget_allocated" in data
    assert "total_actual_spent" in data
    assert "cost_centers" in data


@pytest.mark.asyncio
async def test_pdc_vault_lifecycle(async_client, admin_headers):
    """
    Test PDC safe vault lifecycle:
    Registration (IN_VAULT) -> Status Update (BOUNCED with Section 138 flag)
    """
    pdc_payload = {
        "project_id": 1,
        "cheque_no": "CHQ-889900",
        "bank_name": "Standard Chartered Bank",
        "branch_name": "Gulshan Branch",
        "drawer_name": "Rahim Chowdhury",
        "cheque_date": "2026-11-15",
        "amount": 2500000.00,
        "status": "IN_VAULT"
    }
    res = await async_client.post(
        "/api/v1/accounts/pdc",
        headers=admin_headers,
        json=pdc_payload
    )
    assert res.status_code == 201
    pdc = res.json()
    assert pdc["status"] == "IN_VAULT"
    assert pdc["amount"] == 2500000.00
    pdc_id = pdc["id"]

    # Transition to BOUNCED
    bounce_payload = {
        "status": "BOUNCED",
        "bounce_reason": "Insufficient Funds"
    }
    update_res = await async_client.patch(
        f"/api/v1/accounts/pdc/{pdc_id}/status",
        headers=admin_headers,
        json=bounce_payload
    )
    assert update_res.status_code == 200
    updated_pdc = update_res.json()
    assert updated_pdc["status"] == "BOUNCED"
    assert updated_pdc["legal_notice_sent"] is True


@pytest.mark.asyncio
async def test_bank_statement_auto_match(async_client, admin_headers):
    """
    Test smart bank statement reconciliation algorithm.
    """
    recon_payload = {
        "bank_account_id": 1,
        "statement_date": "2026-10-17",
        "statement_balance": 1500000.00,
        "rows": [
            {
                "transaction_date": "2026-10-17",
                "reference_no": "TRX-771122",
                "description": "Customer RTGS Deposit",
                "debit_amount": 0.00,
                "credit_amount": 500000.00
            },
            {
                "transaction_date": "2026-10-17",
                "reference_no": "CHQ-00192",
                "description": "Supplier Payment Cheque Clearing",
                "debit_amount": 120000.00,
                "credit_amount": 0.00
            }
        ]
    }
    res = await async_client.post(
        "/api/v1/accounts/bank-reconciliation/auto-match",
        headers=admin_headers,
        json=recon_payload
    )
    assert res.status_code == 200
    data = res.json()
    assert "statement_balance" in data
    assert "book_balance" in data
    assert "difference_amount" in data
    assert len(data["items"]) == 2
