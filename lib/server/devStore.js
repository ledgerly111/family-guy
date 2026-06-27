const initialData = {
  families: [],
  users: [],
  sessions: [],
  familyState: [],
}

const globalKey = '__familyGuyDevStore'

function readData() {
  if (!globalThis[globalKey]) {
    globalThis[globalKey] = structuredClone(initialData)
  }

  return globalThis[globalKey]
}

export class DevStore {
  async ensureSchema() {}

  async getUserByEmail(email) {
    const data = readData()
    return data.users.find(user => user.email === email) || null
  }

  async getUserById(id) {
    const data = readData()
    return data.users.find(user => user.id === id) || null
  }

  async createFamilyWithOwner({ family, owner, state }) {
    const data = readData()
    data.families.push(family)
    data.users.push(owner)
    data.familyState.push({
      familyId: family.id,
      transactions: state.transactions || [],
      cards: state.cards || [],
      settings: state.settings || {},
      updatedAt: new Date().toISOString(),
    })
  }

  async createUser(user) {
    const data = readData()
    data.users.push(user)
  }

  async createSession(session) {
    const data = readData()
    data.sessions.push(session)
  }

  async deleteSession(tokenHash) {
    const data = readData()
    data.sessions = data.sessions.filter(session => session.tokenHash !== tokenHash)
  }

  async getSession(tokenHash) {
    const data = readData()
    const session = data.sessions.find(item => item.tokenHash === tokenHash)
    if (!session || new Date(session.expiresAt) <= new Date()) {
      return null
    }

    const user = data.users.find(item => item.id === session.userId)
    if (!user) return null
    const family = data.families.find(item => item.id === user.familyId)

    return { session, user, family }
  }

  async getMembers(familyId) {
    const data = readData()
    return data.users
      .filter(user => user.familyId === familyId)
      .map(({ passwordHash, ...user }) => user)
  }

  async getFamilyState(familyId) {
    const data = readData()
    const state = data.familyState.find(item => item.familyId === familyId)

    return {
      transactions: state?.transactions || [],
      cards: state?.cards || [],
      settings: state?.settings || {},
    }
  }

  async saveFamilyState(familyId, state) {
    const data = readData()
    const index = data.familyState.findIndex(item => item.familyId === familyId)
    const nextState = {
      familyId,
      transactions: state.transactions || [],
      cards: state.cards || [],
      settings: state.settings || {},
      updatedAt: new Date().toISOString(),
    }

    if (index >= 0) {
      data.familyState[index] = nextState
    } else {
      data.familyState.push(nextState)
    }
  }
}
