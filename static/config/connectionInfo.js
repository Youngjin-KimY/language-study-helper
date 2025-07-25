function getBackendConnection() {
    return {
        PROTOCOAL: "ws",
        DOMAIN: "localhost",
        PORT: "8088"
    };
}
export function getBackendFullPath() {
    const backendInfo = getBackendConnection();
    return `${backendInfo.PROTOCOAL}://${backendInfo.DOMAIN}:${backendInfo.PORT}`;
}
