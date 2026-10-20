import { Container } from "@mui/material"

interface Props {
  currentLength: number
  maxLength: number
}

export function TextLengthCounter({ currentLength, maxLength }: Props) {
  return (
    <Container
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        fontSize: "small",
        color: currentLength <= maxLength ? "inherit" : "red",
      }}
    >
      <div>
        {currentLength}/{maxLength}
      </div>
    </Container>
  )
}
