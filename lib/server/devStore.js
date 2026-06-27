import fs from 'fs/promises'
import path from 'path'

const dbPath = path.join(process.cwd(), '.data', 'family-guy-dev-db.json')

const initialData = {
  families: [],
  users: [],
  sessions: [],
  familyState: [],
}

async function readData() {
  try {
    const raw = await fs.readFile(dbPath, 'utf8')
    return { ...initialData, ...JSON.parse(raw) }
  } catch {
    await fs.mkdir(path.dirname(dbPath), { recursive: true })
    await fs.writeFile(dbPath, JSON.stringify(initialData, null, 2))
    return { ...initialData }
  }
}

async function writeData(data) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true })
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2))
}

export class DevStore {
  async ensureSchema() {}

  async getUserByEmail(email) {
    const data = await readData()
    return data.users.find(user => user.email === email) || null
  }

  async getUserById(id) {
    const data = await readData()
    return data.users.find(user => user.id === id) || null
  }

  async createFamilyWithOwner({ family, owner, state }) {
    const data = await readData()
    data.families.push(family)
    data.users.push(owner)
    data.familyState.push({
      familyId: family.id,
      transactions: state.transactions || [],
      cards: state.cards || [],
      settings: state.settings || {},
      updatedAt: new Date().toISOString(),
    })
    await writeData(data)
  }

  async createUser(user) {
    const data = await readData()
    data.users.push(user)
    await writeData(data)
  }

  async createSession(session) {
    const data = await readData()
    data.sessions.push(session)
    await writeData(data)
  }

  async deleteSession(tokenHash) {
    const data = await readData()
    data.sessions = data.sessions.filter(session => session.tokenHash !== tokenHash)
    await writeData(data)
  }

  async getSession(tokenHash) {
    const data = await readData()
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
    const data = await readData()
    return data.users
      .filter(user => user.familyId === familyId)
      .map(({ passwordHash, ...user }) => user)
  }

  async getFamilyState(familyId) {
    const data = await readData()
    const state = data.familyState.find(item => item.familyId === familyId)

    return {
      transactions: state?.transactions || [],
      cards: state?.cards || [],
      settings: state?.settings || {},
    }
  }

  async saveFamilyState(familyId, state) {
    const data = await readData()
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

    await writeData(data)
  }
}
