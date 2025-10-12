import {
  amber,
  blue,
  blueGrey,
  brown,
  cyan,
  deepOrange,
  deepPurple,
  green,
  grey,
  indigo,
  lightBlue,
  lightGreen,
  lime,
  orange,
  pink,
  purple,
  red,
  teal,
  yellow,
} from "@mui/material/colors"

export const availableColors = [
  { name: "Red", value: red[500] },
  { name: "Pink", value: pink[500] },
  { name: "Purple", value: purple[500] },
  { name: "Deep Purple", value: deepPurple[500] },
  { name: "Indigo", value: indigo[500] },
  { name: "Blue", value: blue[500] },
  { name: "Light Blue", value: lightBlue[500] },
  { name: "Cyan", value: cyan[500] },
  { name: "Teal", value: teal[500] },
  { name: "Green", value: green[500] },
  { name: "Light Green", value: lightGreen[500] },
  { name: "Lime", value: lime[500] },
  { name: "Yellow", value: yellow[500] },
  { name: "Amber", value: amber[500] },
  { name: "Orange", value: orange[500] },
  { name: "Deep Orange", value: deepOrange[500] },
  { name: "Brown", value: brown[500] },
  { name: "Grey", value: grey[500] },
  { name: "Blue Grey", value: blueGrey[500] },
  { name: "Black", value: "#000000" },
]

export const MaxTextLength = 1000

export const noteStateOptions = [
  { value: "notes", label: "Notes" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
] as const
