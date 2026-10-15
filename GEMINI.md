# AGENT WORKFLOW & TOKEN EFFICIENCY INSTRUCTIONS

> **Note for AI Assistant**: Read and adhere strictly to these rules in every conversation.

---

### 1. Token & Context Conservation (অযথা টোকেন নষ্ট না করা)
- **Do not read gigantic files unnecessarily**: Never load huge log files, binary assets, or full hundreds-of-lines files if line-range searches (`view_file` with `StartLine`/`EndLine`) or `grep_search` are sufficient.
- **Concise & Direct Responses**: Keep answers concise, clear, and directly focused on the user's question or task. Avoid unnecessary repetitions, lengthy conversational filler, or verbose status recaps.
- **Single-shot targeted edits**: Perform file edits accurately using targeted snippets rather than replacing entire large files.

---

### 2. Project Architecture & Assets Guidelines
- **Frontend Assets**:
  - UI assets must be organized inside `frontend/src/assets/images/` under page-specific subdirectories (`auth/`, `dashboard/`, `parcels/`, `common/`) and `frontend/src/assets/icons/`.
  - When adding or changing images, use appropriate relative assets paths (`assets/images/...`) inside Angular templates or styles.
- **Backend File Uploads**:
  - Uploaded files belong in `backend/app/static/uploads/` (categorized into `parcel_events/`, `signatures/`, `users/`).
  - Never place user-uploaded dynamic assets inside frontend source code.

---

### 3. Execution & Verification Rules
- Do not recreate already completed modules or re-run destructive migration scripts unless explicitly requested.
- Always verify file existence before attempting actions.
