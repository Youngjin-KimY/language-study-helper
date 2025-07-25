package main

type Step string

const (
	StepDownload            Step = "download"
	StepReady               Step = "ready"
	StepTranscribe          Step = "transcribe"
	StepCompletedTranscribe Step = "completedTranscribe"
	StepReadyMerge          Step = "readyMerge"
	StepIng                 Step = "ing"
	StepCompletedMerge      Step = "completedMerge"
	StepDone                Step = "done"
	StepError               Step = "errr"
)

type ProgressMsg struct {
	Step     Step    `json:"step"`
	Progress float64 `json:"progress,omitempty"`
	Message  string  `json:"message,omitempty"`
	FileName string  `json:"filename,omitempty"`
}

type Type string

const (
	TypeDownload   Type = "download"
	TypeTranscribe Type = "transcribe"
	TypeMerge      Type = "readyMerge"
)

type ClientMsg struct {
	Type     string `json:"type"`
	URL      string `json:"url,omitempty"`
	Filename string `json:"filename,omitempty"`
	Lang     string `json:"lang,omitempty"`
}
