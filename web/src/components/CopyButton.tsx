import { useEffect, useState } from "react"
import CheckIcon from "@mui/icons-material/Check"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import { Button } from "@mui/material"

interface Props {
  text: string | null
  label?: string
}

const FeedbackDurationMs = 2000

export function CopyButton({ text, label = "Copy" }: Props) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle")

  useEffect(() => {
    if (status === "idle") return
    const timeout = setTimeout(() => setStatus("idle"), FeedbackDurationMs)
    return () => clearTimeout(timeout)
  }, [status])

  const handleClick = async () => {
    if (text === null) return
    try {
      await navigator.clipboard.writeText(text)
      setStatus("copied")
    } catch {
      setStatus("failed")
    }
  }

  return (
    <Button
      size="small"
      variant="outlined"
      color={status === "failed" ? "error" : status === "copied" ? "success" : "primary"}
      startIcon={status === "copied" ? <CheckIcon /> : <ContentCopyIcon />}
      onClick={handleClick}
      disabled={text === null}
    >
      {status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : label}
    </Button>
  )
}
