import assert from 'node:assert/strict'

import {
  THEME_STORAGE_KEY,
  applyThemePreference,
  getInitialThemePreference,
  isThemePreference,
} from './theme.js'

const createRoot = () => {
  const attributes = new Map()
  const style = {}
  return {
    style,
    setAttribute(name, value) {
      attributes.set(name, value)
    },
    getAttribute(name) {
      return attributes.get(name)
    },
  }
}

const createStorage = (initialValue) => {
  const values = new Map()
  if (initialValue !== undefined) values.set(THEME_STORAGE_KEY, initialValue)
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }
}

const createMedia = (matches) => ({ matches })

assert.equal(isThemePreference('system'), true)
assert.equal(isThemePreference('light'), true)
assert.equal(isThemePreference('dark'), true)
assert.equal(isThemePreference('sepia'), false)

assert.equal(getInitialThemePreference(createStorage('light')), 'light')
assert.equal(getInitialThemePreference(createStorage('dark')), 'dark')
assert.equal(getInitialThemePreference(createStorage('system')), 'system')
assert.equal(getInitialThemePreference(createStorage('sepia')), 'system')
assert.equal(getInitialThemePreference(null), 'system')

{
  const root = createRoot()
  const storage = createStorage()
  const result = applyThemePreference('system', {
    root,
    storage,
    systemMedia: createMedia(false),
  })

  assert.deepEqual(result, { preference: 'system', resolvedTheme: 'adsbao-light' })
  assert.equal(root.getAttribute('data-theme'), 'adsbao-light')
  assert.equal(root.getAttribute('data-theme-preference'), 'system')
  assert.equal(root.style.colorScheme, 'light')
  assert.equal(storage.getItem(THEME_STORAGE_KEY), 'system')
}

{
  const root = createRoot()
  const result = applyThemePreference('system', {
    root,
    storage: createStorage(),
    systemMedia: createMedia(true),
  })

  assert.deepEqual(result, { preference: 'system', resolvedTheme: 'adsbao-dark' })
  assert.equal(root.getAttribute('data-theme'), 'adsbao-dark')
  assert.equal(root.style.colorScheme, 'dark')
}

{
  const root = createRoot()
  const result = applyThemePreference('light', {
    root,
    storage: createStorage(),
    systemMedia: createMedia(true),
  })

  assert.deepEqual(result, { preference: 'light', resolvedTheme: 'adsbao-light' })
  assert.equal(root.getAttribute('data-theme'), 'adsbao-light')
  assert.equal(root.style.colorScheme, 'light')
}

{
  const root = createRoot()
  const result = applyThemePreference('dark', {
    root,
    storage: createStorage(),
    systemMedia: createMedia(false),
  })

  assert.deepEqual(result, { preference: 'dark', resolvedTheme: 'adsbao-dark' })
  assert.equal(root.getAttribute('data-theme'), 'adsbao-dark')
  assert.equal(root.style.colorScheme, 'dark')
}
