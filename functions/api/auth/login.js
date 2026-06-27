import { handleLogin, withErrors } from '../../_lib/backend.js'

export const onRequestPost = withErrors(handleLogin)
