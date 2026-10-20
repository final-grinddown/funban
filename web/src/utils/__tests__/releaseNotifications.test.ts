import {
  buildEmail,
  buildMailtoHref,
  buildNotificationSql,
  buildTeamsMessage,
  buildTitlePreview,
  defaultNotificationParams,
  validateNotificationParams,
} from "../releaseNotifications"

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
      expect(validateNotificationParams(application)).toEqual({})
    })

    it("reports invalid fields", () => {
      const errors = validateNotificationParams({
        ...application,
        maintenanceFrom: "",
        safetyDuration: "-1",
        durationInMinutes: "0",
        notifyInAdvanceDays: "1.5",
        code: " ",
        titleEN: "",
      })

      expect(Object.keys(errors).sort()).toEqual(
        ["code", "durationInMinutes", "maintenanceFrom", "notifyInAdvanceDays", "safetyDuration", "titleEN"].sort(),
      )
    })

    it("requires systems to be back after the start", () => {
      expect(validateNotificationParams({ ...application, systemsBackAt: "2025-02-20T19:00" })).toHaveProperty(
        "systemsBackAt",
      )
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
      expect(email?.body).toContain("Všechny systémy včetně AEQ a Elis budou fungovat opět v pátek 21. února od 4:00 ráno.")
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
})
