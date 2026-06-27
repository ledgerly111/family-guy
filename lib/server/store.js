import { D1Store } from './d1Store'
import { hasD1Config } from './d1'
import { DevStore } from './devStore'

const useD1 = hasD1Config() || process.env.NODE_ENV === 'production'
const store = useD1 ? new D1Store() : new DevStore()

export function getStore() {
  return store
}
