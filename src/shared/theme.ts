import type { Theme } from './types'

const prefersDark = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches

export const applyTheme = (theme: Theme): void => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark())
  root.dataset.theme = theme
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}
