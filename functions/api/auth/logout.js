import { handleLogout, withErrors } from '../../_lib/backend.js'

export const onRequestPost = withErrors(handleLogout)
