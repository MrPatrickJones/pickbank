"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"

import type { Locale } from "@/lib/portfolio"

type LocaleContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue>({ locale: "de", setLocale: () => {} })

const STORAGE_KEY = "ptb.locale"

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("de")

  // Read the stored preference after mount so server and client render the same markup.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored === "de" || stored === "en") setLocaleState(stored)
    } catch {
      // storage blocked – stay with the default
    }
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  return <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  return useContext(LocaleContext)
}
