import { handleMembers, withErrors } from '../../_lib/backend.js'

export const onRequestGet = withErrors(handleMembers)
export const onRequestPost = withErrors(handleMembers)
