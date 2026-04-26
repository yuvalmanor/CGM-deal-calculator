import { createContext, useContext } from 'react'

export const ModalContext = createContext<(metricId: string) => void>(() => {})

export function useModal() {
  return useContext(ModalContext)
}
