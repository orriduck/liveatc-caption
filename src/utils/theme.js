export const THEME_STORAGE_KEY = 'adsbao-theme'
export const THEME_PREFERENCES = ['system', 'light', 'dark']
export const THEME_BY_SCHEME = {
  light: 'adsbao-light',
  dark: 'adsbao-dark',
}

export const isThemePreference = (value) => THEME_PREFERENCES.includes(value)

export const getInitialThemePreference = (storage = globalThis.localStorage) => {
  try {
    const saved = storage?.getItem?.(THEME_STORAGE_KEY)
    return isThemePreference(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

export const getSystemScheme = (
  systemMedia = globalThis.matchMedia?.('(prefers-color-scheme: dark)'),
) => (systemMedia?.matches ? 'dark' : 'light')

export const resolveThemePreference = (preference, systemMedia) => {
  const normalizedPreference = isThemePreference(preference) ? preference : 'system'
  const scheme = normalizedPreference === 'system'
    ? getSystemScheme(systemMedia)
    : normalizedPreference

  return {
    preference: normalizedPreference,
    scheme,
    resolvedTheme: THEME_BY_SCHEME[scheme],
  }
}

export const applyThemePreference = (
  preference,
  {
    root = globalThis.document?.documentElement,
    storage = globalThis.localStorage,
    systemMedia = globalThis.matchMedia?.('(prefers-color-scheme: dark)'),
  } = {},
) => {
  const resolved = resolveThemePreference(preference, systemMedia)

  root?.setAttribute?.('data-theme', resolved.resolvedTheme)
  root?.setAttribute?.('data-theme-preference', resolved.preference)
  if (root?.style) root.style.colorScheme = resolved.scheme

  try {
    storage?.setItem?.(THEME_STORAGE_KEY, resolved.preference)
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }

  return {
    preference: resolved.preference,
    resolvedTheme: resolved.resolvedTheme,
  }
}

export const initializeTheme = ({
  root = globalThis.document?.documentElement,
  storage = globalThis.localStorage,
  systemMedia = globalThis.matchMedia?.('(prefers-color-scheme: dark)'),
} = {}) => applyThemePreference(getInitialThemePreference(storage), {
  root,
  storage,
  systemMedia,
})
