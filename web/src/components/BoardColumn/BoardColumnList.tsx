import { DragEvent } from "react"
import { List } from "@mui/material"
import { Note } from "@/utils/interfaces"
import { BoardItemCard } from "../BoardItemCard"
import { DragAndDropPlaceholder } from "../DragAndDropPlaceholder"

interface Props {
  items: Note[]
  isFocus: boolean
  currentUser: string | null
  isEditable: boolean
  draggedOverId: number | "last" | null
  isDraggingOver: boolean
  onDragStart: (event: DragEvent<HTMLDivElement>, itemId: string) => void
  onDragEnd: () => void
  onDragOver: (event: DragEvent<HTMLDivElement>, index: number, element: HTMLElement) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
}

/**
 * List component for rendering notes within a board column.
 * Handles drag-and-drop functionality and placeholder rendering.
 */
export function BoardColumnList({
  items,
  isFocus,
  currentUser,
  isEditable,
  draggedOverId,
  isDraggingOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: Props) {
  return (
    <List>
      {items.length === 0 && isDraggingOver && (
        <DragAndDropPlaceholder onDragOver={(event) => event.preventDefault()} />
      )}

      {items
        .filter((i) => !isFocus || i.name === currentUser)
        .map((item, index) => (
          <div
            key={item.id}
            data-id={item.id}
            onDragOver={(event) => onDragOver(event, index, event.currentTarget)}
          >
            {draggedOverId === item.id && (
              <DragAndDropPlaceholder onDragOver={(event) => event.preventDefault()} onDrop={onDrop} />
            )}
            <BoardItemCard
              {...item}
              isEditable={isEditable}
              predecessor_id={item.predecessor_id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}

      {draggedOverId === "last" && (
        <DragAndDropPlaceholder onDragOver={(event) => event.preventDefault()} onDrop={onDrop} />
      )}
    </List>
  )
}
