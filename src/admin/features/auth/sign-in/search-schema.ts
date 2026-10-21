import { z } from 'zod'

export const signInSearchSchema = z.object({
  redirect: z.string().optional(),
})
