const videoSelectBtn = document.getElementById("videoSelectBtn");
const videoElement = document.getElementById("videoElem");
const timeElement = document.getElementById("time");
const previewE = document.getElementById("preview");
const connectionStatus = document.getElementById("c-status");
videoSelectBtn.onclick = getVideoSources;
const { writeFile } = require("fs");
const { desktopCapturer, remote } = require("electron");
const { dialog, Menu } = remote;
const io = require("socket.io-client");

var socket = io("http://localhost:4000");
socket.on("welcome", data => {
  connectionStatus.classList.add("connect");
  console.log(data);
});

socket.on("disconnect", () => {
  connectionStatus.classList.remove("connect");
});

socket.on("broadcast", data => {
  const blob = new Blob([data], {
    type: "video/webm; codecs=vp9"
  });
  console.log(blob);
  previewE.src = window.URL.createObjectURL(blob);
  previewE.loop = true;
  previewE.play();
});

let duration = 0;
let isCounting = false;

async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({
    types: ["window", "screen"]
  });

  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map(source => {
      return {
        label: source.name,
        click: () => selectSource(source)
      };
    })
  );
  videoOptionsMenu.popup();
}

let mediaRecorder; // MediaRecorder instance to capture footage
let recordedChunks = [];

selectSource({ id: "screen:0:0", name: "Entire Screen" });
videoSelectBtn.innerText = "Select Media";

// Change the videoSource window to record
async function selectSource(source) {
  videoSelectBtn.innerText = source.name;

  const constraints = {
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: source.id
      }
    }
  };

  // Create a Stream
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  // Preview the source in a video element
  videoElement.srcObject = stream;
  videoElement.play();

  // Create the Media Recorder
  const options = { mimeType: "video/webm; codecs=vp9" };
  mediaRecorder = new MediaRecorder(stream, options);

  // Register Event Handlers
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.onstop = handleStop;
}

const startRecording = () => {
  mediaRecorder.start();
  return setInterval(function() {
    mediaRecorder.stop();
    mediaRecorder.start();
  }, 1000);
};
let stopId;
let timerId;
const startBtn = document.getElementById("startBtn");
startBtn.onclick = e => {
  stopId = startRecording();
  startBtn.classList.add("is-danger");
  startBtn.innerText = "Recording";
  duration = 0;
  timeElement.innerText = duration + " s";
  countDown();
};

const countDown = async () => {
  timerId = setInterval(() => {
    duration += 1;
    timeElement.innerText = duration + " s";
  }, 1000);
};

const stopBtn = document.getElementById("stopBtn");

stopBtn.onclick = e => {
  mediaRecorder.stop();
  startBtn.classList.remove("is-danger");
  startBtn.innerText = "Start";
  clearInterval(stopId);
  clearInterval(timerId);
};

// Captures all recorded chunks
function handleDataAvailable(e) {
  console.log("video data available");
  recordedChunks.push(e.data);
}

// Saves the video file on stop
async function handleStop(e) {
  const blob = new Blob(recordedChunks, {
    type: "video/webm; codecs=vp9"
  });

  const buffer = Buffer.from(await blob.arrayBuffer());
  socket.emit("stream", buffer);
  recordedChunks = [];
  // const { filePath } = await dialog.showSaveDialog({
  //   buttonLabel: "Save video",
  //   defaultPath: `vid-${Date.now()}.webm`
  // });

  // console.log(filePath);

  // writeFile(filePath, buffer, () => console.log("video saved successfully!"));
}
