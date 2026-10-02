// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest"
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  setAuthSession,
} from "@/lib/auth-token"

describe("tab-scoped auth session", () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it("stores access and refresh tokens in sessionStorage only", () => {
    window.localStorage.setItem("pos.access-token", "legacy-shared-token")

    setAuthSession({ accessToken: "access", refreshToken: "refresh" })

    expect(getAccessToken()).toBe("access")
    expect(getRefreshToken()).toBe("refresh")
    expect(window.localStorage.getItem("pos.access-token")).toBeNull()
  })

  it("clears only the current tab session", () => {
    setAuthSession({ accessToken: "access", refreshToken: "refresh" })
    clearAuthSession()

    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})
