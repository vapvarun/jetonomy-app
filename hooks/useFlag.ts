// hooks/useFlag.ts — member "report content" mutation.
//
// Wraps api/flags.ts. 409 (already flagged) is mapped to success so the button
// stays in its "Reported" sticky state without an error toast.

import { useMutation } from '@tanstack/react-query';

import { createFlag } from '@/api/flags';
import type { ApiError } from '@/api/client';
import type { CreateFlagBody, FlagResult } from '@/types/moderation';

export function useFlag() {
  return useMutation<FlagResult, ApiError, CreateFlagBody>({
    mutationFn: async (body) => {
      try {
        return await createFlag(body);
      } catch (e) {
        const err = e as ApiError;
        // Already flagged → treat as success (idempotent from the UI's view).
        if (err.status === 409) {
          return { id: 0, status: 'open' };
        }
        throw err;
      }
    },
  });
}
