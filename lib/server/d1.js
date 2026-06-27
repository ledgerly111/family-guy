const databaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID ||
  process.env.D1_DATABASE_ID ||
  '79a62e72-a3c5-4f62-b6fa-25ed61b6788a'

export function hasD1Config() {
  return Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_D1_API_TOKEN)
}

export async function d1Query(sql, params = []) {
  if (!hasD1Config()) {
    throw new Error('Cloudflare D1 is not configured')
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${databaseId}/query`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_D1_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || !payload.success) {
    const message =
      payload.errors?.map(error => error.message).join(', ') ||
      `D1 request failed with ${response.status}`
    throw new Error(message)
  }

  const result = Array.isArray(payload.result) ? payload.result[0] : payload.result
  if (result && result.success === false) {
    throw new Error(result.error || 'D1 query failed')
  }

  return {
    rows: result?.results || [],
    meta: result?.meta || {},
  }
}
