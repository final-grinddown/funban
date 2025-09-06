import { useState } from "react"
import { Box, Button, TextField, Typography } from "@mui/material"
import { useSession } from "next-auth/react"
import { IExtendedSession } from "@/utils/interfaces"
import { ChangeEmailModal } from "./ChangeEmailModal"
import { ChangePasswordModal } from "./ChangePasswordModal"

export function AccountSettings() {
  const { data } = useSession()
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const session = data as IExtendedSession

  return (
    <>
      <Typography variant="h2">Profile information</Typography>
      <Box display="flex" flexDirection="column" gap={2} justifyContent="space-between" sx={{ maxWidth: 300 }}>
        <TextField
          label="Name"
          variant="outlined"
          size="small"
          value={data?.user?.name}
          contentEditable={false}
          fullWidth={false}
          sx={{ mt: 1 }}
        />

        <TextField
          label="Email"
          variant="outlined"
          size="small"
          value={data?.user?.email}
          contentEditable={false}
          fullWidth={false}
          sx={{ mt: 1 }}
        />

        <Button variant="contained" color="primary" onClick={() => setIsEmailModalOpen(true)} sx={{ mt: 1 }}>
          Change email
        </Button>
        <Button variant="contained" color="primary" onClick={() => setIsPasswordModalOpen(true)} sx={{ mt: 1 }}>
          Change password
        </Button>

        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
          accessToken={session.accessToken}
        />
        <ChangeEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          accessToken={session.accessToken}
        />
      </Box>
    </>
  )
}
