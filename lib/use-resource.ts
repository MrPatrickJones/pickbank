"use client"

import { useCallback, useEffect, useState } from "react"

import { ApiRequestError } from "@/lib/api"

/** Small data hook: load, reload, loading and error state for one endpoint. */
export function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setData(await run())
      setError(null)
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "Die Daten konnten nicht geladen werden.")
    } finally {
      setLoading(false)
    }
  }, [run])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, loading, error, reload, setData }
}
