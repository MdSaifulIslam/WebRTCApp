let divSelectedRoom = document.getElementById('selectRoom')
let divConsultingRoom = document.getElementById('consultingRoom')
let inputRoomNumber = document.getElementById('roomNumber')
let btnGoRoom = document.getElementById('goRoom')
let localVideo = document.getElementById('localVideo')
let remoteRoom = document.getElementById('remoteRoom')
let h2CallName = document.getElementById('callName')
let inputCallName = document.getElementById('inputCallName')
let btnSetName = document.getElementById('setName')

let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller, dataChannel

const iceServers = {
    'iceServer': [
        { 'urls': 'stun:stun.service.mozilla.com' },
        { 'urls': 'stun:stun.l.google.com:19302' },
    ]
}

const streamConstraints = {
    audio: true,
    video: true
}

const socket = io()

btnGoRoom.onclick = () => {
    if (inputRoomNumber.value === '') {
        alert('Please type a room Number')
    } else {
        roomNumber = inputRoomNumber.value
        socket.emit('create or join', roomNumber)

        divSelectedRoom.style = "display: none"
        divConsultingRoom.style = "display: block"
    }
}

btnSetName.onclick = () => {
    if (inputCallName.value === '') {
        alert('Please type a Call Name')
    } else {
        dataChannel.send(inputCallName.value)
        h2CallName.innerText=inputCallName.value
    }
}

socket.on('created', room => {
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            localStream = stream
            localVideo.srcObject = stream
            isCaller = true 
        })
        .catch(err => {
            console.log('An Error ocured', err);
        })
})

socket.on('joined', room => {
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            localStream = stream
            localVideo.srcObject = stream
            socket.emit('ready', roomNumber)
        })
        .catch(err => {
            console.log('An Error ocured', err);
        })
})

socket.on('ready', ()=>{
    if(isCaller){
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate = onIceCandidate
        rtcPeerConnection.ontrack = onAddStream
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream)
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream)
        rtcPeerConnection.createOffer()
            .then(sessionDescription =>{
                console.log('sending offer', sessionDescription);
                rtcPeerConnection.setLocalDescription(sessionDescription)
                socket.emit('offer', {
                    type : 'offer',
                    sdp : sessionDescription,
                    room : roomNumber
                })
            })
            .catch (err =>{
                console.log(err);
            })

            dataChannel = rtcPeerConnection.createDataChannel(roomNumber)
            dataChannel.onmessage = event => {h2CallName.innerText = event.data}
    }
})


socket.on('offer', (event)=>{
    if(!isCaller){
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate = onIceCandidate
        rtcPeerConnection.ontrack = onAddStream
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream)
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream)
        console.log('received offer', event);
        rtcPeerConnection.setRemoteDescription (new RTCSessionDescription(event))
        rtcPeerConnection.createAnswer()
            .then(sessionDescription =>{
                console.log('sending answer', sessionDescription);
                rtcPeerConnection.setLocalDescription(sessionDescription)
                socket.emit('answer', {
                    type : 'answer',
                    sdp : sessionDescription,
                    room : roomNumber
                })
            })
            .catch (err =>{
                console.log(err);
            })

            rtcPeerConnection.ondatachannel = event => {
                dataChannel = event.channel
                dataChannel.onmessage = event => {h2CallName.innerText = event.data}
            }
    }
})

socket.on('answer', event => {
    console.log('received answer', event);
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

socket.on('candidate', event =>{
    const candiate = new RTCIceCandidate({
        sdpMLineIndex : event.label,
        candidate : event.candidate
    })
    console.log('receiverd candidate', candiate);
    rtcPeerConnection.addIceCandidate(candiate)
})

function onAddStream(event){
    remoteVideo.srcObject = event.streams[0]
    remoteStream = event.streams[0]
}

function onIceCandidate(event){
    if(event.candidate){
        console.log('sending ice candiate', event.candidate);
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id : event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room : roomNumber
        })
    }
}