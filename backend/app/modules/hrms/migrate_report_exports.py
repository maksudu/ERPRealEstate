import asyncio

from sqlalchemy import inspect, text

from app.core.database import engine
from app.modules.hrms.models import EmployeeTransferHistory, HRReportExportAudit


async def migrate_report_export_support():
    async with engine.begin() as connection:
        await connection.run_sync(EmployeeTransferHistory.__table__.create, checkfirst=True)
        await connection.run_sync(HRReportExportAudit.__table__.create, checkfirst=True)
        columns = await connection.run_sync(
            lambda sync_connection: {
                column["name"] for column in inspect(sync_connection).get_columns(HRReportExportAudit.__tablename__)
            }
        )
        preparer = connection.dialect.identifier_preparer
        table = preparer.quote(HRReportExportAudit.__tablename__)
        if "outcome" not in columns:
            await connection.execute(text(f"ALTER TABLE {table} ADD COLUMN outcome VARCHAR(20) NOT NULL DEFAULT 'SUCCESS'"))
        if "reason" not in columns:
            await connection.execute(text(f"ALTER TABLE {table} ADD COLUMN reason TEXT NULL"))
    print("[Migration] HR report transfer and export-audit support is ready.")


if __name__ == "__main__":
    asyncio.run(migrate_report_export_support())
