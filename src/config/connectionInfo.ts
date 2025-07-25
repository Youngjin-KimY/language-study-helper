
import { config } from './config.js'

function getBackendConnection(): config {
    return {
        PROTOCOAL: "ws",
        DOMAIN: "localhost",
        PORT: "8088"
    }
}

export function getBackendFullPath(): string{
    const backendInfo = getBackendConnection()
    return `${backendInfo.PROTOCOAL}://${backendInfo.DOMAIN}:${backendInfo.PORT}`
}