import { handleFinanceState, withErrors } from '../../_lib/backend.js'

export const onRequestGet = withErrors(handleFinanceState)
export const onRequestPut = withErrors(handleFinanceState)
