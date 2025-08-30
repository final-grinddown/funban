"use client"

import { ReactNode, SyntheticEvent, useEffect, useState } from "react"
import { Box, CircularProgress, Tab, Tabs, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useRouter } from "next/navigation"
import { AccountSettings } from "@/components/AccountSettings"
import { BoardConfiguration } from "@/components/BoardConfiguration"
import { TeamManagement } from "@/components/TeamManagement"
import { IUser } from "@/utils/interfaces"

interface Props {
  users: IUser[]
}

const tabNames = ["account", "team-management", "board-configuration"]

const tabNameToIndex: { [key: string]: number } = {
  account: 0,
  "team-management": 1,
  "board-configuration": 2,
}

const indexToTabName: { [key: number]: string } = {
  0: "account",
  1: "team-management",
  2: "board-configuration",
}

export function SettingsScreen({ users }: Props) {
  const theme = useTheme()
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"))
  const router = useRouter()

  const [value, setValue] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hash = window.location.hash.substring(1)

    if (hash && tabNameToIndex[hash] !== undefined) {
      setValue(tabNameToIndex[hash])
    }
    setLoading(false)
  }, [])

  const handleChange = (event: SyntheticEvent, newValue: number) => {
    setValue(newValue)
    const tabName = indexToTabName[newValue]
    router.push(`#${tabName}`, { scroll: false })
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <Typography variant="h1">Settings</Typography>
      <Box my={2} display="flex" flexDirection="column" gap={2} justifyContent="space-between">
        <Box
          sx={{ borderBottom: 1, borderColor: "divider", borderTopRightRadius: 4, borderTopLeftRadius: 4, mb: 2 }}
          bgcolor={theme.palette.background.paper}
        >
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="settings tabs"
            variant="fullWidth"
            orientation={isSmallScreen ? "vertical" : "horizontal"}
          >
            {tabNames.map((name) => (
              <Tab key={name} label={name.replace("-", " ").toUpperCase()} {...a11yProps(name)} />
            ))}
          </Tabs>
        </Box>
        <CustomTabPanel value={value} index={0}>
          <AccountSettings />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={1}>
          <TeamManagement users={users} />
        </CustomTabPanel>
        <CustomTabPanel value={value} index={2}>
          <BoardConfiguration />
        </CustomTabPanel>
      </Box>
    </>
  )
}

interface ITabPanelProps {
  children?: ReactNode
  index: number
  value: number
}

function CustomTabPanel(props: ITabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} aria-labelledby={`tab-${index}`} {...other}>
      {children}
    </div>
  )
}

function a11yProps(name: string) {
  return {
    id: `tab-${name}`,
    "aria-controls": `tabpanel-${name}`,
  }
}
