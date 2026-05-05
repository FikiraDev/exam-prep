import { useEffect, useRef, useState } from 'react'

import { useForm } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'

import { useMutation, useQuery } from 'convex/react'

import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Field, FieldError, FieldLabel } from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import { Progress, ProgressIndicator, ProgressTrack } from '#/components/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { authClient } from '#/lib/auth-client'
import { addSchema, editSchema } from '#/lib/todo-validation'
import {
  CheckCheckIcon,
  CircleDashedIcon,
  LogOutIcon,
  PencilLineIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react'

import type { Doc, Id } from '../../../../../convex/_generated/dataModel'

import { api } from '../../../../../convex/_generated/api'

const SIGN_OUT_SKELETON_ITEM_CLASS = 'h-4 w-1/2 rounded bg-muted'

const SKELETON_WIDTHS = ['w-3/4', 'w-[55%]', 'w-[65%]'] as const

function DashboardPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-xl flex-col gap-8">{children}</div>
    </main>
  )
}

function TodoListSkeleton() {
  return (
    <div className="divide-y divide-border/50" role="list">
      {SKELETON_WIDTHS.map((width) => (
        <div className="flex animate-pulse items-center gap-3 py-3" key={width}>
          <div className="size-4 shrink-0 rounded bg-muted" />
          <div className={`h-3.5 rounded bg-muted ${width}`} />
        </div>
      ))}
    </div>
  )
}

export function DashboardPending() {
  return (
    <DashboardPageLayout>
      <div className="flex items-start justify-between gap-4">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 flex-1 animate-pulse rounded-md bg-muted" />
        <div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
      </div>
      <TodoListSkeleton />
    </DashboardPageLayout>
  )
}

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardRouteComponent,
  pendingComponent: DashboardPending,
  head: () => ({
    meta: [
      { title: 'Exam Prep | Focus Board' },
      { name: 'description', content: 'A focused task board backed by live Convex data.' },
    ],
  }),
})

type Todo = Doc<'todos'>
type TodoFieldErrors = React.ComponentProps<typeof FieldError>['errors']

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function getStats(todos: Todo[]) {
  const total = todos.length
  const completed = todos.filter((t) => t.completed).length
  const active = total - completed
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100)
  return { total, completed, active, completionRate }
}

function getDashboardData(todoData: Todo[] | undefined) {
  const todos = todoData ?? []
  return {
    todos,
    isLoading: todoData === undefined,
    hasTodos: todos.length > 0,
    stats: getStats(todos),
  }
}

function TodoForm({ children, onSubmit }: { children: React.ReactNode; onSubmit: () => void }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
    >
      {children}
    </form>
  )
}

function TodoFieldLabel({ label, labelFor }: { label?: string; labelFor?: string }) {
  if (!label) {
    return null
  }

  return (
    <FieldLabel className="sr-only" htmlFor={labelFor}>
      {label}
    </FieldLabel>
  )
}

function TodoFieldErrors({ errors }: { errors: TodoFieldErrors }) {
  if (!errors?.length) {
    return null
  }

  return <FieldError errors={errors} />
}

function TodoTextField({
  errors,
  label,
  labelFor,
  renderInput,
}: {
  errors: TodoFieldErrors
  label?: string
  labelFor?: string
  renderInput: (isInvalid: boolean) => React.ReactNode
}) {
  const isInvalid = !!errors?.length

  return (
    <Field data-invalid={isInvalid || undefined}>
      <TodoFieldLabel label={label} labelFor={labelFor} />
      {renderInput(isInvalid)}
      <TodoFieldErrors errors={errors} />
    </Field>
  )
}

function AddTodoForm({ inputRef }: { inputRef: React.Ref<HTMLInputElement> }) {
  const addTodo = useMutation(api.todos.add)
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: { text: '' },
    validators: { onSubmit: addSchema },
    onSubmit: async ({ value, formApi }) => {
      setFormError(null)
      try {
        await addTodo({ text: value.text })
        formApi.reset()
      } catch (error) {
        console.error('Failed to add todo', error)
        setFormError(getErrorMessage(error, 'Unable to add task.'))
      }
    },
  })

  return (
    <div className="flex flex-col gap-2">
      <TodoForm onSubmit={() => void form.handleSubmit()}>
        <form.Field name="text">
          {(field) => (
            <TodoTextField
              errors={field.state.meta.errors}
              label="Next task"
              labelFor={field.name}
              renderInput={(isInvalid) => (
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    id={field.name}
                    aria-invalid={isInvalid || undefined}
                    className="flex-1"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Add a task..."
                    value={field.state.value}
                  />
                  <form.Subscribe selector={(s) => s.isSubmitting}>
                    {(isSubmitting) => (
                      <Button disabled={isSubmitting} type="submit">
                        <PlusIcon data-icon="inline-start" />
                        Add
                      </Button>
                    )}
                  </form.Subscribe>
                </div>
              )}
            />
          )}
        </form.Field>
      </TodoForm>
      {formError ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}
    </div>
  )
}

type TodoActionOptions = {
  fallbackMessage: string
  logMessage: string
  run: () => Promise<unknown>
}

function useTodoActions({
  editingId,
  setEditingId,
  setActionError,
}: {
  editingId: Id<'todos'> | null
  setEditingId: React.Dispatch<React.SetStateAction<Id<'todos'> | null>>
  setActionError: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const updateTodo = useMutation(api.todos.update)
  const removeTodo = useMutation(api.todos.remove)
  const toggleTodo = useMutation(api.todos.toggle)

  async function runTodoAction({ fallbackMessage, logMessage, run }: TodoActionOptions) {
    setActionError(null)
    try {
      await run()
    } catch (error) {
      console.error(logMessage, error)
      setActionError(getErrorMessage(error, fallbackMessage))
    }
  }

  function saveEdit(id: Id<'todos'>, text: string) {
    return runTodoAction({
      fallbackMessage: 'Unable to save task.',
      logMessage: 'Failed to save todo',
      run: async () => {
        await updateTodo({ id, text })
        setEditingId(null)
      },
    })
  }

  function removeItem(id: Id<'todos'>) {
    return runTodoAction({
      fallbackMessage: 'Unable to delete task.',
      logMessage: 'Failed to remove todo',
      run: async () => {
        await removeTodo({ id })
        if (editingId === id) {
          setEditingId(null)
        }
      },
    })
  }

  function toggleItem(id: Id<'todos'>) {
    return runTodoAction({
      fallbackMessage: 'Unable to update task.',
      logMessage: 'Failed to toggle todo',
      run: async () => await toggleTodo({ id }),
    })
  }

  return { saveEdit, removeItem, toggleItem }
}

function DashboardRouteComponent() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  async function handleSignOut() {
    setActionError(null)
    // Set signing-out FIRST so the query-heavy subtree unmounts before
    // signOut() clears the session, preventing Convex errors from
    // propagating to the route errorComponent.
    setIsSigningOut(true)
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            // ConvexQueryClient uses `expectAuth: true`, and the current
            // Convex + Better Auth TanStack Start guidance recommends a full
            // document navigation after sign-out so stale authenticated
            // subscriptions cannot fire before auth resets.
            globalThis.location.assign('/login')
          },
        },
      })
    } catch (error) {
      console.error('Failed to sign out', error)
      setIsSigningOut(false)
      setActionError(getErrorMessage(error, 'Unable to sign out.'))
    }
  }

  if (isSigningOut) {
    return (
      <DashboardPageLayout>
        <div className="flex animate-pulse items-center gap-3 py-3">
          <div className={SIGN_OUT_SKELETON_ITEM_CLASS} />
        </div>
      </DashboardPageLayout>
    )
  }

  return (
    <DashboardContent
      actionError={actionError}
      isHydrated={isHydrated}
      setActionError={setActionError}
      onSignOut={() => void handleSignOut()}
    />
  )
}

function DashboardContent({
  actionError,
  isHydrated,
  setActionError,
  onSignOut,
}: {
  actionError: string | null
  isHydrated: boolean
  setActionError: React.Dispatch<React.SetStateAction<string | null>>
  onSignOut: () => void
}) {
  const todoData = useQuery(api.todos.list)
  const addInputRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<Id<'todos'> | null>(null)
  const { saveEdit, removeItem, toggleItem } = useTodoActions({
    editingId,
    setEditingId,
    setActionError,
  })

  const { todos, isLoading, hasTodos, stats } = getDashboardData(todoData)

  function focusAddInput() {
    addInputRef.current?.focus()
  }
  return (
    <DashboardPageLayout>
      <div className="flex items-start justify-between gap-4">
        <BoardHeader hasTodos={hasTodos} isLoading={isLoading} stats={stats} />
        <Button
          disabled={!isHydrated}
          onClick={onSignOut}
          size="sm"
          type="button"
          variant="outline"
        >
          <LogOutIcon data-icon="inline-start" />
          Sign out
        </Button>
      </div>

      <AddTodoForm inputRef={addInputRef} />

      {actionError ? (
        <p className="-my-4 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <BoardContent
        editingId={editingId}
        hasTodos={hasTodos}
        isLoading={isLoading}
        onAddFirst={focusAddInput}
        onCancelEdit={() => setEditingId(null)}
        onRemove={removeItem}
        onSaveEdit={saveEdit}
        onStartEdit={setEditingId}
        onToggle={toggleItem}
        todos={todos}
      />
    </DashboardPageLayout>
  )
}

function BoardHeader({
  hasTodos,
  isLoading,
  stats,
}: {
  hasTodos: boolean
  isLoading: boolean
  stats: ReturnType<typeof getStats>
}) {
  if (isLoading || !hasTodos) {
    return <h1 className="text-xl font-semibold tracking-tight">Focus Board</h1>
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Focus Board</h1>
        <span className="text-border select-none">|</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {stats.total} total&nbsp;·&nbsp;{stats.active} active&nbsp;·&nbsp;{stats.completed}{' '}
          done&nbsp;·&nbsp;{stats.completionRate}%
        </span>
      </div>
      <Progress
        aria-valuetext={`${stats.completionRate}% complete`}
        className="w-full"
        value={stats.completionRate}
      >
        <ProgressTrack className="h-1">
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
    </div>
  )
}

type BoardContentProps = {
  editingId: Id<'todos'> | null
  hasTodos: boolean
  isLoading: boolean
  onAddFirst: () => void
  onCancelEdit: () => void
  onRemove: (id: Id<'todos'>) => Promise<void>
  onSaveEdit: (id: Id<'todos'>, text: string) => Promise<void>
  onStartEdit: (id: Id<'todos'>) => void
  onToggle: (id: Id<'todos'>) => Promise<void>
  todos: Todo[]
}

function BoardContent({
  isLoading,
  hasTodos,
  onAddFirst,
  todos,
  editingId,
  onCancelEdit,
  onRemove,
  onSaveEdit,
  onStartEdit,
  onToggle,
}: BoardContentProps) {
  if (isLoading) {
    return <TodoListSkeleton />
  }

  if (!hasTodos) {
    return (
      <Empty className="border-border/60 bg-muted/20">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleDashedIcon className="size-5" />
          </EmptyMedia>
          <EmptyTitle>No tasks yet</EmptyTitle>
          <EmptyDescription>Add a task above to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onAddFirst} type="button" variant="outline">
            <PlusIcon data-icon="inline-start" />
            Add first task
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="divide-y divide-border/50">
      {todos.map((todo) => (
        <TodoRow
          key={todo['_id']}
          isEditing={editingId === todo['_id']}
          onCancel={onCancelEdit}
          onRemove={onRemove}
          onSave={onSaveEdit}
          onStartEdit={onStartEdit}
          onToggle={(id) => void onToggle(id)}
          todo={todo}
        />
      ))}
    </div>
  )
}

type TodoRowProps = {
  todo: Todo
  isEditing: boolean
  onCancel: () => void
  onRemove: (id: Id<'todos'>) => Promise<void>
  onSave: (id: Id<'todos'>, text: string) => Promise<void>
  onStartEdit: (id: Id<'todos'>) => void
  onToggle: (id: Id<'todos'>) => void
}

function TodoRow({
  todo,
  isEditing,
  onCancel,
  onRemove,
  onSave,
  onStartEdit,
  onToggle,
}: TodoRowProps) {
  const id = todo['_id']
  const checkboxLabel = todo.completed ? 'Mark task as active' : 'Mark task as complete'
  const content = isEditing ? (
    <TodoRowEditor
      initialText={todo.text}
      onCancel={onCancel}
      onSave={(text) => onSave(id, text)}
    />
  ) : (
    <TodoRowText completed={todo.completed} text={todo.text} />
  )
  const actions = isEditing ? null : (
    <TodoRowActions
      completed={todo.completed}
      onRemove={() => void onRemove(id)}
      onStartEdit={() => onStartEdit(id)}
      onToggle={() => onToggle(id)}
    />
  )

  return (
    <div className="group flex items-center gap-3 py-3" role="listitem">
      <Field className="w-auto shrink-0" orientation="horizontal">
        <Checkbox
          aria-label={checkboxLabel}
          checked={todo.completed}
          onCheckedChange={() => onToggle(id)}
        />
      </Field>

      <div className="min-w-0 flex-1">{content}</div>
      {actions}
    </div>
  )
}

type TodoRowEditorProps = {
  initialText: string
  onCancel: () => void
  onSave: (text: string) => Promise<void>
}

function TodoRowEditor({ initialText, onCancel, onSave }: TodoRowEditorProps) {
  const editForm = useForm({
    defaultValues: { text: initialText },
    validators: { onSubmit: editSchema },
    onSubmit: async ({ value }) => {
      await onSave(value.text)
    },
  })

  function handleCancel() {
    editForm.reset()
    onCancel()
  }

  return (
    <TodoForm onSubmit={() => void editForm.handleSubmit()}>
      <editForm.Field name="text">
        {(field) => (
          <TodoTextField
            errors={field.state.meta.errors}
            renderInput={(isInvalid) => (
              <div className="flex items-center gap-2">
                <Input
                  aria-invalid={isInvalid || undefined}
                  className="h-7 flex-1 text-sm"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  value={field.state.value}
                />
                <Button size="sm" type="submit">
                  Save
                </Button>
                <Button onClick={handleCancel} size="sm" type="button" variant="outline">
                  Cancel
                </Button>
              </div>
            )}
          />
        )}
      </editForm.Field>
    </TodoForm>
  )
}

function TodoRowText({ completed, text }: { completed: boolean; text: string }) {
  const textClassName = completed ? 'text-muted-foreground line-through' : 'text-foreground'

  return <span className={`text-sm ${textClassName}`}>{text}</span>
}

type TodoRowActionsProps = {
  completed: boolean
  onRemove: () => void
  onStartEdit: () => void
  onToggle: () => void
}

function TodoRowActions({ completed, onRemove, onStartEdit, onToggle }: TodoRowActionsProps) {
  const completionLabel = completed ? 'Reopen task' : 'Mark as complete'
  const CompletionIcon = completed ? RotateCcwIcon : CheckCheckIcon

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Tooltip>
        <TooltipTrigger
          onClick={onStartEdit}
          render={<Button aria-label="Edit task" size="icon-sm" type="button" variant="ghost" />}
        >
          <PencilLineIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>Edit task</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={onToggle}
          render={
            <Button aria-label={completionLabel} size="icon-sm" type="button" variant="ghost" />
          }
        >
          <CompletionIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>{completionLabel}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={onRemove}
          render={
            <Button
              aria-label="Delete task"
              className="text-destructive hover:text-destructive"
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <Trash2Icon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent>Delete task</TooltipContent>
      </Tooltip>
    </div>
  )
}
