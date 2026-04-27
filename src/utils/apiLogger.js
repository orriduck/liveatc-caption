const parseQueryParams = (url) => {
  try {
    const parsed = new URL(url, 'http://localhost')
    const result = {}
    for (const [k, v] of parsed.searchParams) result[k] = v
    return Object.keys(result).length ? result : null
  } catch {
    return null
  }
}

export const withAuditLogging = (fetchImpl, { service = 'API', getParams } = {}) => {
  return async (url, options) => {
    const params = typeof getParams === 'function' ? getParams(url) : parseQueryParams(url)
    const start = performance.now()
    try {
      const response = await fetchImpl(url, options)
      const ms = Math.round(performance.now() - start)
      console.group(`[audit:api] ${service}  HTTP ${response.status}  +${ms}ms`)
      console.log('url:   ', url)
      if (params) console.log('params:', params)
      console.groupEnd()
      return response
    } catch (err) {
      const ms = Math.round(performance.now() - start)
      console.group(`[audit:api] ${service}  ERROR  +${ms}ms`)
      console.log('url:   ', url)
      if (params) console.log('params:', params)
      console.error('error: ', err.message)
      console.groupEnd()
      throw err
    }
  }
}
