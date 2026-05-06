import type { StateCreator } from "zustand"

type Action = {
  id: string
  message: string
}

const OP_TIMEOUT_MS = 12000

export interface ActionSlice {
  actions: {
    visibleAction: string | null
    visibleError: string | null
    asyncQueue: Action[]
    failedUuids: string[]
    startAsync: (id: string, message: string) => void
    finishAsync: (id: string) => void
    failAsync: (id: string, message?: string) => void
    cancelAllPending: () => void
    clearFailedUuid: (id: string) => void
    fire: (message: string) => void
    close: () => void
    closeError: () => void
  }
}

export const createActionSlice: StateCreator<ActionSlice> = (set, get) => {
  const timeouts = new Map<string, ReturnType<typeof setTimeout>>()

  return {
    actions: {
      visibleAction: null,
      visibleError: null,
      asyncQueue: [],
      failedUuids: [],
      startAsync: (id, message) => {
        set((state) => ({
          actions: {
            ...state.actions,
            asyncQueue: [...state.actions.asyncQueue, { id, message }],
          },
        }))
        const timer = setTimeout(() => {
          timeouts.delete(id)
          if (get().actions.asyncQueue.some((a) => a.id === id)) {
            set((state) => ({
              actions: {
                ...state.actions,
                asyncQueue: state.actions.asyncQueue.filter((a) => a.id !== id),
                failedUuids: [...state.actions.failedUuids, id],
                visibleError: "Operation timed out. Please try again.",
              },
            }))
          }
        }, OP_TIMEOUT_MS)
        timeouts.set(id, timer)
      },
      finishAsync: (id) => {
        clearTimeout(timeouts.get(id))
        timeouts.delete(id)
        set((state) => {
          const found = state.actions.asyncQueue.find((action) => action.id === id)
          return {
            actions: {
              ...state.actions,
              asyncQueue: state.actions.asyncQueue.filter((action) => action.id !== id),
              visibleAction: found?.message || null,
            },
          }
        })
      },
      failAsync: (id, message?) => {
        clearTimeout(timeouts.get(id))
        timeouts.delete(id)
        set((state) => ({
          actions: {
            ...state.actions,
            asyncQueue: state.actions.asyncQueue.filter((action) => action.id !== id),
            failedUuids: [...state.actions.failedUuids, id],
            visibleError: message ?? state.actions.visibleError,
          },
        }))
      },
      cancelAllPending: () => {
        get().actions.asyncQueue.forEach((a) => {
          clearTimeout(timeouts.get(a.id))
          timeouts.delete(a.id)
        })
        set((state) => ({
          actions: {
            ...state.actions,
            asyncQueue: [],
            failedUuids: [...state.actions.failedUuids, ...state.actions.asyncQueue.map((a) => a.id)],
          },
        }))
      },
      clearFailedUuid: (id) =>
        set((state) => ({
          actions: {
            ...state.actions,
            failedUuids: state.actions.failedUuids.filter((uuid) => uuid !== id),
          },
        })),
      fire: (message) =>
        set((state) => ({
          actions: { ...state.actions, visibleAction: message },
        })),
      close: () =>
        set((state) => ({
          actions: { ...state.actions, visibleAction: null },
        })),
      closeError: () =>
        set((state) => ({
          actions: { ...state.actions, visibleError: null },
        })),
    },
  }
}
