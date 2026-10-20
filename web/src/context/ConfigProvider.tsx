"use client"
import { createContext, useContext, ReactNode } from "react"

export interface Config {
  apiUrl: string
  wsUrl: string
  env: string
}

const ConfigContext = createContext<Config | undefined>(undefined)

export function ConfigProvider({ config, children }: { config: Config; children: ReactNode }) {
  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
}

export function useConfig(): Config {
  const config = useContext(ConfigContext)
  if (!config) {
    throw new Error("useConfig must be used within a ConfigProvider")
  }
  return config
}
