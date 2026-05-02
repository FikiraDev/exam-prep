import { z } from 'zod'

export const addSchema = z.object({
  text: z.string().trim().min(1, 'Please add a task before submitting.'),
})

export const editSchema = z.object({
  text: z.string().trim().min(1, 'Task cannot be empty.'),
})
