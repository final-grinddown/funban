import { Typography } from "@mui/material"
import ReactMarkdown from "react-markdown"

interface Props {
  text: string
}

const ALLOWED_ELEMENTS = ["p", "strong", "em", "ul", "ol", "li"] as const

export function NoteText({ text }: Props) {
  return (
    <ReactMarkdown
      allowedElements={ALLOWED_ELEMENTS}
      unwrapDisallowed
      components={{
        p: ({ children }) => (
          <Typography variant="body1" sx={{ m: 0, "&:not(:last-child)": { mb: 0.5 } }}>
            {children}
          </Typography>
        ),
        ul: ({ children }) => <ul style={{ margin: "4px 0", paddingLeft: 20 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: "4px 0", paddingLeft: 20 }}>{children}</ol>,
        li: ({ children }) => (
          <Typography component="li" variant="body1">
            {children}
          </Typography>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  )
}
