const socket = io();


// Media Code **********************************************************************************************************
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasSelect = document.getElementById("cameras");

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;


const call     = document.getElementById("call");
call.hidden = true;

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device)=> device.kind==="videoinput");

        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach((camera)=>{
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });
    } catch(e) {
        console.log(e);
    }
}

async function getMedia(deviceId) {
    const initialConstrains = {
        audio: true,
        video: {facingMode: "user"},
    };
    const cameraConstrains = {
        audio: true,
        video: {
            deviceId: {
                exact: deviceId
            }
        },
    };
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConstrains : initialConstrains
        );
        myFace.srcObject = myStream;
        if(!deviceId) {
            console.log("getCameras");
            await getCameras();
        }
    } catch(e) {
        console.log(e);
    }
}



function handleMuteClick() {
    myStream.getAudioTracks().forEach((track)=>{track.enabled = !track.enabled});
    if(!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
}
function handleCameraClick() {
    myStream.getVideoTracks().forEach((track)=>{track.enabled = !track.enabled});
    if(cameraOff) {
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn camera On";
        cameraOff = true;
    }
}

async function handleCameraChange() {
    await getMedia(camerasSelect.value);
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);




// Welcome Form (Join a room) ******************************************************************************************
const welcome  = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");

async function initCall() {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleWelcomeSubmit(event) {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    const value = input.value;

    await initCall();
    socket.emit("join_room", value);
    roomName = value;
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);



// Socket code *********************************************************************************************************

socket.on("welcome", async ()=> {
    const offer = await myPeerConnection.createOffer(); // (3) Peer A : createOffer
    myPeerConnection.setLocalDescription(offer);        // (4) Peer A : setLocalDescription
    console.log("send the offer");
    socket.emit("offer", offer, roomName);              // Peer A -> Server
});

socket.on("offer", async (offer)=> {
    console.log("received the offer");
    // Peer B : received Peer A's offer
    myPeerConnection.setRemoteDescription(offer);           // (5) Peer B : setRemoteDescription
    const answer = await myPeerConnection.createAnswer();   // (8) Peer B : createAnswer
    myPeerConnection.setLocalDescription(answer);           // (9) Peer B : setLocalDescription
    socket.emit("answer", answer, roomName);                // Peer B -> Server
    console.log("send the answer");
})

socket.on("answer", async (answer)=> {
    console.log("received the answer");
    myPeerConnection.setRemoteDescription(answer);          // (10) Peer B : setRemoteDescription
});

socket.on("ice", ice=> {
    console.log("received candidate");
    myPeerConnection.addIceCandidate(ice);                  // (12) Peer B, Peer A : addIcdCandidate
})


// WebRTC code *********************************************************************************************************

function makeConnection() {
    myPeerConnection = new RTCPeerConnection(); // create peer-to-peer connection
    myPeerConnection.addEventListener("icecandidate", handleIce);   // (11) Peer A: Event Listener("icecandidate")
    myPeerConnection.addEventListener("addstream", handleAddStream);

    // audio and video data stream 을 connection에 추가.
    myStream.getTracks().forEach((track)=> {
        myPeerConnection.addTrack(track, myStream);     // (2) Peer A : addTrack(addStream)
    });
}

function handleIce(data) {
    console.log("send candidate");
    socket.emit("ice", data.candidate, roomName);
}

function handleAddStream(data) {
    const peerFace = document.getElementById("peerFace");
    peerFace.srcObject = data.stream;
}