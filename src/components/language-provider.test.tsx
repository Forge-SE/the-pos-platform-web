// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"

import { LanguageProvider, useLanguage } from "@/components/language-provider"
import { LanguageSetting } from "@/components/settings/language-setting"
import {
  SettingsBody,
  SettingsDialog,
} from "@/components/settings/settings-layout"
import { GlobeIcon } from "@phosphor-icons/react"

function Sample() {
  const { t } = useLanguage()
  return <p>{t("Overview")}</p>
}

beforeEach(() => window.localStorage.clear())
afterEach(cleanup)

describe("language preference", () => {
  it("switches to French, persists it, and restores it after remounting", async () => {
    const view = render(
      <LanguageProvider>
        <LanguageSetting />
        <Sample />
      </LanguageProvider>
    )
    expect(screen.getByText("Overview")).toBeTruthy()
    expect(
      view.container.querySelector(
        'img[src="https://flagcdn.io/4x3/32/gh.png"]'
      )
    ).toBeTruthy()
    fireEvent.click(screen.getByRole("combobox", { name: "Language" }))
    fireEvent.keyDown(screen.getByRole("option", { name: /Français/ }), {
      key: "Enter",
    })
    expect(screen.getByText("Vue d’ensemble")).toBeTruthy()
    expect(document.documentElement.lang).toBe("fr")
    expect(window.localStorage.getItem("pos.language")).toBe("fr")

    view.unmount()
    render(
      <LanguageProvider>
        <Sample />
      </LanguageProvider>
    )
    await waitFor(() => expect(screen.getByText("Vue d’ensemble")).toBeTruthy())
  })

  it("opens and changes the language inside the settings dialog", async () => {
    render(
      <LanguageProvider>
        <SettingsDialog
          open
          onOpenChange={() => undefined}
          label="Settings"
          items={[{ id: "preferences", label: "Preferences", icon: GlobeIcon }]}
          section="preferences"
          onSectionChange={() => undefined}
        >
          <SettingsBody>
            <LanguageSetting />
            <Sample />
          </SettingsBody>
        </SettingsDialog>
      </LanguageProvider>
    )

    fireEvent.click(screen.getByRole("combobox", { name: "Language" }))
    const french = screen.getByRole("option", { name: /Français/ })
    expect(
      screen.getByRole("listbox").parentElement?.parentElement?.className
    ).toContain("z-[90]")
    fireEvent.keyDown(french, { key: "Enter" })
    await waitFor(() => expect(screen.getByText("Vue d’ensemble")).toBeTruthy())
  })
})
