import { LegalArea } from '../../core/models/legal.model';

export interface LegalField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  lookup?: string;
  hint?: string;
}

const clearanceReviewFields: LegalField[] = [
  { key: 'verification_outcome', label: 'Verification outcome', type: 'select', lookup: 'LEGAL_REVIEW_OUTCOME' },
  { key: 'reviewer_identity', label: 'Reviewer identity' },
  { key: 'authorized_approver', label: 'Authorized approver' },
  { key: 'approval_authorized', label: 'Approval authorized', type: 'checkbox' },
  { key: 'conditions', label: 'Conditions', type: 'textarea', hint: 'One per line: owner | YYYY-MM-DD deadline | condition description.' }
];

export const LEGAL_RECORD_FIELDS: Record<LegalArea, LegalField[]> = {
  land_title: [
    { key: 'project_reference', label: 'Project reference' },
    { key: 'parcel_reference', label: 'Parcel reference' },
    { key: 'mouza', label: 'Mouza' },
    { key: 'dag_numbers', label: 'CS / SA / RS / BS dag numbers' },
    { key: 'ownership_chain_summary', label: 'Ownership-chain summary', type: 'textarea' },
    ...clearanceReviewFields
  ],
  registered_record: [
    { key: 'record_type', label: 'Record type', type: 'select', lookup: 'LEGAL_RECORD_TYPE' },
    { key: 'deed_number', label: 'Deed number' },
    { key: 'khatian_number', label: 'Khatian number' },
    { key: 'mutation_reference', label: 'Mutation reference' },
    { key: 'land_tax_period', label: 'Land-tax period' },
    { key: 'issuing_office', label: 'Issuing office' },
    { key: 'document_reference', label: 'Document reference' }
  ],
  developer_registration: [
    { key: 'registration_authority', label: 'Registration authority', type: 'select', lookup: 'STATUTORY_AUTHORITY' },
    { key: 'registration_number', label: 'Registration number' },
    { key: 'renewal_date', label: 'Renewal date', type: 'date' },
    { key: 'expiry_date', label: 'Expiry date', type: 'date' },
    { key: 'application_reference', label: 'Application reference' },
    { key: 'document_reference', label: 'Document reference' }
  ],
  land_use_clearance: [
    { key: 'authority', label: 'Authority', type: 'select', lookup: 'STATUTORY_AUTHORITY' },
    { key: 'land_use_type', label: 'Land-use category', type: 'select', lookup: 'LEGAL_LAND_USE_TYPE' },
    { key: 'sanctioned_plan_reference', label: 'Sanctioned plan reference' },
    { key: 'expiry_date', label: 'Expiry date', type: 'date' },
    ...clearanceReviewFields
  ],
  approval_condition: [
    { key: 'clearance_reference', label: 'Related clearance reference' },
    { key: 'condition_description', label: 'Condition description', type: 'textarea' },
    { key: 'owner', label: 'Condition owner' },
    { key: 'deadline', label: 'Condition deadline', type: 'date' },
    { key: 'evidence_reference', label: 'Evidence reference' },
    { key: 'completion_status', label: 'Completion status', type: 'select', lookup: 'LEGAL_CONDITION_STATUS' }
  ],
  noc_correspondence: [
    { key: 'authority', label: 'Authority', type: 'select', lookup: 'STATUTORY_AUTHORITY' },
    { key: 'correspondence_type', label: 'Correspondence type', type: 'select', lookup: 'LEGAL_CORRESPONDENCE_TYPE' },
    { key: 'subject', label: 'Subject' },
    { key: 'received_date', label: 'Received date', type: 'date' },
    { key: 'response_due_date', label: 'Response due date', type: 'date' },
    { key: 'document_reference', label: 'Document reference' }
  ],
  sale_transfer: [
    { key: 'customer_reference', label: 'Customer reference' },
    { key: 'agreement_type', label: 'Agreement type', type: 'select', lookup: 'LEGAL_AGREEMENT_TYPE' },
    { key: 'agreement_date', label: 'Agreement date', type: 'date' },
    { key: 'registration_deed_number', label: 'Registration deed number' },
    { key: 'transfer_status', label: 'Transfer status', type: 'select', lookup: 'LEGAL_TRANSFER_STATUS' },
    { key: 'document_reference', label: 'Document reference' }
  ],
  litigation_notice: [
    { key: 'case_type', label: 'Case / notice type', type: 'select', lookup: 'LEGAL_CASE_TYPE' },
    { key: 'court_or_authority', label: 'Court or issuing authority' },
    { key: 'case_number', label: 'Case / notice number' },
    { key: 'party_names', label: 'Parties' },
    { key: 'appointed_advocate', label: 'Appointed advocate' },
    { key: 'next_hearing_date', label: 'Next hearing date', type: 'date' },
    { key: 'risk_level', label: 'Risk level', type: 'select', lookup: 'LEGAL_RISK_LEVEL' },
    { key: 'notice_summary', label: 'Notice / dispute summary', type: 'textarea' }
  ],
  document_archive: [
    { key: 'document_type', label: 'Document type', type: 'select', lookup: 'LEGAL_DOCUMENT_TYPE' },
    { key: 'version_number', label: 'Version number' },
    { key: 'document_reference', label: 'File / archive reference' },
    { key: 'checksum', label: 'Integrity checksum' },
    { key: 'confidentiality', label: 'Confidentiality classification', type: 'select', lookup: 'LEGAL_CONFIDENTIALITY' },
    { key: 'previous_version_reference', label: 'Previous version reference' }
  ],
  calendar_reminder: [
    { key: 'reminder_type', label: 'Reminder type', type: 'select', lookup: 'LEGAL_REMINDER_TYPE' },
    { key: 'owner', label: 'Reminder owner' },
    { key: 'reminder_date', label: 'Reminder date', type: 'date' },
    { key: 'repeat_rule', label: 'Repeat rule', type: 'select', lookup: 'LEGAL_REPEAT_RULE' },
    { key: 'related_record_reference', label: 'Related record reference' },
    { key: 'notes', label: 'Notes', type: 'textarea' }
  ],
  approval_workflow: [
    { key: 'workflow_type', label: 'Workflow type', type: 'select', lookup: 'LEGAL_WORKFLOW_TYPE' },
    { key: 'reviewer_identity', label: 'Reviewer identity' },
    { key: 'authorized_approver', label: 'Authorized approver' },
    { key: 'approval_stage', label: 'Approval stage', type: 'select', lookup: 'LEGAL_APPROVAL_STAGE' },
    { key: 'decision_date', label: 'Decision date', type: 'date' },
    { key: 'decision_notes', label: 'Decision notes', type: 'textarea' }
  ],
  compliance_report: [
    { key: 'report_type', label: 'Report type', type: 'select', lookup: 'LEGAL_REPORT_TYPE' },
    { key: 'period_start', label: 'Period start', type: 'date' },
    { key: 'period_end', label: 'Period end', type: 'date' },
    { key: 'report_scope', label: 'Report scope', type: 'textarea' },
    { key: 'prepared_by', label: 'Prepared by' },
    { key: 'report_notes', label: 'Report notes', type: 'textarea' }
  ]
};
