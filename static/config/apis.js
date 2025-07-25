import { getBackendFullPath } from "./connectionInfo.js";
var apis;
(function (apis) {
    apis["ws"] = "ws";
})(apis || (apis = {}));
function getFullBackendWebSocketPath() {
    return `${getBackendFullPath()}/${apis.ws}`;
}
export const webSocketFullPath = getFullBackendWebSocketPath();
