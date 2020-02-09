import Debug from "debug"

export function cdebug(format, ...args) { Debug("tesla-api")(`%s ${format}`, new Date().toLocaleTimeString(), ...args) }
export const clog = console.log.bind(console)
export const cerror = console.log.bind(console)
