import type { StateCreator } from "zustand"

type Action = {
  id: string
  message: string
}

export interface ActionSlice {
  actions: {
    visibleAction: string | null
    asyncQueue: Action[]
    failedUuids: string[]
    startAsync: (id: string, message: string) => void
    finishAsync: (id: string) => void
    failAsync: (id: string) => void
    cancelAllPending: () => void
    clearFailedUuid: (id: string) => void
    fire: (message: string) => void
    close: () => void
  }
}

export const createActionSlice: StateCreator<ActionSlice> = (set) => ({
  actions: {
    visibleAction: null,
    asyncQueue: [],
    failedUuids: [],
    startAsync: (id, message) =>
      set((state) => ({
        actions: {
          ...state.actions,
          asyncQueue: [...state.actions.asyncQueue, { id, message }],
        },
      })),
    finishAsync: (id) =>
      set((state) => {
        const found = state.actions.asyncQueue.find((action) => action.id === id)
        return {
          actions: {
            ...state.actions,
            asyncQueue: state.actions.asyncQueue.filter((action) => action.id !== id),
            visibleAction: found?.message || null,
          },
        }
      }),
    failAsync: (id) =>
      set((state) => ({
        actions: {
          ...state.actions,
          asyncQueue: state.actions.asyncQueue.filter((action) => action.id !== id),
          failedUuids: [...state.actions.failedUuids, id],
        },
      })),
    cancelAllPending: () =>
      set((state) => ({
        actions: {
          ...state.actions,
          asyncQueue: [],
          failedUuids: [
            ...state.actions.failedUuids,
            ...state.actions.asyncQueue.map((a) => a.id),
          ],
        },
      })),
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
  },
})
