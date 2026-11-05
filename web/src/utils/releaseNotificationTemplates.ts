import type { ReleaseType } from "@/utils/interfaces"
import type { EmailTemplate, NotificationTemplate, SqlTemplate, TextTemplate } from "@/utils/releaseNotifications"

/*
 * Notification texts sent for each release type.
 *
 * Email and text templates use `{{point.format}}` variables:
 * - points: `start` (maintenance start), `stop` (start minus the safety duration),
 *   `end` (start plus the duration), `back` (all systems back)
 * - formats: `csWeekdayUpcoming` (tuto středu), `csWeekdayOn` (ve středu), `csDate` (22. října), `year`,
 *   `csTime` (9:30), `csDayPart` (večer), `enLongDate` (Wednesday, October 22, 2026),
 *   `enWeekdayDate` (Wednesday, October 22), `enTime` (7:30 PM), `date` (22.10.2026), `time` (09:30)
 *
 * SQL titles use the single-brace `{date}`, `{from}` and `{to}` filled in by the SQL script.
 * The parameter form shows only the inputs the templates of the type need.
 */

const sqlNotification = (titleEN: string, titleCS: string): SqlTemplate => ({
  kind: "sql",
  name: "Application notification (SQL)",
  code: "MAINTENANCE",
  titleEN: `Planned maintenance on {date} from {from} to {to} - ${titleEN}`,
  titleCS: `Plánovaná odstávka {date} od {from} do {to} - ${titleCS}`,
  linkToDetail: "",
  notifyInAdvanceDays: 4,
})

const czechAnnouncement = (intro: string) =>
  [
    "Ahoj všem,",
    `{{start.csWeekdayUpcoming}} {{start.csDate}} {{start.year}} proběhne celofiremní ${intro}`,
    "Prosím, ukončete {{stop.csWeekdayOn}} {{stop.csDate}} v {{stop.csTime}} veškeré činnosti jak v AEQ, tak i vytěžování faktur v Elis.",
    "Všechny systémy včetně AEQ a Elis budou fungovat opět {{back.csWeekdayOn}} {{back.csDate}} od {{back.csTime}} {{back.csDayPart}}.",
    "V případě nedodržení hrozí ztráta veškeré vaší práce + nutné vícepráce na straně AEQ supportu.",
  ].join("\n\n")

const englishAnnouncement = (intro: string) =>
  [
    "Hello everyone,",
    `This {{start.enLongDate}}, there will be a company-wide ${intro}`,
    "Please, stop all activities in AEQ and the invoice extraction in Elis by {{stop.enTime}} on {{stop.enWeekdayDate}}.",
    "All systems, including AEQ and Elis, will be operational again on {{back.enWeekdayDate}}, from {{back.enTime}}.",
    "Failure to comply may result in the loss of all your work and additional work required by the AEQ support team.",
  ].join("\n\n")

const teamsMessage = (introCS: string): TextTemplate => ({
  kind: "text",
  name: "Teams message",
  body: czechAnnouncement(introCS),
})

const announcementEmail = (introCS: string, introEN: string): EmailTemplate => ({
  kind: "email",
  name: "Email",
  recipients: "releaseSettings",
  subject: "Plánovaná odstávka / Planned maintenance - {{start.date}} - {{stop.time}}-{{end.time}}",
  body: [
    czechAnnouncement(introCS),
    "Děkujeme za spolupráci",
    "AEQ crew",
    "-".repeat(100),
    englishAnnouncement(introEN),
    "Thank you for your cooperation.",
    "AEQ crew",
  ].join("\n\n"),
})

const application = {
  introCS:
    "aplikační release, kdy dojde k nasazení nové verze AEQ. Odstávka se dotkne všech klíčových systémů jako SAP, NAV, CRM, DMS, ODS, ...",
  introEN:
    "application release, during which the new version of AEQ will be deployed. The downtime will affect all key systems such as SAP, NAV, CRM, DMS, ODS, ...",
}

const maintenance = {
  introCS:
    "maintenance release, kdy dojde k odstávce všech klíčových systémů jako SAP, NAV, CRM, DMS, ODS, včetně AEQ a Elis.",
  introEN:
    "maintenance release. The downtime will affect all key systems such as SAP, NAV, CRM, DMS, ODS, including AEQ and Elis.",
}

/** Ordered templates per release type; a type without notifications maps to an empty list */
export const notificationTemplates: Record<ReleaseType, readonly NotificationTemplate[]> = {
  application: [
    sqlNotification("EW deployment release - new version of AEQ", "EW nasazovací release - nová verze AEQ"),
    teamsMessage(application.introCS),
    announcementEmail(application.introCS, application.introEN),
  ],
  maintenance: [
    sqlNotification("technical release without any changes in AEQ", "technický release bez změn v AEQ"),
    teamsMessage(maintenance.introCS),
    announcementEmail(maintenance.introCS, maintenance.introEN),
  ],
}
