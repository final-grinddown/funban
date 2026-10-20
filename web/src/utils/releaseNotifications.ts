import { addDays, addMinutes, format, getDay, isValid, parseISO, setHours, startOfDay, subMinutes } from "date-fns"
import type { Release, ReleaseType } from "@/utils/interfaces"
import { toDateTimeInputValue } from "@/utils/release"

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

export type NotificationParamErrors = Partial<Record<keyof NotificationParams, string>>

interface ResolvedParams {
  maintenanceFrom: Date
  safetyDuration: number
  durationInMinutes: number
  notifyInAdvanceDays: number
  code: string
  titleEN: string
  titleCS: string
  linkToDetail: string | null
  systemsBackAt: Date
}

export interface TitlePreview {
  titleEN: string
  titleCS: string
  validFrom: Date
  validTo: Date
  notifyFrom: Date
}

export interface EmailNotification {
  subject: string
  body: string
}

const CodeMaxLength = 32
const TextMaxLength = 1024
const MaxMinutes = 7 * 24 * 60
const MaxNotifyDays = 60
const DefaultSystemsBackHour = 4
const EmailSeparator = "-".repeat(100)

interface TypeTexts {
  titleEN: string
  titleCS: string
  introCS: string
  introEN: string
}

const typeTexts: Record<ReleaseType, TypeTexts> = {
  application: {
    titleEN: "EW deployment release - new version of AEQ",
    titleCS: "EW nasazovací release - nová verze AEQ",
    introCS:
      "aplikační release, kdy dojde k nasazení nové verze AEQ. Odstávka se dotkne všech klíčových systémů jako SAP, NAV, CRM, DMS, ODS, ...",
    introEN:
      "application release, during which the new version of AEQ will be deployed. The downtime will affect all key systems such as SAP, NAV, CRM, DMS, ODS, ...",
  },
  maintenance: {
    titleEN: "technical release without any changes in AEQ",
    titleCS: "technický release bez změn v AEQ",
    introCS:
      "maintenance release, kdy dojde k odstávce všech klíčových systémů jako SAP, NAV, CRM, DMS, ODS, včetně AEQ a Elis.",
    introEN:
      "maintenance release. The downtime will affect all key systems such as SAP, NAV, CRM, DMS, ODS, including AEQ and Elis.",
  },
}

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
  { on: "v neděli", upcoming: "tuto neděli" },
  { on: "v pondělí", upcoming: "toto pondělí" },
  { on: "v úterý", upcoming: "toto úterý" },
  { on: "ve středu", upcoming: "tuto středu" },
  { on: "ve čtvrtek", upcoming: "tento čtvrtek" },
  { on: "v pátek", upcoming: "tento pátek" },
  { on: "v sobotu", upcoming: "tuto sobotu" },
]

export function defaultNotificationParams(release: Pick<Release, "release_at" | "release_type">): NotificationParams {
  const start = parseISO(release.release_at)
  const texts = typeTexts[release.release_type]
  const systemsBackAt = isValid(start)
    ? toInputValue(setHours(startOfDay(addDays(start, 1)), DefaultSystemsBackHour))
    : ""

  return {
    maintenanceFrom: toDateTimeInputValue(release.release_at),
    safetyDuration: "30",
    durationInMinutes: "300",
    notifyInAdvanceDays: "4",
    code: "MAINTENANCE",
    titleEN: `Planned maintenance on {date} from {from} to {to} - ${texts.titleEN}`,
    titleCS: `Plánovaná odstávka {date} od {from} do {to} - ${texts.titleCS}`,
    linkToDetail: "",
    systemsBackAt,
  }
}

export function validateNotificationParams(params: NotificationParams): NotificationParamErrors {
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

  return errors
}

/** Returns typed values, or `null` when any parameter is invalid */
function resolveParams(params: NotificationParams): ResolvedParams | null {
  if (Object.keys(validateNotificationParams(params)).length > 0) return null

  return {
    maintenanceFrom: parseDateTime(params.maintenanceFrom) as Date,
    safetyDuration: Number(params.safetyDuration),
    durationInMinutes: Number(params.durationInMinutes),
    notifyInAdvanceDays: Number(params.notifyInAdvanceDays),
    code: params.code.trim(),
    titleEN: params.titleEN,
    titleCS: params.titleCS,
    linkToDetail: params.linkToDetail.trim() || null,
    systemsBackAt: parseDateTime(params.systemsBackAt) as Date,
  }
}

/**
 * Builds the system notification SQL script. Only the `DECLARE` values are filled in;
 * the placeholder replacement stays in SQL so the script matches the one used so far.
 */
export function buildNotificationSql(params: NotificationParams): string | null {
  const p = resolveParams(params)
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
  const p = resolveParams(params)
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

export function buildTeamsMessage(params: NotificationParams, releaseType: ReleaseType): string | null {
  const p = resolveParams(params)
  if (!p) return null

  return czechText(p, releaseType)
}

export function buildEmail(params: NotificationParams, releaseType: ReleaseType): EmailNotification | null {
  const p = resolveParams(params)
  if (!p) return null

  const stopAt = subMinutes(p.maintenanceFrom, p.safetyDuration)
  const endAt = addMinutes(p.maintenanceFrom, p.durationInMinutes)
  const subject = `Plánovaná odstávka / Planned maintenance - ${format(p.maintenanceFrom, "d.M.yyyy")} - ${format(stopAt, "HH:mm")}-${format(endAt, "HH:mm")}`

  const body = [
    czechText(p, releaseType),
    "Děkujeme za spolupráci",
    "AEQ crew",
    EmailSeparator,
    englishText(p, releaseType),
    "Thank you for your cooperation.",
    "AEQ crew",
  ].join("\n\n")

  return { subject, body }
}

/** `mailto:` link with recipients and subject; the body is pasted separately because long encoded bodies get truncated */
export function buildMailtoHref(to: string[], cc: string[], subject: string): string {
  const query = [cc.length > 0 ? `cc=${encodeURIComponent(cc.join(","))}` : "", `subject=${encodeURIComponent(subject)}`]
    .filter(Boolean)
    .join("&")

  return `mailto:${to.join(",")}?${query}`
}

function czechText(p: ResolvedParams, releaseType: ReleaseType): string {
  const stopAt = subMinutes(p.maintenanceFrom, p.safetyDuration)
  const backAt = p.systemsBackAt

  return [
    "Ahoj všem,",
    `${csWeekdays[getDay(p.maintenanceFrom)].upcoming} ${csDate(p.maintenanceFrom)} ${p.maintenanceFrom.getFullYear()} proběhne celofiremní ${typeTexts[releaseType].introCS}`,
    `Prosím, ukončete ${csWeekdays[getDay(stopAt)].on} ${csDate(stopAt)} v ${format(stopAt, "H:mm")} veškeré činnosti jak v AEQ, tak i vytěžování faktur v Elis.`,
    `Všechny systémy včetně AEQ a Elis budou fungovat opět ${csWeekdays[getDay(backAt)].on} ${csDate(backAt)} od ${format(backAt, "H:mm")} ${csDayPart(backAt)}.`,
    "V případě nedodržení hrozí ztráta veškeré vaší práce + nutné vícepráce na straně AEQ supportu.",
  ].join("\n\n")
}

function englishText(p: ResolvedParams, releaseType: ReleaseType): string {
  const stopAt = subMinutes(p.maintenanceFrom, p.safetyDuration)
  const backAt = p.systemsBackAt

  return [
    "Hello everyone,",
    `This ${format(p.maintenanceFrom, "EEEE, MMMM d, yyyy")}, there will be a company-wide ${typeTexts[releaseType].introEN}`,
    `Please, stop all activities in AEQ and the invoice extraction in Elis by ${format(stopAt, "h:mm a")} on ${format(stopAt, "EEEE, MMMM d")}.`,
    `All systems, including AEQ and Elis, will be operational again on ${format(backAt, "EEEE, MMMM d")}, from ${format(backAt, "h:mm a")}.`,
    "Failure to comply may result in the loss of all your work and additional work required by the AEQ support team.",
  ].join("\n\n")
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
