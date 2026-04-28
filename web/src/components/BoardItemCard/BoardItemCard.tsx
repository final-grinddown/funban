import { useEffect, useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@mui/material"
import { alpha, useTheme } from "@mui/material/styles"
import { createUpdateNoteTag } from "@/app/api/websocket"
import { NoteText } from "@/components/NoteText"
import { useWebSocketContext } from "@/context/WebSocketProvider"
import { useNoteCardModals } from "@/hooks/useNoteCardModals"
import type { WsNoteTag } from "@/schemas/websocket"
import { useAppStore, selectUsers, selectIsFocus, selectCurrentUser } from "@/store"
import { availableColors } from "@/utils/constants"
import { formatDateToShow, matchColorName } from "@/utils/helpers"
import { DevSettings, Note } from "@/utils/interfaces"
import { tagColor } from "@/utils/noteConstants"
import { getStoredDevIdsValue, getStoredDevPredecessorsValue, getStoredHeaderOption } from "@/utils/storage"
import { NoteCardHeader } from "./NoteCardHeader"
import { NoteCardMenu } from "./NoteCardMenu"
import { NoteCardTags } from "./NoteCardTags"

interface Props extends Note {
  isEditable: boolean
  predecessor_id: number | null
}

export function BoardItemCard({
  text,
  name,
  color,
  state,
  updated,
  created,
  id,
  owner_id,
  isEditable,
  predecessor_id,
  tag,
}: Props) {
  const { sendMessageAsync, isLoading } = useWebSocketContext()
  const users = useAppStore(selectUsers)
  const isFocus = useAppStore(selectIsFocus)
  const currentUser = useAppStore(selectCurrentUser)
  const openModal = useAppStore((state) => state.modals.openModal)
  const theme = useTheme()

  const matchedColor = color?.startsWith("#") ? color : matchColorName(color || "Black", availableColors) || "#000000"
  const contrastColor = theme.palette.getContrastText(matchedColor)

  // @dnd-kit sortable hook
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: id,
    disabled: !isEditable,
  })
  const { updatedDate, createdDate, updatedRelative, createdRelative } = formatDateToShow(created, updated)
  const dateToShow =
    updated && updated !== created
      ? `Updated at ${isEditable ? updatedRelative : updatedDate}`
      : `Created at ${isEditable ? createdRelative : createdDate}`

  // SSR-safe: Initialize header config from localStorage after mount
  const [headerConfig, setHeaderConfig] = useState("updated_only")
  const [devSettings, setDevSettings] = useState<DevSettings>({ ids: false, predecessors: false })

  useEffect(() => {
    // Only access localStorage on client-side
    if (typeof window !== "undefined") {
      setHeaderConfig(getStoredHeaderOption())
      setDevSettings({ ids: getStoredDevIdsValue(), predecessors: getStoredDevPredecessorsValue() })
    }
  }, [])

  const { contextMenu, isSubmitting, openContextMenu, closeContextMenu, setIsSubmitting } = useNoteCardModals()

  const openMenu = contextMenu !== null

  const handleEditModal = (focusText: boolean = false) => {
    openModal("editNote", { noteId: id, noteState: state, noteText: text, focusText })
    closeContextMenu()
  }

  const handleEditOpenModal = () => handleEditModal()
  const handleEditDoubleClickOpenModal = () => handleEditModal(true)

  const handleClearModifier = () => {
    const message = createUpdateNoteTag(id.toString(), null)
    sendMessageAsync(message, "Modifier reset")
    setIsSubmitting(true)
    closeContextMenu()
  }

  const handleSetModifier = (modifier: string) => {
    const message = createUpdateNoteTag(id.toString(), modifier as WsNoteTag)
    sendMessageAsync(message, "Modifier set to " + modifier)
    setIsSubmitting(true)
    closeContextMenu()
  }

  const handleDeleteOpenModal = () => {
    openModal("deleteNote", { noteId: id })
    closeContextMenu()
  }

  const handleSplitOpenModal = () => {
    openModal("splitNote", {
      originalNote: { id, text, name, owner_id, color, state, predecessor_id, updated, created, tag },
      users,
      selectedUserId: currentUser ? parseInt(currentUser) : undefined,
    })
    closeContextMenu()
  }

  useEffect(() => {
    if (isSubmitting && !isLoading) {
      closeContextMenu()
    }
  }, [closeContextMenu, isLoading, isSubmitting])

  useEffect(() => {
    const handleGlobalContextMenu = (event: MouseEvent) => {
      if (openMenu && !(event.target as Element)?.closest("[data-context-menu-card]")) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    if (openMenu) {
      document.addEventListener("contextmenu", handleGlobalContextMenu, true)
    }

    return () => {
      document.removeEventListener("contextmenu", handleGlobalContextMenu, true)
    }
  }, [openMenu])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onContextMenu={isEditable ? openContextMenu : undefined}
        data-context-menu-card={isEditable ? true : undefined}
        elevation={4}
        sx={{
          m: 2,
          opacity: isDragging ? 0.5 : isFocus && name !== currentUser ? 0.05 : 1,
          transition: "opacity 0.25s ease-out",
          cursor: isEditable ? "grab" : "default",
          border: tag !== null && tagColor[tag] ? `2px solid ${alpha(tagColor[tag], 0.75)}` : "",
          touchAction: "none", // Important for touch devices
        }}
      >
        <NoteCardHeader
          name={name}
          id={id}
          predecessor_id={predecessor_id}
          matchedColor={matchedColor}
          contrastColor={contrastColor}
          devSettings={devSettings}
          dateToShow={dateToShow}
          createdDate={createdDate}
          createdRelative={createdRelative}
          updatedDate={updatedDate}
          updatedRelative={updatedRelative}
          updated={updated}
          created={created}
          isEditable={isEditable}
          headerConfig={headerConfig}
        />

        <CardContent
          sx={{
            p: 2,
            position: "relative",
            transition: "background-color 0.3s ease-in-out",
            "&:hover": {
              cursor: isEditable && !isDragging ? "context-menu" : "default",
              bgcolor: isEditable && !isDragging ? alpha(theme.palette.primary.light, 0.15) : null,
              animation: isEditable && !isDragging ? "pulsate 1.5s ease-in-out infinite" : null,
            },
            "@keyframes pulsate": {
              "0%": { backgroundColor: alpha(theme.palette.primary.light, 0.15) },
              "50%": { backgroundColor: alpha(theme.palette.primary.light, 0.25) },
              "100%": { backgroundColor: alpha(theme.palette.primary.light, 0.15) },
            },
          }}
          onDoubleClick={handleEditDoubleClickOpenModal}
        >
          <NoteText text={text} />
        </CardContent>

        <NoteCardTags tag={tag} />
      </Card>

      {isEditable && (
        <>
          <NoteCardMenu
            open={openMenu}
            contextMenu={contextMenu}
            tag={tag}
            onClose={closeContextMenu}
            onEdit={handleEditOpenModal}
            onSplit={handleSplitOpenModal}
            onDelete={handleDeleteOpenModal}
            onClearModifier={handleClearModifier}
            onSetModifier={handleSetModifier}
          />
        </>
      )}
    </>
  )
}
