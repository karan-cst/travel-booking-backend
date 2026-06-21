import { z } from 'zod';

export const webhookSchema = {
  body: z.object({
    id: z.string({ required_error: 'Event ID is required' }),
    type: z.string({ required_error: 'Event type is required' }),
    data: z.object({
      object: z.object({
        id: z.string({ required_error: 'Payment ID is required' }),
        metadata: z.object({
          bookingId: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, 'Invalid booking ID format'),
        }),
      }),
    }),
  }),
};

export type WebhookInput = {
  body: z.infer<typeof webhookSchema.body>;
};
