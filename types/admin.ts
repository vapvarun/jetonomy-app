// types/admin.ts — admin caps + free-admin maintenance shapes.
//
// EXTENDS types/user.ts Me (which carries an open `[k: string]: unknown` index)
// — it does NOT duplicate the Me interface. Capabilities are coarse RENDER hints
// only; the server 403 is the authoritative gate (06 spec §Gating).

import type { Me } from '@/types/user';

/** Coarse capability flags surfaced by /users/me. All optional / best-effort. */
export interface Capabilities {
  jetonomy_moderate?: boolean;
  jetonomy_manage_spaces?: boolean;
  manage_options?: boolean;
  jetonomy_flag?: boolean;
  create_spaces?: boolean;
  [k: string]: boolean | undefined;
}

/**
 * Read the capability map off a `Me` defensively. Accepts a `capabilities`
 * object and/or top-level `is_admin` / `can_create_spaces` hints. Never throws.
 */
export function readCapabilities(me: Me | null | undefined): Capabilities {
  if (!me) return {};
  const v = me as Record<string, unknown>;
  const raw = (v.capabilities ?? {}) as Record<string, unknown>;
  const out: Capabilities = {};
  for (const k of Object.keys(raw)) out[k] = Boolean(raw[k]);
  if (v.is_admin) {
    out.manage_options = true;
    out.jetonomy_moderate = true;
    out.jetonomy_manage_spaces = true;
  }
  if (v.can_create_spaces) out.create_spaces = true;
  return out;
}

/** True if the user should see ANY entry into the Manage section. */
export function canManage(caps: Capabilities): boolean {
  return Boolean(
    caps.jetonomy_moderate || caps.jetonomy_manage_spaces || caps.manage_options
  );
}

/** A tile on app/manage/index. */
export interface ManageTile {
  key: string;
  label: string;
  description: string;
  route: string;
  /** Coarse cap this tile needs to be visible (server still re-checks via 403). */
  requires: keyof Capabilities;
}

/** Body for POST /admin/recount. */
export interface RecountRequest {
  /** Which counter set to rebuild (omit for all). */
  type?: string;
}

/** Summary returned by POST /admin/recount. */
export interface RecountResult {
  ok: boolean;
  rebuilt?: string[];
  message?: string;
  [k: string]: unknown;
}

/** Body for POST /admin/users/trust-level. */
export interface TrustLevelBody {
  user_ids: number[];
  trust_level: number;
}

/** Summary returned by POST /admin/users/trust-level. */
export interface TrustLevelResult {
  updated: number;
  failed?: number[];
  message?: string;
}
