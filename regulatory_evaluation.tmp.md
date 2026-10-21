# Evaluation — Attempt 1

## Overall Verdict: NEEDS REVISION

## Overall Assessment
The update keeps the familiar ERP card, form-control, and status-badge language while adding useful Bangladesh-specific jurisdiction guidance and approval-evidence checks. Source review shows two important edge cases remain: authority suggestions can silently fall back to RAJUK or overwrite a user's choice, and legacy records are treated as verified based only on the attestation flag. The route redirected to sign-in, so the target page could not be inspected at desktop, tablet, or mobile sizes; findings are source-only.

## Scores
| Criterion | Score | Status | Weight | Notes |
|-----------|-------|--------|--------|-------|
| Design Quality | 2/3 | PASS | HIGH | The form's numbered card sections, semantic color tokens, shared controls, and clear regulatory notice fit the existing ERP UI. The nine-column list is information-dense, and runtime layout could not be confirmed. |
| Originality | 1/3 | FAIL | HIGH | The page is a conventional enterprise form and data table with no distinctive visual treatment. Preserving the ERP design system is appropriate, but the update itself remains largely standard UI composition. |
| Craft | 1/3 | PASS | MEDIUM | Labels and grouped fields provide a usable hierarchy, but many labels/table details use very small text, and the secondary modal uses a native status select unlike the shared searchable controls. Responsive behavior was not observable. |
| Functionality | 1/3 | PASS | MEDIUM | The form wires project/type-based suggestions and conditional approval-evidence validation; the list also flags some legacy records. The authority fallback/override behavior and incomplete legacy-evidence check weaken those safeguards. |

## What's Working Well
- The form states that BNBC 2020 and authority-specific rules vary, and tells staff to confirm applicability rather than presenting a blanket rule.
- Competent authority is visible as an editable selection, with a note explaining that type-based suggestions require confirmation.
- Setting status to `APPROVED` requires a memo number, approval date, HTTP(S) document URL, and checked internal attestation in both the main form and clearance modal. The copy clarifies that the system does not independently authenticate the evidence.
- The main list uses an amber `APPROVED · EVIDENCE UNVERIFIED` badge and excludes unattested records from its verified-approved KPI.
- Main form/list controls largely reuse the ERP's shared components, card patterns, and semantic theme tokens.

## Issues Found
### Issue 1: Authority suggestion can misstate jurisdiction or erase a manual choice
- **What**: `applyRecommendedAuthority()` substitutes `RAJUK` when a project's development authority is missing, and every project/type change patches the authority field unconditionally. A user's manual correction can therefore be overwritten, while projects without configured jurisdiction may silently appear RAJUK-governed. The jurisdiction note displays the project's development authority, not necessarily the authority currently selected for a type such as Fire NOC.
- **Where**: `approval-form.component.ts`, `authority_name` default, `onProjectSelected()`, `onClearanceTypeSelected()`, `selectedProjectAuthority()`, and `applyRecommendedAuthority()`.
- **Why it matters**: A plausible but wrong authority is especially risky for compliance staff and obscures the distinction between project jurisdiction and a type-specific competent authority.
- **Suggested fix**: Do not default missing/unknown project authorities to RAJUK. Show an explicit “authority not configured—confirm/select” state, label the project jurisdiction separately from the selected/suggested authority, and preserve a manual override unless the user explicitly chooses to reapply the suggestion.

### Issue 2: Legacy “verified” state is based only on the checkbox flag
- **What**: The main list marks an `APPROVED` record verified whenever `approval_evidence_verified === true`; it does not also require a memo number, approval date, and document URL. The secondary list uses the same flag-only test. Such a record can get the green/normal approved state even when evidence is incomplete; the main list can simultaneously display its approval date as green “Pending.”
- **Where**: `regulatory-approvals.component.ts` status label/class helpers and approved-count calculation; `clearances.component.ts` `isUnverifiedApproval()`; main list approval-date cell.
- **Why it matters**: Existing or inconsistent data may still look trustworthy despite missing evidence, undermining the intended warning for legacy approvals.
- **Suggested fix**: Define “evidence verified” consistently from both a true attestation and complete required evidence fields. Use the amber unverified state and a non-green missing-date treatment otherwise; consider making the unverified count/filter directly actionable.

### Issue 3: Approval attestation and validation feedback could be clearer
- **What**: In the main form the attestation checkbox remains visible for statuses other than `APPROVED`, although it is only required for `APPROVED`. On invalid submission, the template shows a single combined save error rather than identifying which evidence field needs attention. The modal gates the checkbox by status, so the two entry paths differ.
- **Where**: `approval-form.component.ts` evidence section and `saveClearance()`; `clearances.component.html` evidence section.
- **Why it matters**: Staff may not know when the attestation applies or how to fix a failed save, and the same approval control behaves differently between the full form and quick-edit modal.
- **Suggested fix**: Show the attestation only while status is `APPROVED` (or clearly mark it optional otherwise), align the two entry paths, and surface field-level required/URL/attestation errors alongside the summary alert.

### Issue 4: Secondary modal diverges from the shared form controls
- **What**: The edit modal uses a native hard-coded status `<select>` while the main form uses `app-searchable-select` and shared controls.
- **Where**: `clearances.component.html`, “Permit Status” field.
- **Why it matters**: The separate editing path looks and behaves differently from the rest of the updated ERP UI.
- **Suggested fix**: Use the shared searchable-select with the same status options and match the main form's control/validation conventions.

## Priority Fixes for Next Attempt
1. Remove the silent RAJUK fallback and prevent automatic project/type suggestions from overwriting a manual authority choice; distinguish project jurisdiction from the selected competent authority.
2. Compute warning/verified states from the attestation **and** memo/date/document completeness in both lists, and avoid presenting missing approval dates as green.
3. Align attestation visibility and field-level validation feedback across the main form and secondary modal; migrate the modal status control to the shared select.

## Should the next attempt REFINE or PIVOT?
**REFINE.** The existing ERP visual language is coherent and suitable for this operational workflow. Keep that direction while tightening authority-state communication and making the legacy-evidence warning reflect the actual completeness of the record.

## Evaluation Limitation
Opening `/projects/regulatory-approvals` redirected to the sign-in page. No authenticated page screenshots, interaction checks, or viewport/responsive checks were possible; this evaluation is based on the supplied Angular source.
