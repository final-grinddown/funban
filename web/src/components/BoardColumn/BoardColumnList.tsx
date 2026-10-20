import { memo } from "react"
import { List } from "@mui/material"
import { Note } from "@/utils/interfaces"
import { BoardItemCard } from "../BoardItemCard"

interface Props {
  items: Note[]
  isFocus: boolean
  currentUser: string | null
  isEditable: boolean
}

/**
 * List component for rendering notes within a board column.
 * Uses @dnd-kit for drag-and-drop functionality with built-in animations.
 *
 * Memoized to prevent re-renders when items array hasn't changed.
 */
export const BoardColumnList = memo(function BoardColumnList({ items, isFocus, currentUser, isEditable }: Props) {
  return (
    <List>
      {items
        .filter((i) => !isFocus || i.name === currentUser)
        .map((item) => (
          <BoardItemCard key={item.id} {...item} isEditable={isEditable} predecessor_id={item.predecessor_id} />
        ))}
    </List>
  )
})
