import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).optional(),
});

export const chatSuggestionsSchema = z.object({
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ChatSuggestionsInput = z.infer<typeof chatSuggestionsSchema>;
