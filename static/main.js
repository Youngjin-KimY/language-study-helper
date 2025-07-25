var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Step, Ids } from "./enums.js";
import { webSocketFullPath } from "./config/apis.js";
let socket;
function parseVTT(vttText) {
    const cues = [];
    const blocks = vttText.split(/\n\n+/);
    for (const block of blocks) {
        const lines = block.trim().split("\n");
        if (lines.length >= 2 && lines[0].includes("-->")) {
            const [start, end] = lines[0].split(" --> ").map(parseVTTTime);
            const text = lines.slice(1).join("\n");
            cues.push({ start, end, text });
        }
    }
    return cues;
}
function parseVTTTime(timeStr) {
    const parts = timeStr.trim().split(":");
    // ⛑ 보완: 만약 시(hour)가 생략된 경우 자동 추가
    if (parts.length === 2) {
        parts.unshift("00");
    }
    if (parts.length !== 3) {
        console.warn("Invalid VTT time format:", timeStr);
        return 0;
    }
    const [h, m, sRest] = parts;
    const [s, ms = "0"] = sRest.split(".");
    return (parseInt(h) * 3600 +
        parseInt(m) * 60 +
        parseInt(s) +
        parseInt(ms.padEnd(3, "0")) / 1000);
}
function showJsonSubtitles(videoEl, jsonUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(jsonUrl);
        const subtitleBox = document.getElementById("subtitleBox");
        if (!res.ok) {
            subtitleBox.innerHTML = "";
            return;
        }
        const cues = yield res.json();
        videoEl.addEventListener("timeupdate", () => {
            const current = videoEl.currentTime;
            const cue = cues.find(c => current >= c.start && current <= c.end);
            if (cue) {
                subtitleBox.innerHTML = `
                ${cue.trad}
                ${cue.simp ? `<br>${cue.simp}` : ""}
                ${cue.kor ? `<br>${cue.kor}` : ""}
                ${cue.etc ? `<br>${cue.etc}` : ""}
            `;
            }
            else {
                subtitleBox.innerHTML = "";
            }
        });
    });
}
function $(id) {
    return document.getElementById(id);
}
export function start() {
    const urlInput = $(Ids.UrlInput);
    const url = urlInput.value;
    socket = new WebSocket(webSocketFullPath);
    socket.onopen = () => {
        const req = { type: Step.Download, url: url };
        console.log(req);
        socket.send(JSON.stringify(req));
    };
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log(data);
        if (data.step === Step.Download) {
            $(Ids.Download).textContent = `Download: ${data.progress.toFixed(1)}%`;
        }
        else if (data.step === Step.Ready) {
            const statusEl = $(Ids.Status);
            statusEl.innerHTML =
                `<video id="videoPlayer" controls width="640">
            <source src="/video/${data.filename}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <button id="${Ids.StartButton}">${data.filename}</button>
            <select id="langSelect">
                <option value="en">English</option>
                <option value="zh">Simplified Chinese</option>
                <option value="zh-Hant">Traditional Chinese</option>
                <option value="ko">Korean</option>
            </select>`;
            const btn = $(Ids.StartButton);
            if (btn && data.filename) {
                btn.addEventListener("click", () => {
                    console.log(data.filename);
                    startTrascribe(data.filename);
                });
            }
        }
        else if (data.step === Step.Done) {
            log("Done!");
        }
        else if (data.step === Step.Error) {
            log("error!");
        }
    };
    function log(msg) {
        const logbox = $("log");
        logbox.textContent += (msg + "\n");
        logbox.scrollTop = logbox.scrollHeight;
    }
    function startTrascribe(filename) {
        const langSelect = $(Ids.LanguageSelector);
        const lang = langSelect.value;
        let newSocket = new WebSocket(webSocketFullPath);
        newSocket.onopen = () => {
            const req = {
                type: Step.Transcribe,
                filename,
                lang
            };
            newSocket.send(JSON.stringify(req));
        };
        newSocket.onmessage = (event) => {
            var _a;
            const data = JSON.parse(event.data);
            switch (data.step) {
                case Step.Ing:
                    $(Ids.Transcribe).textContent = `Transcribe: ${(_a = data.progress) === null || _a === void 0 ? void 0 : _a.toFixed(1)}`;
                    break;
                case Step.CompletedTranscribe:
                    const mergeLocationEl = $(Ids.Merge);
                    mergeLocationEl.innerHTML =
                        `<button id=${Ids.MergeStartButton}>${data.filename} merge start</button>`;
                    const btn = $(Ids.MergeStartButton);
                    if (btn && data.filename) {
                        btn.addEventListener("click", () => {
                            startMerge(data.filename);
                        });
                    }
                    break;
                default:
                    console.log("invalid process");
                    break;
            }
        };
    }
    function startMerge(filename) {
        let socket = new WebSocket(webSocketFullPath);
        socket.onopen = () => {
            const req = {
                type: Step.Merge,
                filename,
            };
            const reqJson = JSON.stringify(req);
            socket.send(reqJson);
        };
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            switch (data.step) {
                case Step.Ing:
                    console.log(data.message);
                    break;
                case Step.CompletedMerge:
                    console.log(data.message);
                    break;
                case Step.Error:
                    console.log("error");
                    break;
                default:
                    console.log("invalid process");
                    break;
            }
        };
    }
}
function fetchVideoList() {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch("/video-list");
        const list = yield res.json();
        const container = document.getElementById("videoList");
        container.innerHTML = list.map((f) => {
            const base = f.replace(/\.mp4$/, "");
            return `<li><a href="#" data-base="${base}">${f}</a></li>`;
        }).join("");
        // ✅ Add event listeners after the list is rendered
        container.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", (e) => __awaiter(this, void 0, void 0, function* () {
                e.preventDefault();
                const base = e.currentTarget.getAttribute("data-base");
                const videoSrc = `/video/${base}.mp4`;
                // const subtitleSrc = `/video/${base}.srt`;
                // const subtitleSrc = `/video/${base}.vtt`;
                const subtitleSrc = `video/${base}.json`;
                // ✅ Optional: check if .srt file exists
                let jsonExists = "";
                try {
                    const check = yield fetch(subtitleSrc, { method: "HEAD" });
                    if (check.ok) {
                        jsonExists = `<track src="${subtitleSrc}" kind="subtitles" srclang="en" label="English">`;
                    }
                }
                catch (_a) { }
                const videoHtml = `
                <video controls width="640">
                    <source src="${videoSrc}" type="video/mp4">
                    ${jsonExists}
                    Your browser does not support the video tag.
                </video>
            `;
                $("videoPlayerContainer").innerHTML = videoHtml;
                const videoEl = document.querySelector("#videoPlayerContainer video");
                console.log("videoEl", videoEl);
                // if (trackTag) {
                //     showJsonSubtitles(videoEl, subtitleSrc);
                // } else {
                //     $("subtitleBox")!.textContent = ""; // clear if no subtitle
                // }
                showJsonSubtitles(videoEl, subtitleSrc);
            }));
        });
    });
}
window.addEventListener("DOMContentLoaded", () => {
    fetchVideoList();
});
