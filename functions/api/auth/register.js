import { handleRegister, withErrors } from '../../_lib/backend.js'

export const onRequestPost = withErrors(handleRegister)
