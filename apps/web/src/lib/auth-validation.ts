import { z } from 'zod'

export const PASSWORD_MAX_LENGTH = 128

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(1, 'Enter your password.')
    .max(PASSWORD_MAX_LENGTH, 'Password must be 128 characters or fewer.'),
})

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.'),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(PASSWORD_MAX_LENGTH, 'Password must be 128 characters or fewer.'),
})
