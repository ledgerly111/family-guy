import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const initialData = {
  families: [],
  users: [],
  sessions: [],
  familyState: [],
}

const globalKey = '__familyGuyDevStore'
const dataPath = path.join(process.cwd(), '.data', 'dev-store.json')

function persistData(data) {
  const directory = path.dirname(dataPath)
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true })
  }

  writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8')
}

function readData() {
  if (!globalThis[globalKey]) {
    if (existsSync(dataPath)) {
      try {
        globalThis[globalKey] = JSON.parse(readFileSync(dataPath, 'utf8'))
      } catch {
        globalThis[globalKey] = structuredClone(initialData)
      }
    } else {
      globalThis[globalKey] = structuredClone(initialData)
    }
  }

  return globalThis[globalKey]
}

function writeData(nextData) {
  globalThis[globalKey] = nextData
  persistData(nextData)
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
    writeData(data)
  }

  async createUser(user) {
    const data = readData()
    data.users.push(user)
    writeData(data)
  }

  async createSession(session) {
    const data = readData()
    data.sessions.push(session)
    writeData(data)
  }

  async deleteSession(tokenHash) {
    const data = readData()
    data.sessions = data.sessions.filter(session => session.tokenHash !== tokenHash)
    writeData(data)
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

    writeData(data)
  }
}
