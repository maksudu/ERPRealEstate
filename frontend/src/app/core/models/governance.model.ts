export interface ApprovalPolicyRule {
  id?: number;
  policy_id?: number;
  tier_level: number;
  tier_name: string;
  min_threshold: number;
  max_threshold?: number | null;
  required_role: string;
  approver_user_id?: number | null;
  is_mandatory: boolean;
  sla_hours: number;
  auto_escalate: boolean;
  created_at?: string;
}

export interface ApprovalPolicy {
  id: number;
  policy_code: string;
  policy_name: string;
  document_type: string;
  project_id?: number | null;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  rules: ApprovalPolicyRule[];
}

export interface ApprovalStep {
  id: number;
  request_id: number;
  tier_level: number;
  tier_name: string;
  required_role: string;
  assigned_user_id?: number | null;
  assigned_user_name?: string | null;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED' | 'SKIPPED';
  action_by_user_id?: number | null;
  action_by_user_name?: string | null;
  action_timestamp?: string | null;
  action_ip_address?: string | null;
  comments?: string | null;
  verification_hash?: string | null;
  notification_sent_web: boolean;
  notification_sent_email: boolean;
  notification_sent_mobile: boolean;
  created_at?: string;
}

export interface ApprovalAuditLog {
  id: number;
  request_id: number;
  step_id?: number | null;
  action: string;
  performed_by_id?: number | null;
  performed_by_name: string;
  ip_address?: string | null;
  user_agent?: string | null;
  field_changes?: any;
  comment?: string | null;
  timestamp?: string;
}

export interface ApprovalRequest {
  id: number;
  request_number: string;
  document_type: string;
  document_id: string;
  document_reference_no: string;
  project_id?: number | null;
  maker_user_id?: number | null;
  maker_user_name: string;
  maker_notes?: string | null;
  financial_amount: number;
  total_tiers: number;
  current_tier: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED';
  final_action_timestamp?: string | null;
  document_summary?: any;
  created_at?: string;
  updated_at?: string;
  steps?: ApprovalStep[];
  audit_logs?: ApprovalAuditLog[];
}

export interface GovernanceNotification {
  id: number;
  recipient_user_id: number;
  request_id?: number | null;
  channel: 'WEB' | 'EMAIL' | 'MOBILE_PUSH';
  title: string;
  body: string;
  action_url?: string | null;
  status: 'QUEUED' | 'DELIVERED' | 'READ';
  created_at?: string;
}

export interface GovernanceMetrics {
  total_pending_requests: number;
  total_approved_requests: number;
  total_rejected_requests: number;
  total_correction_requests: number;
  average_sla_hours: number;
  active_policies_count: number;
}
