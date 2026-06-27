// types/auth.ts — credential + auth-flow shapes (foundation-owned).

/** An Application Password credential pair for a single site. */
export interface Credentials {
  user: string;
  appPassword: string;
}

/** Body for POST /auth/register (honeypot `website` always sent as ''). */
export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  captcha_token?: string;
  /** Honeypot — always send '' from a real client. */
  website?: string;
  /** Epoch seconds at form mount (anti-bot timing). */
  loaded_at?: number;
}

/** Generic message response from /auth/* convenience routes. */
export interface AuthMessageResponse {
  success: boolean;
  message: string;
  requires_verification?: boolean;
}
