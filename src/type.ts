import { Step } from "./enums.js"

export type ProgressMsg = {
    step: Step;
    progress?: number;
    message?: string;
    filename?: string;
};

export type DownloadRequest = {
    type: Step.Download;
    url: string;
};

export type TrasncribeRequest = {
    type: Step.Transcribe;
    filename: string; 
    lang: string;
};

export type MergeRequest = {
    type: Step.Merge;
    filename: string;
}