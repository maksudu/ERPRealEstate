export interface LookupItem {
  id: number;
  category_id: number;
  item_code: string;
  item_name_en: string;
  item_name_bn: string;
  parent_id?: number | null;
  color_badge?: string | null;
  sort_order: number;
  metadata?: Record<string, any> | null;
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface LookupCategory {
  id: number;
  category_code: string;
  category_name: string;
  description?: string | null;
  is_hierarchical: boolean;
  is_system_locked: boolean;
  is_active: boolean;
  items?: LookupItem[];
}

export interface QuickCreateLookupPayload {
  item_name_en: string;
  item_name_bn?: string;
  item_code?: string;
  color_badge?: string;
}
