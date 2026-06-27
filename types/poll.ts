// types/poll.ts — Pro polls (A4). Transcribed from `build_poll_data()`. Every poll
// response from the server is enveloped `{ data: Poll }`; api/polls unwraps it.

export type PollType = 'single' | 'multiple';

export interface PollOption {
  id: number;
  label: string;
  vote_count: number;
  /** 0–100, 1dp, computed over total_votes. */
  percentage: number;
}

export interface Poll {
  id: number;
  post_id: number;
  question: string;
  type: PollType;
  allow_other: boolean;
  closes_at: string | null;
  /** server is_closed() — manual close OR past closes_at. */
  closed: boolean;
  created_by: number;
  created_at: string;
  /** distinct users. */
  total_voters: number;
  /** sum of option vote_count (> voters for multiple-choice). */
  total_votes: number;
  options: PollOption[];
  /** option_ids the caller voted for. */
  user_votes: number[];
}

/** Server wraps every poll payload in `{ data }`. */
export interface PollEnvelope {
  data: Poll;
}
