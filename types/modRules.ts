// types/modRules.ts — advanced auto-moderation rule shapes (Pro).

export type ModRuleType = 'pattern' | 'keyword' | 'link_count' | string;
export type ModRuleAction = 'flag' | 'spam' | 'trash' | 'hold' | string;

/** A configured auto-moderation rule. */
export interface ModRule {
  id: number;
  name: string;
  type: ModRuleType;
  pattern: string;
  action: ModRuleAction;
  enabled: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Per-rule match statistics. */
export interface ModRuleStats {
  rule_id: number;
  matches: number;
  last_matched_at: string | null;
  actions_taken?: number;
}

/** Body for POST /moderation/rules. */
export interface CreateModRuleBody {
  name: string;
  type: ModRuleType;
  pattern: string;
  action: ModRuleAction;
  enabled?: boolean;
}

/** Body for PATCH /moderation/rules/{id}. */
export type UpdateModRuleBody = Partial<CreateModRuleBody>;
