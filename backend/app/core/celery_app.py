import logging
from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

logger = logging.getLogger("erp.celery")

# Initialize Celery Application with Redis Broker & Result Backend
celery_app = Celery(
    "bangladesh_realestate_erp",
    broker=settings.CELERY_BROKER_URL or settings.REDIS_URL,
    backend=settings.CELERY_RESULT_BACKEND or settings.REDIS_URL,
    include=["app.modules.installments.tasks"]
)

# Celery Configuration & Distributed Beat Periodic Task Schedule
celery_app.conf.update(
    timezone=settings.CELERY_TIMEZONE,
    enable_utc=False,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    task_time_limit=3600,
    worker_prefetch_multiplier=1,
    broker_connection_retry_on_startup=True,
    # Periodic Distributed Beat Tasks
    beat_schedule={
        # 1. Daily 08:00 AM (Dhaka Time): PDC Cheque 3-Day Maturation & SMS Dispatch
        "check-upcoming-pdc-cheques-daily-8am": {
            "task": "app.modules.installments.tasks.check_upcoming_pdc_cheques_task",
            "schedule": crontab(hour=8, minute=0),
            "args": (),
        },
        # 2. Daily 09:00 AM (Dhaka Time): NI Act 1881 Section 138 Statutory Litigation Deadlines
        "check-statutory-ni138-deadlines-daily-9am": {
            "task": "app.modules.installments.tasks.check_statutory_ni138_deadlines_task",
            "schedule": crontab(hour=9, minute=0),
            "args": (),
        },
    },
)

if __name__ == "__main__":
    celery_app.start()
