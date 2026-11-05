import { format } from "date-fns"
import type { ReleaseType } from "@/utils/interfaces"
import {
  buildMailtoHref,
  buildNotificationSql,
  buildTitlePreview,
  defaultNotificationParams,
  NotificationParams,
  NotificationTemplate,
  renderNotifications,
  requiredInputs,
  unknownVariables,
  validateNotificationParams,
} from "../releaseNotifications"
import { notificationTemplates } from "../releaseNotificationTemplates"

/** The output of the type's only template of the given kind */
function outputOf<K extends NotificationTemplate["kind"]>(params: NotificationParams, type: ReleaseType, kind: K) {
  const blocks = renderNotifications(notificationTemplates[type], params).filter((b) => b.kind === kind)
  expect(blocks).toHaveLength(1)
  return blocks[0].output
}

const buildTeamsMessage = (params: NotificationParams, type: ReleaseType) =>
  outputOf(params, type, "text") as string | null
const buildEmail = (params: NotificationParams, type: ReleaseType) =>
  outputOf(params, type, "email") as { subject: string; body: string } | null

const applicationInputs = requiredInputs(notificationTemplates.application)

describe("releaseNotifications", () => {
  // Thursday, the example from the templates used so far
  const application = defaultNotificationParams({ release_at: "2025-02-20T20:00:00", release_type: "application" })
  const maintenance = defaultNotificationParams({ release_at: "2026-04-09T20:00:00", release_type: "maintenance" })

  describe("defaultNotificationParams", () => {
    it("prefills values from the release", () => {
      expect(application).toEqual({
        maintenanceFrom: "2025-02-20T20:00",
        safetyDuration: "30",
        durationInMinutes: "300",
        notifyInAdvanceDays: "4",
        code: "MAINTENANCE",
        titleEN: "Planned maintenance on {date} from {from} to {to} - EW deployment release - new version of AEQ",
        titleCS: "Plánovaná odstávka {date} od {from} do {to} - EW nasazovací release - nová verze AEQ",
        linkToDetail: "",
        systemsBackAt: "2025-02-21T04:00",
      })
    })

    it("uses maintenance titles for maintenance releases", () => {
      expect(maintenance.titleEN).toBe(
        "Planned maintenance on {date} from {from} to {to} - technical release without any changes in AEQ",
      )
      expect(maintenance.titleCS).toBe("Plánovaná odstávka {date} od {from} do {to} - technický release bez změn v AEQ")
    })
  })

  describe("validateNotificationParams", () => {
    it("accepts defaults", () => {
      expect(validateNotificationParams(application, applicationInputs)).toEqual({})
    })

    it("reports invalid fields", () => {
      const errors = validateNotificationParams(
        {
          ...application,
          maintenanceFrom: "",
          safetyDuration: "-1",
          durationInMinutes: "0",
          notifyInAdvanceDays: "1.5",
          code: " ",
          titleEN: "",
        },
        applicationInputs,
      )

      expect(Object.keys(errors).sort()).toEqual(
        ["code", "durationInMinutes", "maintenanceFrom", "notifyInAdvanceDays", "safetyDuration", "titleEN"].sort(),
      )
    })

    it("requires systems to be back after the start", () => {
      expect(
        validateNotificationParams({ ...application, systemsBackAt: "2025-02-20T19:00" }, applicationInputs),
      ).toHaveProperty("systemsBackAt")
    })

    it("builds nothing while invalid", () => {
      const invalid = { ...application, durationInMinutes: "abc" }
      expect(buildNotificationSql(invalid)).toBeNull()
      expect(buildTitlePreview(invalid)).toBeNull()
      expect(buildTeamsMessage(invalid, "application")).toBeNull()
      expect(buildEmail(invalid, "application")).toBeNull()
    })
  })

  describe("buildNotificationSql", () => {
    it("fills the DECLARE block", () => {
      const sql = buildNotificationSql(maintenance) as string

      expect(sql).toContain("@MaintenanceFrom DATETIME = '2026-04-09 20:00:00',")
      expect(sql).toContain("@SafetyDuration INT = 30,")
      expect(sql).toContain("@DurationInMinutes INT = 300,")
      expect(sql).toContain("@NotifyInAdvanceDays INT = 4,")
      expect(sql).toContain("@Code NVARCHAR(32) = N'MAINTENANCE',")
      expect(sql).toContain(
        "@TitleCS NVARCHAR(1024) = N'Plánovaná odstávka {date} od {from} do {to} - technický release bez změn v AEQ',",
      )
      expect(sql).toContain("@LinkToDetail NVARCHAR(1024) = NULL\n")
      expect(sql).toContain("INSERT INTO [dbo].[SystemNotification]")
    })

    it("escapes quotes and keeps a link", () => {
      const sql = buildNotificationSql({
        ...maintenance,
        titleEN: "It's {date}",
        linkToDetail: "https://example.com/?a='b'",
      }) as string

      expect(sql).toContain("@TitleEN NVARCHAR(1024) = N'It''s {date}',")
      expect(sql).toContain("@LinkToDetail NVARCHAR(1024) = N'https://example.com/?a=''b'''")
    })
  })

  describe("buildTitlePreview", () => {
    it("matches what the SQL script produces", () => {
      const preview = buildTitlePreview(maintenance)

      expect(preview?.titleEN).toBe(
        "Planned maintenance on Apr 09 from 19:30 to 01:00 - technical release without any changes in AEQ",
      )
      expect(preview?.titleCS).toBe("Plánovaná odstávka 9.4 od 19:30 do 01:00 - technický release bez změn v AEQ")
      expect(preview?.validFrom).toEqual(new Date(2026, 3, 9, 20, 0))
      expect(preview?.validTo).toEqual(new Date(2026, 3, 10, 1, 0))
      expect(preview?.notifyFrom).toEqual(new Date(2026, 3, 5))
    })
  })

  describe("buildTeamsMessage", () => {
    it("renders the application template", () => {
      expect(buildTeamsMessage(application, "application")).toBe(
        [
          "Ahoj všem,",
          "tento čtvrtek 20. února 2025 proběhne celofiremní aplikační release, kdy dojde k nasazení nové verze AEQ. Odstávka se dotkne všech klíčových systémů jako SAP, NAV, CRM, DMS, ODS, ...",
          "Prosím, ukončete ve čtvrtek 20. února v 19:30 veškeré činnosti jak v AEQ, tak i vytěžování faktur v Elis.",
          "Všechny systémy včetně AEQ a Elis budou fungovat opět v pátek 21. února od 4:00 ráno.",
          "V případě nedodržení hrozí ztráta veškeré vaší práce + nutné vícepráce na straně AEQ supportu.",
        ].join("\n\n"),
      )
    })

    it("renders the maintenance intro", () => {
      expect(buildTeamsMessage(application, "maintenance")).toContain(
        "tento čtvrtek 20. února 2025 proběhne celofiremní maintenance release, kdy dojde k odstávce všech klíčových systémů jako SAP, NAV, CRM, DMS, ODS, včetně AEQ a Elis.",
      )
    })

    it.each([
      ["2026-10-19T20:00", "toto pondělí 19. října", "v pondělí 19. října"],
      ["2026-10-20T20:00", "toto úterý 20. října", "v úterý 20. října"],
      ["2026-10-21T20:00", "tuto středu 21. října", "ve středu 21. října"],
      ["2026-10-23T20:00", "tento pátek 23. října", "v pátek 23. října"],
      ["2026-10-24T20:00", "tuto sobotu 24. října", "v sobotu 24. října"],
      ["2026-10-25T20:00", "tuto neděli 25. října", "v neděli 25. října"],
    ])("uses correct Czech grammar for %s", (start, upcoming, on) => {
      const message = buildTeamsMessage(
        { ...application, maintenanceFrom: start, systemsBackAt: "2026-10-31T04:00" },
        "application",
      ) as string

      expect(message).toContain(`${upcoming} 2026 proběhne`)
      expect(message).toContain(`ukončete ${on} v 19:30`)
    })

    it("uses the stop day when the safety duration crosses midnight", () => {
      const message = buildTeamsMessage(
        { ...application, maintenanceFrom: "2025-02-21T00:15", systemsBackAt: "2025-02-21T10:30" },
        "application",
      ) as string

      expect(message).toContain("tento pátek 21. února 2025")
      expect(message).toContain("ukončete ve čtvrtek 20. února v 23:45")
      expect(message).toContain("v pátek 21. února od 10:30 dopoledne")
    })
  })

  describe("buildEmail", () => {
    it("renders subject and bilingual body", () => {
      const email = buildEmail(application, "application")

      expect(email?.subject).toBe("Plánovaná odstávka / Planned maintenance - 20.2.2025 - 19:30-01:00")
      expect(email?.body).toContain(
        "Všechny systémy včetně AEQ a Elis budou fungovat opět v pátek 21. února od 4:00 ráno.",
      )
      expect(email?.body).toContain("Děkujeme za spolupráci\n\nAEQ crew")
      expect(email?.body).toContain(
        "This Thursday, February 20, 2025, there will be a company-wide application release, during which the new version of AEQ will be deployed.",
      )
      expect(email?.body).toContain(
        "Please, stop all activities in AEQ and the invoice extraction in Elis by 7:30 PM on Thursday, February 20.",
      )
      expect(email?.body).toContain(
        "All systems, including AEQ and Elis, will be operational again on Friday, February 21, from 4:00 AM.",
      )
      expect(email?.body.endsWith("Thank you for your cooperation.\n\nAEQ crew")).toBe(true)
    })

    it("renders the maintenance intro in English", () => {
      expect(buildEmail(application, "maintenance")?.body).toContain(
        "there will be a company-wide maintenance release. The downtime will affect all key systems such as SAP, NAV, CRM, DMS, ODS, including AEQ and Elis.",
      )
    })
  })

  describe("buildMailtoHref", () => {
    it("encodes cc and subject", () => {
      expect(buildMailtoHref(["a@x.com", "b@x.com"], ["c@x.com"], "Odstávka / X")).toBe(
        "mailto:a@x.com,b@x.com?cc=c%40x.com&subject=Odst%C3%A1vka%20%2F%20X",
      )
    })

    it("omits empty cc", () => {
      expect(buildMailtoHref(["a@x.com"], [], "S")).toBe("mailto:a@x.com?subject=S")
    })
  })

  describe("templates", () => {
    const types = Object.keys(notificationTemplates) as ReleaseType[]
    it.each(types)("uses only known variables in %s templates", (type) => {
      for (const template of notificationTemplates[type]) {
        switch (template.kind) {
          case "sql":
            // Sent to SQL as they are, so no variables at all
            for (const text of [template.titleEN, template.titleCS, template.linkToDetail]) {
              expect(text).not.toMatch(/\{\{|\}\}/)
            }
            break
          case "email":
            expect(unknownVariables(template.subject)).toEqual([])
            expect(unknownVariables(template.body)).toEqual([])
            break
          case "text":
            expect(unknownVariables(template.body)).toEqual([])
            break
        }
      }
    })

    it("detects unknown variables", () => {
      expect(unknownVariables("{{start.date}} {{strat.date}} {{start.dat}} {date}")).toEqual([
        "strat.date",
        "start.dat",
      ])
    })

    describe("snapshots", () => {
      beforeAll(() => {
        jest.useFakeTimers().setSystemTime(new Date(2026, 9, 1, 12, 0))
      })

      afterAll(() => {
        jest.useRealTimers()
      })

      it.each(types)("renders every %s template", (type) => {
        // Wednesday
        const params = defaultNotificationParams({ release_at: "2026-10-21T20:00:00", release_type: type })
        const blocks = renderNotifications(notificationTemplates[type], params)

        for (const { template, output } of blocks) {
          expect(output).not.toBeNull()
          // Dates as local strings, so the snapshot doesn't depend on the machine's timezone
          const snapshot = JSON.parse(
            JSON.stringify(output, function (this: Record<string, unknown>, key, value) {
              const raw = this[key]
              return raw instanceof Date ? format(raw, "yyyy-MM-dd HH:mm") : value
            }),
          )
          expect(snapshot).toMatchSnapshot(`${template.kind}: ${template.name}`)
        }
      })
    })

    it("passes single-brace SQL placeholders through", () => {
      const params = defaultNotificationParams({ release_at: "2025-02-20T20:00:00", release_type: "application" })
      const textTemplate: NotificationTemplate = {
        kind: "text",
        name: "Test",
        body: "{date} {from} {to} {{start.time}}",
      }

      expect(renderNotifications([textTemplate], params)[0].output).toBe("{date} {from} {to} 20:00")
      expect(buildNotificationSql(params)).toContain("REPLACE(@TitleEN,'{date}'")
      expect(buildNotificationSql(params)).toContain("N'Planned maintenance on {date} from {from} to {to} - ")
    })
  })

  describe("hotfix", () => {
    // Thursday
    const hotfix = defaultNotificationParams({ release_at: "2026-10-22T20:00:00", release_type: "hotfix" })
    const render = (params: NotificationParams, now: Date) =>
      renderNotifications(notificationTemplates.hotfix, params, now)
        .filter((block) => block.kind === "text")
        .map((block) => block.output)

    it("has the system notification and the Teams message", () => {
      expect(notificationTemplates.hotfix.map((t) => [t.kind, t.name])).toEqual([
        ["sql", "Application notification (SQL)"],
        ["text", "Teams message"],
      ])
    })

    it("defaults to the release start, 10 minutes, no safety duration and a day of notice", () => {
      expect(hotfix).toMatchObject({
        maintenanceFrom: "2026-10-22T20:00",
        durationInMinutes: "10",
        safetyDuration: "0",
        notifyInAdvanceDays: "1",
        code: "MAINTENANCE",
        titleEN: "Short outage of AEQ is planned on {date} from {from} to {to} - hotfixing of current version",
        titleCS: "Krátký výpadek AEQ je plánován na {date} od {from} do {to} - oprava aktuální verze",
        linkToDetail: "",
      })
    })

    it("asks for the SQL inputs but not when systems are back", () => {
      expect(requiredInputs(notificationTemplates.hotfix)).toEqual([
        "maintenanceFrom",
        "code",
        "safetyDuration",
        "durationInMinutes",
        "notifyInAdvanceDays",
        "titleEN",
        "titleCS",
        "linkToDetail",
      ])
    })

    it("previews the hotfix titles", () => {
      const preview = buildTitlePreview(hotfix)
      expect(preview?.titleEN).toBe(
        "Short outage of AEQ is planned on Oct 22 from 20:00 to 20:10 - hotfixing of current version",
      )
      expect(preview?.titleCS).toBe("Krátký výpadek AEQ je plánován na 22.10 od 20:00 do 20:10 - oprava aktuální verze")
    })

    it("renders the agreed message for a same-day slot", () => {
      expect(render(hotfix, new Date(2026, 9, 22, 9, 15))).toEqual([
        "Ahoj, bohužel máme další opravu AEQ. Sice jde o drobnost, ale mohla by znepříjemnit život některým z vás. " +
          "Bylo by možné dnes večer (čtvrtek po 20:00) odstavit tak na 10 minut AEQ a nasadit opravu?",
      ])
    })

    it("says zítra for tomorrow and names the day otherwise", () => {
      expect(render(hotfix, new Date(2026, 9, 21, 23, 59))[0]).toContain(
        "možné zítra večer (čtvrtek po 20:00) odstavit",
      )
      expect(render(hotfix, new Date(2026, 9, 19, 10, 0))[0]).toContain(
        "možné ve čtvrtek 22. října večer (čtvrtek po 20:00) odstavit",
      )
    })

    it("follows the day part and time of the start", () => {
      const morning = { ...hotfix, maintenanceFrom: "2026-10-23T07:30" }
      expect(render(morning, new Date(2026, 9, 22, 9, 0))[0]).toContain("možné zítra ráno (pátek po 7:30) odstavit")
    })

    it.each([
      ["1", "1 minutu"],
      ["2", "2 minuty"],
      ["4", "4 minuty"],
      ["5", "5 minut"],
      ["22", "22 minut"],
    ])("writes %s minutes with the Czech plural", (minutes, expected) => {
      const text: NotificationTemplate = { kind: "text", name: "Test", body: "{{duration.csMinutes}}" }
      expect(renderNotifications([text], { ...hotfix, durationInMinutes: minutes })[0].output).toBe(expected)
    })

    it("needs only the duration input for the duration variable", () => {
      expect(requiredInputs([{ kind: "text", name: "Test", body: "{{duration.csMinutes}}" }])).toEqual([
        "durationInMinutes",
      ])
    })
  })

  describe("team release", () => {
    // Monday
    const team = defaultNotificationParams({ release_at: "2026-11-02T20:00:00", release_type: "team" })

    it("has only the Teams message", () => {
      expect(notificationTemplates.team.map((t) => [t.kind, t.name])).toEqual([["text", "Teams message"]])
    })

    it("asks only for the start", () => {
      expect(requiredInputs(notificationTemplates.team)).toEqual(["maintenanceFrom"])
    })

    it("renders the agreed message", () => {
      expect(buildTeamsMessage(team, "team")).toBe(
        [
          "Ahoj Everyone,",
          "toto pondělí 2. listopadu 2026 proběhne release nové verze AEQ a to ve večerních hodinách.",
          "Odstávka by měla být krátká - do 15ti minut, ale pro jistotu počítejte s 1 hodinou.",
          "Prosím, ukončete toto pondělí 2. listopadu v 20:00 veškeré činnosti jak v AEQ, tak i vytěžování faktur v Elis.",
          "Díky za pochopení a spolupráci.",
        ].join("\n"),
      )
    })
  })

  describe("requiredInputs", () => {
    const text = (body: string): NotificationTemplate => ({ kind: "text", name: "Test", body })

    it("needs only the start for the start point", () => {
      expect(requiredInputs([text("{{start.date}} {{start.time}}")])).toEqual(["maintenanceFrom"])
    })

    it("adds the inputs of each point", () => {
      expect(requiredInputs([text("{{stop.time}}"), text("{{end.time}} {{back.csDayPart}}")]).sort()).toEqual(
        ["durationInMinutes", "maintenanceFrom", "safetyDuration", "systemsBackAt"].sort(),
      )
    })

    it("needs the SQL fields for a system notification", () => {
      const sql: NotificationTemplate = {
        kind: "sql",
        name: "SQL",
        code: "MAINTENANCE",
        titleEN: "EN",
        titleCS: "CS",
        linkToDetail: "",
        notifyInAdvanceDays: 4,
      }

      expect(requiredInputs([sql]).sort()).toEqual(
        [
          "code",
          "durationInMinutes",
          "linkToDetail",
          "maintenanceFrom",
          "notifyInAdvanceDays",
          "safetyDuration",
          "titleCS",
          "titleEN",
        ].sort(),
      )
    })

    it("needs nothing without templates", () => {
      expect(requiredInputs([])).toEqual([])
    })

    it("validates only the required inputs", () => {
      const params = defaultNotificationParams({ release_at: "2025-02-20T20:00:00", release_type: "application" })
      const invalid = { ...params, durationInMinutes: "abc", code: "" }

      expect(validateNotificationParams(invalid, requiredInputs([text("{{start.time}}")]))).toEqual({})
      expect(renderNotifications([text("{{start.time}}")], invalid)[0].output).toBe("20:00")
    })
  })
})
