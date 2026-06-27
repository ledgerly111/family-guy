import { D1Store } from './d1Store'
import { hasD1Config } from './d1'
import { DevStore } from './devStore'

const store = hasD1Config() ? new D1Store() : new DevStore()

export function getStore() {
  return store
}
