import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  format,
  getDay,
  isValid,
  parseISO,
  setHours,
  startOfDay,
  subMinutes,
} from "date-fns"
import type { Release } from "@/utils/interfaces"
import { toDateTimeInputValue } from "@/utils/release"
import { defaultDurationInMinutes, notificationTemplates } from "@/utils/releaseNotificationTemplates"

/**
 * Editable inputs of the release notifications, kept as strings so they map 1:1 to form fields.
 * The first eight mirror the `DECLARE` block of the system notification SQL script.
 */
export interface NotificationParams {
  /** `datetime-local` value, e.g. `2026-10-22T20:00` */
  maintenanceFrom: string
  /** Minutes before the start when users are asked to stop working */
  safetyDuration: string
  durationInMinutes: string
  notifyInAdvanceDays: string
  code: string
  /** Supports `{date}`, `{from}` and `{to}` placeholders, replaced by the SQL script */
  titleEN: string
  titleCS: string
  /** Empty means `NULL` */
  linkToDetail: string
  /** When all company systems are operational again (`datetime-local` value) */
  systemsBackAt: string
}

export type NotificationInput = keyof NotificationParams

export type NotificationParamErrors = Partial<Record<NotificationInput, string>>

/** Where the email recipients come from; only the team-wide To/CC lists from Release settings so far */
export type EmailRecipientSource = "releaseSettings"

/** System notification inserted by an SQL script; supplies the defaults of the SQL parameters */
export interface SqlTemplate {
  kind: "sql"
  name: string
  code: string
  /** Single-brace `{date}`, `{from}` and `{to}` are filled in by the SQL script, not by the renderer */
  titleEN: string
  titleCS: string
  /** Empty means `NULL` */
  linkToDetail: string
  notifyInAdvanceDays: number
}

export interface EmailTemplate {
  kind: "email"
  name: string
  /** Supports `{{point.format}}` variables */
  subject: string
  /** Supports `{{point.format}}` variables */
  body: string
  recipients: EmailRecipientSource
}

/** Plain text to copy, e.g. a Teams message */
export interface TextTemplate {
  kind: "text"
  name: string
  /** Supports `{{point.format}}` variables */
  body: string
}

export type NotificationTemplate = SqlTemplate | EmailTemplate | TextTemplate

export interface TitlePreview {
  titleEN: string
  titleCS: string
  validFrom: Date
  validTo: Date
  notifyFrom: Date
}

export interface SqlNotification {
  sql: string
  preview: TitlePreview
}

export interface EmailNotification {
  subject: string
  body: string
}

/** A template with its output; the output is `null` while the parameters are invalid */
export type NotificationBlock =
  | { kind: "sql"; template: SqlTemplate; output: SqlNotification | null }
  | { kind: "email"; template: EmailTemplate; output: EmailNotification | null }
  | { kind: "text"; template: TextTemplate; output: string | null }

interface ResolvedSqlParams {
  maintenanceFrom: Date
  safetyDuration: number
  durationInMinutes: number
  notifyInAdvanceDays: number
  code: string
  titleEN: string
  titleCS: string
  linkToDetail: string | null
}

const CodeMaxLength = 32
const TextMaxLength = 1024
const MaxMinutes = 7 * 24 * 60
const MaxNotifyDays = 60
const DefaultSystemsBackHour = 4

/** All inputs in form order */
const allInputs: NotificationInput[] = [
  "maintenanceFrom",
  "systemsBackAt",
  "code",
  "safetyDuration",
  "durationInMinutes",
  "notifyInAdvanceDays",
  "titleEN",
  "titleCS",
  "linkToDetail",
]

/** Inputs of the SQL `DECLARE` block */
const sqlInputs: NotificationInput[] = [
  "maintenanceFrom",
  "safetyDuration",
  "durationInMinutes",
  "notifyInAdvanceDays",
  "code",
  "titleEN",
  "titleCS",
  "linkToDetail",
]

const csMonthsGenitive = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
]

/** Indexed by `getDay()` (0 = Sunday); Czech needs a different preposition and demonstrative per day */
const csWeekdays = [
  { plain: "neděle", on: "v neděli", upcoming: "tuto neděli" },
  { plain: "pondělí", on: "v pondělí", upcoming: "toto pondělí" },
  { plain: "úterý", on: "v úterý", upcoming: "toto úterý" },
  { plain: "středa", on: "ve středu", upcoming: "tuto středu" },
  { plain: "čtvrtek", on: "ve čtvrtek", upcoming: "tento čtvrtek" },
  { plain: "pátek", on: "v pátek", upcoming: "tento pátek" },
  { plain: "sobota", on: "v sobotu", upcoming: "tuto sobotu" },
]

interface PointDefinition {
  /** Inputs the point is calculated from; they decide which fields the parameter form shows */
  inputs: NotificationInput[]
  /** Only called after the inputs passed validation */
  at: (params: NotificationParams) => Date
}

/** Points in time the texts talk about */
const points = {
  /** Start of the maintenance */
  start: { inputs: ["maintenanceFrom"], at: (p) => parseDateTime(p.maintenanceFrom) as Date },
  /** When users have to stop working: the start minus the safety duration */
  stop: {
    inputs: ["maintenanceFrom", "safetyDuration"],
    at: (p) => subMinutes(parseDateTime(p.maintenanceFrom) as Date, Number(p.safetyDuration)),
  },
  /** End of the maintenance: the start plus the duration */
  end: {
    inputs: ["maintenanceFrom", "durationInMinutes"],
    at: (p) => addMinutes(parseDateTime(p.maintenanceFrom) as Date, Number(p.durationInMinutes)),
  },
  /** When all systems are back; needs the start because it is validated against it */
  back: { inputs: ["maintenanceFrom", "systemsBackAt"], at: (p) => parseDateTime(p.systemsBackAt) as Date },
} satisfies Record<string, PointDefinition>

type Point = keyof typeof points

/** Formats of a point in time; `now` is when the texts are rendered */
const formats = {
  /** `dnes`, `zítra`, otherwise `ve středu 22. října`; relative to when the texts are rendered */
  csRelativeDay: (date, now) => {
    const days = differenceInCalendarDays(date, now)
    if (days === 0) return "dnes"
    if (days === 1) return "zítra"
    return `${csWeekdayOn(date)} ${csDate(date)}`
  },
  /** `středa` */
  csWeekday: (date) => csWeekdays[getDay(date)].plain,
  /** `tuto středu` */
  csWeekdayUpcoming: (date) => csWeekdays[getDay(date)].upcoming,
  /** `ve středu` */
  csWeekdayOn,
  /** `22. října` */
  csDate,
  /** `2026` */
  year: (date) => String(date.getFullYear()),
  /** `9:30` */
  csTime: (date) => format(date, "H:mm"),
  /** `ráno`, `dopoledne`, `odpoledne` or `večer` */
  csDayPart,
  /** `Wednesday, October 22, 2026` */
  enLongDate: (date) => format(date, "EEEE, MMMM d, yyyy"),
  /** `Wednesday, October 22` */
  enWeekdayDate: (date) => format(date, "EEEE, MMMM d"),
  /** `7:30 PM` */
  enTime: (date) => format(date, "h:mm a"),
  /** `22.10.2026` */
  date: (date) => format(date, "d.M.yyyy"),
  /** `09:30` */
  time: (date) => format(date, "HH:mm"),
} satisfies Record<string, (date: Date, now: Date) => string>

type Format = keyof typeof formats

interface AmountDefinition {
  /** Inputs the amount is read from; they decide which fields the parameter form shows */
  inputs: NotificationInput[]
  /** Only called after the inputs passed validation */
  value: (params: NotificationParams) => number
}

/** Amounts the texts talk about, as opposed to points in time */
const amounts = {
  /** Length of the maintenance in minutes */
  duration: { inputs: ["durationInMinutes"], value: (p) => Number(p.durationInMinutes) },
} satisfies Record<string, AmountDefinition>

type Amount = keyof typeof amounts

const amountFormats = {
  /** `1 minutu`, `2 minuty`, `5 minut` */
  csMinutes: (minutes) => `${minutes} ${csPlural(minutes, "minutu", "minuty", "minut")}`,
} satisfies Record<string, (value: number) => string>

type AmountFormat = keyof typeof amountFormats

/** The closed catalogue of `{{point.format}}` and `{{amount.format}}` variables usable in templates */
export type Variable = `${Point}.${Format}` | `${Amount}.${AmountFormat}`

/** Double braces never clash with the single-brace SQL placeholders */
const VariablePattern = /\{\{([^{}]*)\}\}/g

export function defaultNotificationParams(release: Pick<Release, "release_at" | "release_type">): NotificationParams {
  const start = parseISO(release.release_at)
  // The parameters are shared by all templates, so the first system notification supplies the SQL defaults
  const sql = notificationTemplates[release.release_type].find(
    (template): template is SqlTemplate => template.kind === "sql",
  )
  const systemsBackAt = isValid(start)
    ? toInputValue(setHours(startOfDay(addDays(start, 1)), DefaultSystemsBackHour))
    : ""

  return {
    maintenanceFrom: toDateTimeInputValue(release.release_at),
    safetyDuration: "30",
    durationInMinutes: String(defaultDurationInMinutes[release.release_type]),
    notifyInAdvanceDays: sql ? String(sql.notifyInAdvanceDays) : "",
    code: sql?.code ?? "",
    titleEN: sql?.titleEN ?? "",
    titleCS: sql?.titleCS ?? "",
    linkToDetail: sql?.linkToDetail ?? "",
    systemsBackAt,
  }
}

/** Inputs needed by the templates, in form order */
export function requiredInputs(templates: readonly NotificationTemplate[]): NotificationInput[] {
  const needed = new Set<NotificationInput>()

  for (const template of templates) {
    if (template.kind === "sql") sqlInputs.forEach((input) => needed.add(input))

    for (const text of variableTexts(template)) {
      for (const value of variablesIn(text)) {
        const variable = parseVariable(value)
        if (variable) inputsOf(variable).forEach((input) => needed.add(input))
      }
    }
  }

  return allInputs.filter((input) => needed.has(input))
}

/** Validates only the given inputs; the others are not shown in the form */
export function validateNotificationParams(
  params: NotificationParams,
  inputs: readonly NotificationInput[],
): NotificationParamErrors {
  const errors: NotificationParamErrors = {}
  const start = parseDateTime(params.maintenanceFrom)
  const systemsBackAt = parseDateTime(params.systemsBackAt)

  if (!start) errors.maintenanceFrom = "Enter a valid date and time"
  if (!isWholeNumber(params.safetyDuration, 0, MaxMinutes)) errors.safetyDuration = `Whole minutes, 0–${MaxMinutes}`
  if (!isWholeNumber(params.durationInMinutes, 1, MaxMinutes))
    errors.durationInMinutes = `Whole minutes, 1–${MaxMinutes}`
  if (!isWholeNumber(params.notifyInAdvanceDays, 0, MaxNotifyDays))
    errors.notifyInAdvanceDays = `Whole days, 0–${MaxNotifyDays}`
  if (!params.code.trim()) errors.code = "Required"
  else if (params.code.length > CodeMaxLength) errors.code = `At most ${CodeMaxLength} characters`
  if (!params.titleEN.trim()) errors.titleEN = "Required"
  else if (params.titleEN.length > TextMaxLength) errors.titleEN = `At most ${TextMaxLength} characters`
  if (!params.titleCS.trim()) errors.titleCS = "Required"
  else if (params.titleCS.length > TextMaxLength) errors.titleCS = `At most ${TextMaxLength} characters`
  if (params.linkToDetail.length > TextMaxLength) errors.linkToDetail = `At most ${TextMaxLength} characters`
  if (!systemsBackAt) errors.systemsBackAt = "Enter a valid date and time"
  else if (start && systemsBackAt <= start) errors.systemsBackAt = "Must be after the start"

  const shown: NotificationParamErrors = {}
  for (const input of inputs) {
    if (errors[input]) shown[input] = errors[input]
  }
  return shown
}

/**
 * Renders every template. The templates share one parameter form, so all outputs are `null`
 * while any input they need is invalid. Relative days such as `dnes` are relative to `now`.
 */
export function renderNotifications(
  templates: readonly NotificationTemplate[],
  params: NotificationParams,
  now: Date = new Date(),
): NotificationBlock[] {
  const valid = Object.keys(validateNotificationParams(params, requiredInputs(templates))).length === 0

  return templates.map((template): NotificationBlock => {
    switch (template.kind) {
      case "sql": {
        const sql = valid ? buildNotificationSql(params) : null
        const preview = valid ? buildTitlePreview(params) : null
        return { kind: "sql", template, output: sql && preview ? { sql, preview } : null }
      }
      case "email":
        return {
          kind: "email",
          template,
          output: valid
            ? {
                subject: renderVariables(template.subject, params, now),
                body: renderVariables(template.body, params, now),
              }
            : null,
        }
      case "text":
        return { kind: "text", template, output: valid ? renderVariables(template.body, params, now) : null }
    }
  })
}

/** `{{…}}` variables in the text that are not in the catalogue */
export function unknownVariables(text: string): string[] {
  return variablesIn(text).filter((variable) => parseVariable(variable) === null)
}

/** Returns typed values, or `null` when any SQL parameter is invalid */
function resolveSqlParams(params: NotificationParams): ResolvedSqlParams | null {
  if (Object.keys(validateNotificationParams(params, sqlInputs)).length > 0) return null

  return {
    maintenanceFrom: parseDateTime(params.maintenanceFrom) as Date,
    safetyDuration: Number(params.safetyDuration),
    durationInMinutes: Number(params.durationInMinutes),
    notifyInAdvanceDays: Number(params.notifyInAdvanceDays),
    code: params.code.trim(),
    titleEN: params.titleEN,
    titleCS: params.titleCS,
    linkToDetail: params.linkToDetail.trim() || null,
  }
}

/**
 * Builds the system notification SQL script. Only the `DECLARE` values are filled in;
 * the placeholder replacement stays in SQL so the script matches the one used so far.
 */
export function buildNotificationSql(params: NotificationParams): string | null {
  const p = resolveSqlParams(params)
  if (!p) return null

  return `DECLARE
    @MaintenanceFrom DATETIME = '${format(p.maintenanceFrom, "yyyy-MM-dd HH:mm:ss")}',
    @SafetyDuration INT = ${p.safetyDuration},
    @DurationInMinutes INT = ${p.durationInMinutes},
    @NotifyInAdvanceDays INT = ${p.notifyInAdvanceDays},
    @Code NVARCHAR(32) = ${sqlString(p.code)},
    @TitleEN NVARCHAR(1024) = ${sqlString(p.titleEN)},
    @TitleCS NVARCHAR(1024) = ${sqlString(p.titleCS)},
    @LinkToDetail NVARCHAR(1024) = ${p.linkToDetail === null ? "NULL" : sqlString(p.linkToDetail)}

INSERT INTO [dbo].[SystemNotification]([NotificationType], [TitleEN], [TitleCS], [ValidFrom], [ValidTo], [NotifyFrom], [LinkToDetail])
    SELECT
        (SELECT [Id] FROM [dbo].[SystemNotificationType] WHERE [Code] = @Code),
        REPLACE(
            REPLACE(
                REPLACE(@TitleEN,'{date}',SUBSTRING(CONVERT(VARCHAR(100),@MaintenanceFrom,7),1,CHARINDEX(',',CONVERT(VARCHAR(100),@MaintenanceFrom,7))-1)),
                '{from}',CONVERT(VARCHAR(5),DATEADD(minute, -1 * @SafetyDuration, @MaintenanceFrom),8)),
            '{to}',CONVERT(VARCHAR(5),DATEADD(MINUTE,@DurationInMinutes,@MaintenanceFrom),8)),
        REPLACE(
            REPLACE(
                REPLACE(@TitleCS,'{date}',CONCAT(CAST(DAY(@MaintenanceFrom) AS VARCHAR(2)),'.',CAST(MONTH(@MaintenanceFrom) AS VARCHAR(2)))),
                '{from}',CONVERT(VARCHAR(5),DATEADD(minute, -1 * @SafetyDuration, @MaintenanceFrom),8)),
            '{to}',CONVERT(VARCHAR(5),DATEADD(MINUTE,@DurationInMinutes,@MaintenanceFrom),8)),
        @MaintenanceFrom,
        DATEADD(MINUTE, @DurationInMinutes, @MaintenanceFrom),
        CAST(DATEADD(DAY, -1 * @NotifyInAdvanceDays, @MaintenanceFrom) AS DATE),
        @LinkToDetail

SELECT * FROM [dbo].[SystemNotification]
    WHERE [Deleted] = 0
    ORDER BY [ValidFrom] DESC
`
}

/** Mirrors what the SQL script stores, so the result can be checked before running it */
export function buildTitlePreview(params: NotificationParams): TitlePreview | null {
  const p = resolveSqlParams(params)
  if (!p) return null

  const from = format(subMinutes(p.maintenanceFrom, p.safetyDuration), "HH:mm")
  const validTo = addMinutes(p.maintenanceFrom, p.durationInMinutes)
  const to = format(validTo, "HH:mm")
  const fill = (title: string, date: string) =>
    title.replaceAll("{date}", date).replaceAll("{from}", from).replaceAll("{to}", to)

  return {
    // SQL style 7 is `Mon dd, yy`, the script keeps the part before the comma
    titleEN: fill(p.titleEN, format(p.maintenanceFrom, "MMM dd")),
    titleCS: fill(p.titleCS, format(p.maintenanceFrom, "d.M")),
    validFrom: p.maintenanceFrom,
    validTo,
    notifyFrom: startOfDay(addDays(p.maintenanceFrom, -p.notifyInAdvanceDays)),
  }
}

/** `mailto:` link with recipients and subject; the body is pasted separately because long encoded bodies get truncated */
export function buildMailtoHref(to: string[], cc: string[], subject: string): string {
  const query = [
    cc.length > 0 ? `cc=${encodeURIComponent(cc.join(","))}` : "",
    `subject=${encodeURIComponent(subject)}`,
  ]
    .filter(Boolean)
    .join("&")

  return `mailto:${to.join(",")}?${query}`
}

/** Replaces known variables; anything else, including the single-brace SQL placeholders, passes through */
function renderVariables(text: string, params: NotificationParams, now: Date): string {
  return text.replace(VariablePattern, (match, value: string) => {
    const variable = parseVariable(value)
    if (!variable) return match
    switch (variable.kind) {
      case "point":
        return formats[variable.format](points[variable.point].at(params), now)
      case "amount":
        return amountFormats[variable.format](amounts[variable.amount].value(params))
    }
  })
}

function variablesIn(text: string): string[] {
  return Array.from(text.matchAll(VariablePattern), (match) => match[1])
}

/** Template texts that may contain `{{…}}` variables */
function variableTexts(template: NotificationTemplate): string[] {
  switch (template.kind) {
    case "sql":
      // The titles go to the SQL script as they are, only its single-brace placeholders apply
      return []
    case "email":
      return [template.subject, template.body]
    case "text":
      return [template.body]
  }
}

type ParsedVariable =
  | { kind: "point"; point: Point; format: Format }
  | { kind: "amount"; amount: Amount; format: AmountFormat }

/** `null` when the value is not in the catalogue */
function parseVariable(value: string): ParsedVariable | null {
  const parts = value.split(".")
  if (parts.length !== 2) return null
  const [source, format] = parts

  if (Object.hasOwn(points, source) && Object.hasOwn(formats, format))
    return { kind: "point", point: source as Point, format: format as Format }
  if (Object.hasOwn(amounts, source) && Object.hasOwn(amountFormats, format))
    return { kind: "amount", amount: source as Amount, format: format as AmountFormat }
  return null
}

/** Inputs a variable is calculated from */
function inputsOf(variable: ParsedVariable): NotificationInput[] {
  return variable.kind === "point" ? points[variable.point].inputs : amounts[variable.amount].inputs
}

/** Czech plural: one (1), few (2–4), many (0, 5 and more) */
function csPlural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one
  if (count >= 2 && count <= 4) return few
  return many
}

function csWeekdayOn(date: Date): string {
  return csWeekdays[getDay(date)].on
}

function csDate(date: Date): string {
  return `${date.getDate()}. ${csMonthsGenitive[date.getMonth()]}`
}

function csDayPart(date: Date): string {
  const hour = date.getHours()
  if (hour < 10) return "ráno"
  if (hour < 12) return "dopoledne"
  if (hour < 18) return "odpoledne"
  return "večer"
}

function sqlString(value: string): string {
  return `N'${value.replaceAll("'", "''")}'`
}

function parseDateTime(value: string): Date | null {
  const date = parseISO(value)
  return value && isValid(date) ? date : null
}

function isWholeNumber(value: string, min: number, max: number): boolean {
  if (!/^\d+$/.test(value.trim())) return false
  const number = Number(value)
  return number >= min && number <= max
}

function toInputValue(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}
