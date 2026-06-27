import { d1Query } from './d1'
import { schemaStatements } from './schema'

let schemaReady = false

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || '')
  } catch {
    return fallback
  }
}

function mapUser(row) {
  if (!row) return null
  return {
    id: row.id,
    familyId: row.family_id,
    email: row.email,
    displayName: row.display_name,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  }
}

function mapPublicUser(row) {
  const user = mapUser(row)
  if (!user) return null
  const { passwordHash, ...publicUser } = user
  return publicUser
}

function mapFamily(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  }
}

export class D1Store {
  async ensureSchema() {
    if (schemaReady) return
    for (const statement of schemaStatements) {
      await d1Query(statement)
    }
    schemaReady = true
  }

  async getUserByEmail(email) {
    await this.ensureSchema()
    const { rows } = await d1Query('SELECT * FROM users WHERE email = ? LIMIT 1', [email])
    return mapUser(rows[0])
  }

  async getUserById(id) {
    await this.ensureSchema()
    const { rows } = await d1Query('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
    return mapUser(rows[0])
  }

  async createFamilyWithOwner({ family, owner, state }) {
    await this.ensureSchema()
    await d1Query('INSERT INTO families (id, name, created_at) VALUES (?, ?, ?)', [
      family.id,
      family.name,
      family.createdAt,
    ])
    await d1Query(
      `INSERT INTO users
        (id, family_id, email, display_name, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        owner.id,
        owner.familyId,
        owner.email,
        owner.displayName,
        owner.passwordHash,
        owner.role,
        owner.createdAt,
      ],
    )
    await d1Query(
      `INSERT INTO family_state
        (family_id, transactions_json, cards_json, settings_json, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        family.id,
        JSON.stringify(state.transactions || []),
        JSON.stringify(state.cards || []),
        JSON.stringify(state.settings || {}),
        new Date().toISOString(),
      ],
    )
  }

  async createUser(user) {
    await this.ensureSchema()
    await d1Query(
      `INSERT INTO users
        (id, family_id, email, display_name, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.familyId,
        user.email,
        user.displayName,
        user.passwordHash,
        user.role,
        user.createdAt,
      ],
    )
  }

  async createSession(session) {
    await this.ensureSchema()
    await d1Query(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
      [session.id, session.userId, session.tokenHash, session.expiresAt, session.createdAt],
    )
  }

  async deleteSession(tokenHash) {
    await this.ensureSchema()
    await d1Query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash])
  }

  async getSession(tokenHash) {
    await this.ensureSchema()
    const { rows } = await d1Query(
      `SELECT
        sessions.id AS session_id,
        sessions.user_id,
        sessions.expires_at,
        sessions.created_at AS session_created_at,
        users.*,
        families.id AS family_id_result,
        families.name AS family_name,
        families.created_at AS family_created_at
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       JOIN families ON families.id = users.family_id
       WHERE sessions.token_hash = ?
       LIMIT 1`,
      [tokenHash],
    )
    const row = rows[0]
    if (!row || new Date(row.expires_at) <= new Date()) {
      return null
    }

    return {
      session: {
        id: row.session_id,
        userId: row.user_id,
        tokenHash,
        expiresAt: row.expires_at,
        createdAt: row.session_created_at,
      },
      user: mapUser(row),
      family: mapFamily({
        id: row.family_id_result,
        name: row.family_name,
        created_at: row.family_created_at,
      }),
    }
  }

  async getMembers(familyId) {
    await this.ensureSchema()
    const { rows } = await d1Query(
      'SELECT * FROM users WHERE family_id = ? ORDER BY created_at ASC',
      [familyId],
    )
    return rows.map(mapPublicUser)
  }

  async getFamilyState(familyId) {
    await this.ensureSchema()
    const { rows } = await d1Query('SELECT * FROM family_state WHERE family_id = ? LIMIT 1', [
      familyId,
    ])
    const row = rows[0]

    return {
      transactions: parseJson(row?.transactions_json, []),
      cards: parseJson(row?.cards_json, []),
      settings: parseJson(row?.settings_json, {}),
    }
  }

  async saveFamilyState(familyId, state) {
    await this.ensureSchema()
    await d1Query(
      `INSERT INTO family_state
        (family_id, transactions_json, cards_json, settings_json, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(family_id) DO UPDATE SET
        transactions_json = excluded.transactions_json,
        cards_json = excluded.cards_json,
        settings_json = excluded.settings_json,
        updated_at = excluded.updated_at`,
      [
        familyId,
        JSON.stringify(state.transactions || []),
        JSON.stringify(state.cards || []),
        JSON.stringify(state.settings || {}),
        new Date().toISOString(),
      ],
    )
  }
}
