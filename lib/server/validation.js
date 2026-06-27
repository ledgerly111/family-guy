export function parseBody(body) {
  return body && typeof body === 'object' ? body : {}
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

export function validatePassword(password) {
  return String(password || '').length >= 8
}

export function cleanFinanceState(body) {
  return {
    transactions: Array.isArray(body.transactions) ? body.transactions : [],
    cards: Array.isArray(body.cards) ? body.cards : [],
    settings: body.settings && typeof body.settings === 'object' ? body.settings : {},
  }
}
