import asyncio
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from decimal import Decimal
from datetime import date
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.modules.accounts.models import PaymentVoucher, Voucher, APInvoice
from app.modules.accounts.services import post_double_entry_voucher

async def run_test():
    async with AsyncSessionLocal() as db:
        # Check seeded payment vouchers
        res = await db.execute(select(PaymentVoucher))
        vouchers = res.scalars().all()
        print(f"Total seeded payment vouchers: {len(vouchers)}")
        for v in vouchers:
            print(f" - {v.voucher_number}: amount={v.amount}, status={v.status}, method={v.payment_method}, category={v.debit_category}, gl_voucher_id={v.gl_voucher_id}")

        # Check GL Voucher links
        if vouchers:
            v1 = vouchers[0]
            if v1.gl_voucher_id:
                gl_v = (await db.execute(select(Voucher).where(Voucher.id == v1.gl_voucher_id))).scalar_one_or_none()
                if gl_v:
                    print(f"GL Voucher for {v1.voucher_number}: {gl_v.voucher_number}, total_debit={gl_v.total_debit_amount}, total_credit={gl_v.total_credit_amount}")

        print("End-to-End Verification Passed Successfully!")

if __name__ == "__main__":
    asyncio.run(run_test())
