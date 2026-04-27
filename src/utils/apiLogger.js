export const withAuditLogging = (fetchImpl, { service = 'API', getParams } = {}) => {
  return async (url, options) => {
    const start = performance.now()
    try {
      const response = await fetchImpl(url, options)
      const ms = Math.round(performance.now() - start)
      const params = typeof getParams === 'function' ? getParams(url) : null
      const paramsStr = params ? ` ${JSON.stringify(params)}` : ''
      console.log(`[audit:api] ${service}${paramsStr} → HTTP ${response.status} +${ms}ms`)
      return response
    } catch (err) {
      const ms = Math.round(performance.now() - start)
      console.log(`[audit:api] ${service} → ERROR ${err.message} +${ms}ms`)
      throw err
    }
  }
}
