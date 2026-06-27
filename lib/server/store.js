import { hasD1Config } from './d1'

const methods = [
  'ensureSchema',
  'getUserByEmail',
  'getUserById',
  'createFamilyWithOwner',
  'createUser',
  'createSession',
  'deleteSession',
  'getSession',
  'getMembers',
  'getFamilyState',
  'saveFamilyState',
]

let storePromise

async function loadStore() {
  if (!storePromise) {
    storePromise = (async () => {
      if (hasD1Config() || process.env.NODE_ENV === 'production') {
        const { D1Store } = await import('./d1Store')
        return new D1Store()
      }

      const { DevStore } = await import('./devStore')
      return new DevStore()
    })()
  }

  return storePromise
}

const store = Object.fromEntries(
  methods.map(method => [
    method,
    async (...args) => {
      const implementation = await loadStore()
      return implementation[method](...args)
    },
  ]),
)

export function getStore() {
  return store
}
