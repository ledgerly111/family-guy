import { handleSetup, withErrors } from '../../_lib/backend.js'

export const onRequestPost = withErrors(handleSetup)
