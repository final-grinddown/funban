import { useState, useEffect } from "react"
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  TimerOff as TimerOffIcon,
} from "@mui/icons-material"
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material"
import { useSession } from "next-auth/react"
import {
  UserMark,
  addUserMark,
  deleteExpiredUserMarks,
  deleteUserMark,
  expireAllUserMarks,
  fetchExpiredUserMarksByUserId,
  fetchUserMarks,
  updateUserMark,
} from "@/app/api/fetches"
import { AddUserMarkModal } from "@/components/AddUserMarkModal"
import { EditUserMarkModal } from "@/components/EditUserMarkModal"
import { useWebSocketContext } from "@/context/WebSocketProvider"

const markTypeLabels: Record<string, string> = {
  "⚫": "Black Mark",
  "⭐": "Gold Star",
  "🕐": "Clock",
  "🩺": "Doctor",
  "🌴": "Vacation",
  "🦒": "Giraffe",
  "🔕": "Do Not Disturb",
}

export function UserMarksScreen() {
  const { data: session } = useSession()
  const { users } = useWebSocketContext()
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [allMarks, setAllMarks] = useState<UserMark[]>([])
  const [expiredMarks, setExpiredMarks] = useState<Map<number, UserMark[]>>(new Map())
  const [expandedExpired, setExpandedExpired] = useState<Set<number>>(new Set())
  const [loadingExpired, setLoadingExpired] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingMark, setEditingMark] = useState<UserMark | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadMarks()
  }, [session?.accessToken])

  const loadMarks = async () => {
    try {
      setLoading(true)
      setError(null)
      const marks = await fetchUserMarks(session?.accessToken)
      setAllMarks(marks)
    } catch (err) {
      setError("Failed to load user marks")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadExpiredMarks = async (userId: number) => {
    if (expiredMarks.has(userId)) {
      // Already loaded, just toggle expansion
      toggleExpiredSection(userId)
      return
    }

    setLoadingExpired(prev => new Set(prev).add(userId))
    try {
      const expired = await fetchExpiredUserMarksByUserId(userId, session?.accessToken)
      setExpiredMarks(prev => new Map(prev).set(userId, expired))
      setExpandedExpired(prev => new Set(prev).add(userId))
    } catch (err) {
      console.error("Failed to load expired marks:", err)
    } finally {
      setLoadingExpired(prev => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
    }
  }

  const toggleExpiredSection = (userId: number) => {
    setExpandedExpired(prev => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const handleDeleteMark = async (markId: number) => {
    if (!confirm("Are you sure you want to permanently delete this mark?")) return

    try {
      await deleteUserMark(markId, session?.accessToken)
      setAllMarks(prev => prev.filter(m => m.id !== markId))
      // Also remove from expired if present
      setExpiredMarks(prev => {
        const next = new Map(prev)
        next.forEach((marks, userId) => {
          next.set(userId, marks.filter(m => m.id !== markId))
        })
        return next
      })
    } catch (err) {
      console.error("Failed to delete mark:", err)
      alert("Failed to delete mark")
    }
  }

  const handleExpireMark = async (mark: UserMark) => {
    if (!confirm("Expire this mark? It will be kept in history.")) return

    try {
      await updateUserMark(
        mark.id,
        mark.user_id,
        mark.mark_type,
        0, // Set to 0 to expire
        mark.custom_text || undefined,
        session?.accessToken
      )
      setAllMarks(prev => prev.filter(m => m.id !== mark.id))
      // Invalidate expired cache for this user
      setExpiredMarks(prev => {
        const next = new Map(prev)
        next.delete(mark.user_id)
        return next
      })
    } catch (err) {
      console.error("Failed to expire mark:", err)
      alert("Failed to expire mark")
    }
  }

  const handleExpireAll = async (userId: number) => {
    const count = allMarks.filter(m => m.user_id === userId).length
    if (!confirm(`Expire all ${count} marks for this user?`)) return

    try {
      await expireAllUserMarks(userId, session?.accessToken)
      setAllMarks(prev => prev.filter(m => m.user_id !== userId))
      // Invalidate expired cache
      setExpiredMarks(prev => {
        const next = new Map(prev)
        next.delete(userId)
        return next
      })
    } catch (err) {
      console.error("Failed to expire all marks:", err)
      alert("Failed to expire all marks")
    }
  }

  const handleDeleteExpired = async (userId: number) => {
    const count = expiredMarks.get(userId)?.length || 0
    if (!confirm(`Permanently delete ${count} expired marks?`)) return

    try {
      await deleteExpiredUserMarks(userId, session?.accessToken)
      setExpiredMarks(prev => {
        const next = new Map(prev)
        next.set(userId, [])
        return next
      })
    } catch (err) {
      console.error("Failed to delete expired marks:", err)
      alert("Failed to delete expired marks")
    }
  }

  const handleEditMark = (mark: UserMark) => {
    setEditingMark(mark)
  }

  const handleSaveEdit = async (data: {
    userId: number
    markType: string
    duration: number
    customText?: string
  }) => {
    if (!editingMark) return

    try {
      const updated = await updateUserMark(
        editingMark.id,
        data.userId,
        data.markType,
        data.duration,
        data.customText,
        session?.accessToken
      )

      // Update in local state
      const wasExpired = editingMark.expires_after_status_ends <= 0
      const isExpired = data.duration <= 0

      if (wasExpired && !isExpired) {
        // Moving from expired to active
        setAllMarks(prev => [...prev, updated])
        setExpiredMarks(prev => {
          const next = new Map(prev)
          const userExpired = next.get(data.userId) || []
          next.set(data.userId, userExpired.filter(m => m.id !== editingMark.id))
          return next
        })
      } else if (!wasExpired && isExpired) {
        // Moving from active to expired
        setAllMarks(prev => prev.filter(m => m.id !== editingMark.id))
        setExpiredMarks(prev => {
          const next = new Map(prev)
          next.delete(data.userId)
          return next
        })
      } else {
        // Staying in same category, just update
        if (isExpired) {
          setExpiredMarks(prev => {
            const next = new Map(prev)
            const userExpired = next.get(data.userId) || []
            next.set(data.userId, userExpired.map(m => m.id === editingMark.id ? updated : m))
            return next
          })
        } else {
          setAllMarks(prev => prev.map(m => m.id === editingMark.id ? updated : m))
        }
      }

      setEditingMark(null)
    } catch (err) {
      console.error("Failed to update mark:", err)
      alert("Failed to update mark")
    }
  }

  const handleAddMark = async (data: { userId: number; markType: string; duration?: number; customText?: string; expiresAt?: string }) => {
    try {
      await addUserMark(
        data.userId,
        data.markType,
        data.duration ?? 0,
        data.customText,
        data.expiresAt,
        session?.accessToken
      )

      // Refresh marks list to show the new mark
      await loadMarks()
      setShowAddModal(false)
    } catch (err) {
      console.error("Failed to add mark:", err)
      alert("Failed to add mark")
    }
  }

  const getUserMarkCount = (userId: number) => {
    return allMarks.filter(m => m.user_id === userId).length
  }

  const getUserMarks = (userId: number) => {
    return allMarks.filter(m => m.user_id === userId)
  }

  const selectedUser = users.find(u => u.id === selectedUserId)
  const selectedUserMarks = selectedUserId ? getUserMarks(selectedUserId) : []
  const selectedUserExpired = selectedUserId ? expiredMarks.get(selectedUserId) || [] : []

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ display: "flex", gap: 2, height: "calc(100vh - 120px)" }}>
      {/* Master Panel - Users List */}
      <Paper sx={{ width: 300, p: 2, overflow: "auto" }}>
        <Typography variant="h6" gutterBottom>
          Users
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <List>
          {users.map(user => {
            const markCount = getUserMarkCount(user.id)
            return (
              <ListItem key={user.id} disablePadding>
                <ListItemButton
                  selected={selectedUserId === user.id}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            bgcolor: user.color,
                          }}
                        />
                        <Typography>{user.name}</Typography>
                      </Box>
                    }
                  />
                  {markCount > 0 && (
                    <Badge badgeContent={markCount} color="primary" />
                  )}
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Paper>

      {/* Detail Panel - User Marks */}
      <Paper sx={{ flex: 1, p: 3, overflow: "auto" }}>
        {!selectedUser ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Typography variant="h6" color="text.secondary">
              Select a user to view their marks
            </Typography>
          </Box>
        ) : (
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h5">
                Marks for {selectedUser.name}
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setShowAddModal(true)}
                >
                  Add Mark
                </Button>
                {selectedUserMarks.length > 0 && (
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => handleExpireAll(selectedUser.id)}
                  >
                    Expire All Marks
                  </Button>
                )}
              </Box>
            </Box>

            {/* Current Marks Section */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>
                Current Marks ({selectedUserMarks.length})
              </Typography>
              {selectedUserMarks.length === 0 ? (
                <Typography color="text.secondary">No active marks</Typography>
              ) : (
                <List>
                  {selectedUserMarks.map(mark => (
                    <ListItem
                      key={mark.id}
                      sx={{ border: 1, borderColor: "divider", borderRadius: 1, mb: 1 }}
                      secondaryAction={
                        <Box>
                          <IconButton onClick={() => handleEditMark(mark)} size="small">
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleExpireMark(mark)}
                            size="small"
                            color="warning"
                          >
                            <TimerOffIcon />
                          </IconButton>
                          <IconButton
                            onClick={() => handleDeleteMark(mark.id)}
                            size="small"
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <>
                            <Typography variant="h6" component="span">{mark.mark_type}</Typography>
                            {" "}
                            <Typography component="span">{markTypeLabels[mark.mark_type]}</Typography>
                          </>
                        }
                        secondary={
                          <>
                            {mark.custom_text && (
                              <>
                                &quot;{mark.custom_text}&quot;
                                <br />
                              </>
                            )}
                            Expires in {mark.expires_after_status_ends} status change(s)
                          </>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Expired Marks Section */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Button
                  onClick={() => loadExpiredMarks(selectedUser.id)}
                  endIcon={
                    expandedExpired.has(selectedUser.id) ? (
                      <ExpandLessIcon />
                    ) : (
                      <ExpandMoreIcon />
                    )
                  }
                  disabled={loadingExpired.has(selectedUser.id)}
                >
                  {loadingExpired.has(selectedUser.id) ? (
                    <CircularProgress size={20} />
                  ) : (
                    `Expired Marks ${expiredMarks.has(selectedUser.id) ? `(${selectedUserExpired.length})` : ""}`
                  )}
                </Button>
                {selectedUserExpired.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    size="small"
                    onClick={() => handleDeleteExpired(selectedUser.id)}
                  >
                    Clear All Expired
                  </Button>
                )}
              </Box>

              <Collapse in={expandedExpired.has(selectedUser.id)}>
                {selectedUserExpired.length === 0 ? (
                  <Typography color="text.secondary">No expired marks</Typography>
                ) : (
                  <List>
                    {selectedUserExpired.map(mark => (
                      <ListItem
                        key={mark.id}
                        sx={{
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          mb: 1,
                          opacity: 0.7,
                        }}
                        secondaryAction={
                          <Box>
                            <IconButton onClick={() => handleEditMark(mark)} size="small">
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              onClick={() => handleDeleteMark(mark.id)}
                              size="small"
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemText
                          primary={
                            <>
                              <Typography variant="h6" component="span">{mark.mark_type}</Typography>
                              {" "}
                              <Typography component="span">{markTypeLabels[mark.mark_type]}</Typography>
                              {" "}
                              <Chip label="Expired" size="small" color="default" />
                            </>
                          }
                          secondary={
                            mark.custom_text ? `"${mark.custom_text}"` : undefined
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Collapse>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Add Modal */}
      <AddUserMarkModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        users={users}
        selectedUserId={selectedUserId ?? undefined}
        onSubmit={handleAddMark}
      />

      {/* Edit Modal */}
      {editingMark && (
        <EditUserMarkModal
          isOpen={true}
          onClose={() => setEditingMark(null)}
          mark={editingMark}
          users={users}
          onSubmit={handleSaveEdit}
        />
      )}
    </Box>
  )
}
