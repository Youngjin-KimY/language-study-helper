import { getBackendFullPath } from "./connectionInfo.js";

enum apis {
    ws = "ws"
}

function getFullBackendWebSocketPath(): string {
    return `${getBackendFullPath()}/${apis.ws}`
}

export const webSocketFullPath = getFullBackendWebSocketPath()