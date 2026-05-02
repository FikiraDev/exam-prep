import { describe, expect, it } from 'vitest'

import { addSchema, editSchema } from './todo-validation'

describe('todo validation', () => {
  const cases = [
    {
      label: 'add',
      schema: addSchema,
      validText: '  Review flashcards  ',
      expected: 'Review flashcards',
    },
    {
      label: 'edit',
      schema: editSchema,
      validText: '  Update study plan  ',
      expected: 'Update study plan',
    },
  ]

  it.each(cases)('rejects whitespace-only $label input', ({ schema }) => {
    expect(schema.safeParse({ text: '   ' }).success).toBe(false)
  })

  it.each(cases)('submits trimmed $label input', ({ expected, schema, validText }) => {
    expect(schema.parse({ text: validText })).toEqual({ text: expected })
  })
})
