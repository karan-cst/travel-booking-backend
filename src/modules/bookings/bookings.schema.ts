import { z } from 'zod';

export const createBookingSchema = {
  body: z.object({
    packageId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid package ID format'),
  }),
};

export type CreateBookingInput = {
  body: z.infer<typeof createBookingSchema.body>;
};
