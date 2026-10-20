import { useState } from "react"
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material"
import Link from "next/link"
import { NoteText } from "@/components/NoteText"
import { ERoutes } from "@/utils/enums"
import { handleError } from "@/utils/errorHandler"
import { ReleaseTask } from "@/utils/interfaces"
import { formatReleaseAt } from "@/utils/release"

interface Props {
  tasks: ReleaseTask[]
  /** Closed releases show the steps without ticking */
  isReadOnly: boolean
  onToggle: (taskId: number, done: boolean) => Promise<unknown>
  /** Fills a release without steps from the template in settings */
  onAddFromTemplate: () => Promise<unknown>
}

/** When the step should be done and when it was done, e.g. "3 days before release · Done 17 Oct 2026, 09:12" */
function taskDetails(task: ReleaseTask): string | undefined {
  const details = [task.timing, task.done_at ? `Done ${formatReleaseAt(task.done_at)}` : null].filter(Boolean)
  return details.length > 0 ? details.join(" · ") : undefined
}

/**
 * Release steps ticked off one by one by the person managing the release
 */
export function ReleaseChecklist({ tasks, isReadOnly, onToggle, onAddFromTemplate }: Props) {
  const [pendingTaskId, setPendingTaskId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isTemplateEmpty, setIsTemplateEmpty] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Closed releases without steps have nothing to show
  if (isReadOnly && tasks.length === 0) return null

  const doneCount = tasks.filter((task) => task.done_at).length

  const handleToggle = async (task: ReleaseTask) => {
    setPendingTaskId(task.id)
    setErrorMessage(null)
    try {
      await onToggle(task.id, !task.done_at)
    } catch (error) {
      setErrorMessage(handleError(error).message)
    } finally {
      setPendingTaskId(null)
    }
  }

  const handleAddFromTemplate = async () => {
    setIsAdding(true)
    setErrorMessage(null)
    try {
      await onAddFromTemplate()
      // A successful call that leaves the list empty means there is nothing in the template
      setIsTemplateEmpty(true)
    } catch (error) {
      setErrorMessage(handleError(error).message)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h2" component="h2">
          Steps
        </Typography>
        {tasks.length > 0 && (
          <Typography color="text.secondary">
            {doneCount} / {tasks.length} done
          </Typography>
        )}
      </Box>

      <Paper elevation={6} sx={{ mt: 2, p: 3 }}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMessage}
          </Alert>
        )}
        {tasks.length > 0 ? (
          <>
            <LinearProgress
              variant="determinate"
              value={(doneCount / tasks.length) * 100}
              color={doneCount === tasks.length ? "success" : "primary"}
              aria-label="Steps progress"
              sx={{ mb: 1 }}
            />
            <List dense disablePadding>
              {tasks.map((task) => (
                <ListItem key={task.id} disableGutters alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 40, mt: 0 }}>
                    <Checkbox
                      edge="start"
                      checked={!!task.done_at}
                      disabled={isReadOnly || pendingTaskId !== null}
                      onChange={() => handleToggle(task)}
                      slotProps={{ input: { "aria-label": task.title } }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={<NoteText text={task.title} />}
                    secondary={taskDetails(task)}
                    slotProps={{ primary: { component: "div" } }}
                    sx={task.done_at ? { "& .MuiListItemText-primary": { textDecoration: "line-through" } } : undefined}
                  />
                </ListItem>
              ))}
            </List>
          </>
        ) : (
          <>
            <Typography color="text.secondary">
              {isTemplateEmpty ? (
                <>
                  The step template is empty. Set it up in{" "}
                  <Link href={`${ERoutes.Settings}#releases`}>Settings › Releases</Link>.
                </>
              ) : (
                "This release has no steps yet."
              )}
            </Typography>
            <Button
              startIcon={isAdding ? <CircularProgress size={16} /> : <PlaylistAddIcon />}
              onClick={handleAddFromTemplate}
              disabled={isAdding}
              sx={{ mt: 1 }}
            >
              Add steps from template
            </Button>
          </>
        )}
      </Paper>
    </Box>
  )
}
