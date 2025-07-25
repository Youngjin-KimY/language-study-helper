package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const idleTimeout = 180 * time.Second

var upgrader = websocket.Upgrader{}

func generateID(n int) string {
	rand.Seed(time.Now().UnixNano())
	letter := []rune("abcdefghijklmnopqrstuvwxyz012345679")
	b := make([]rune, n)
	for i := range b {
		b[i] = letter[rand.Intn(len(letter))]
	}
	return string(b)
}

func currentPercent(line string) float64 {
	arr := strings.Split(line, " ")

	var res string
	for _, d := range arr {

		if strings.Contains(d, "%") {
			res = strings.TrimSuffix(d, "%")
			break
		}
	}
	resfloat, _ := strconv.ParseFloat(res, 64)
	return resfloat
}

func handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		log.Println("websocket read err", err)
		return
	}

	// defer conn.Close()

	timeout := time.AfterFunc(idleTimeout, func() {
		log.Println("connection closed due to inactivity")
		conn.Close()
	})

	// for {
	_, msg, err := conn.ReadMessage()

	if err != nil {
		log.Println("websocket read err", err)
		return
	}

	timeout.Reset(idleTimeout)

	var cmsg ClientMsg
	err = json.Unmarshal(msg, &cmsg)
	if err != nil {
		log.Fatalf("err: %s\n", err)
	}
	log.Printf("data: %s\n", cmsg)
	switch cmsg.Type {
	case string(TypeDownload):
		runDownloadVideo(cmsg.URL, conn)
	case string(TypeTranscribe):
		runWhisper(cmsg.Filename, cmsg.Lang, conn)
	case string(TypeMerge):
		runMerge(cmsg.Filename, conn)
	default:
		log.Println("no type")
		conn.Close()
		return
	}
}

func runDownloadVideo(url string, conn *websocket.Conn) {
	id := generateID(6)
	videoFile := id + ".mp4"
	// yt-dlp -f "bv*[height<=720]+ba/best[height<=720]" --merge-output-format mp4 "https://www.youtube.com/watch?v=xxxxx"
	log.Printf("yt-dlp --newline -f bv*[height<=720]+ba/best[height<=720] --merge-output-format mp4 -o %s %s\n", videoFile, url)
	os.Chdir("./video")
	path := fmt.Sprintf("./video/%s", id)
	os.Mkdir(path, os.ModePerm)
	cmd := exec.Command(
		"yt-dlp",
		"--newline",
		"-f", "bv*[height<=720]+ba/best[height<=720]",
		"--merge-output-format", "mp4",
		"-o", videoFile,
		url,
	)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Fatalf("errMsgStdout: %s", err)
		return
	}

	err = cmd.Start()
	if err != nil {
		log.Fatalf("errMsg: %s", err)
		return
	}

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		// fmt.Println(line)
		if !(strings.Contains(line, "download") && strings.Contains(line, "%")) {

			conn.WriteJSON(ProgressMsg{Step: "prepare", FileName: videoFile, Message: line})
			continue
		}
		percent := currentPercent(line)
		err = conn.WriteJSON(ProgressMsg{Step: "download", Progress: percent})
		if err != nil {
			log.Println(err)
		}
	}
	cmd.Wait()
	err = conn.WriteJSON(ProgressMsg{Step: "dowload", Progress: 100.0, FileName: videoFile, Message: "Download Completed!"})
	if err != nil {
		log.Println(err)
	}
	log.Printf("end %s video download completed\n", videoFile)

	log.Println("start converting")
	var encodedFile = fmt.Sprintf("encoded_%s", videoFile)
	cmd = exec.Command("ffmpeg", "-i", videoFile,
		"-c:v", "libx264",
		"-c:a", "aac",
		"-b:a", "192k",
		"-preset", "fast",
		encodedFile,
	)
	cmd.Stderr = cmd.Stdout
	stdout, err = cmd.StdoutPipe()
	if err != nil {
		log.Printf("encoding error")
	}
	cmd.Start()
	scanner = bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		fmt.Println(line)
	}
	cmd.Wait()
	err = conn.WriteJSON(ProgressMsg{Step: "ready", Progress: 100.0, FileName: encodedFile, Message: "Download Completed!"})
	if err != nil {
		log.Printf("encoding err %s", err)
	}
	err = os.Remove(videoFile)
	if err != nil {
		log.Printf("remove failed-filename: %s", videoFile)
		return
	}
}

func runWhisper(file string, lang string, conn *websocket.Conn) {
	log.Println("------runWhisper------")

	if !strings.Contains(file, ".mp4") {
		conn.WriteJSON(ProgressMsg{Progress: 0.0, Step: "error", Message: "file name wrong"})
		return
	}
	os.Chdir("./video")
	cur, _ := os.Getwd()
	log.Println(cur)
	log.Printf("whisper %s --language %s --task transcribe --output_format srt", file, lang)
	cmd := exec.Command("whisper", file, "--language", lang, "--task", "transcribe", "--output_format", "srt")
	cmd.Stderr = cmd.Stdout
	stdout, _ := cmd.StdoutPipe()
	_ = cmd.Start()

	scanner := bufio.NewScanner(stdout)

	for scanner.Scan() {
		line := scanner.Text()
		fmt.Println(line)
	}
	cmd.Wait()
	conn.WriteJSON(ProgressMsg{Step: StepCompletedTranscribe, Progress: 100.0, Message: "done"})
}

func runMerge(filename string, conn *websocket.Conn) {

	log.Println("------Merge------")
	os.Chdir("./scripts")
	cmd := exec.Command("python3", filename)
	cmd.Stderr = cmd.Stdout
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		log.Fatalln(err)
	}

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		log.Println(line)
		conn.WriteJSON(ProgressMsg{Step: StepIng, Message: line})
	}
	cmd.Wait()
	conn.WriteJSON(ProgressMsg{Step: StepCompletedMerge, Progress: 100.0, Message: "done merge"})
}

func listMP4Handler(w http.ResponseWriter, r *http.Request) {
	files, err := os.ReadDir("./video")
	if err != nil {
		http.Error(w, "Failed to read video directory", http.StatusInternalServerError)
		return
	}

	var mp4Files []string
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".mp4") {
			mp4Files = append(mp4Files, file.Name())
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(mp4Files)
}

func main() {
	go func() {
		http.HandleFunc("/ws", handleWS)
		http.Handle("/", http.FileServer(http.Dir("./static")))
		http.Handle("/video/", http.StripPrefix("/video/", http.FileServer(http.Dir("./video"))))
		http.HandleFunc("/video-list", listMP4Handler)

		err := http.ListenAndServe("0.0.0.0:8088", nil)
		if err != nil {
			fmt.Println("serve failed: ", err)
		}
	}()

	fmt.Println("http://localhost:8088")

	select {}
}
