let divSelectedRoom = document.getElementById('selectRoom')
let divConsultingRoom = document.getElementById('consultingRoom')
let inputRoomNumber = document.getElementById('roomNumber')
let btnGoRoom = document.getElementById('goRoom')
let localVideo = document.getElementById('localVideo')
let remoteRoom = document.getElementById('remoteRoom')

let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller

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
    }
})


socket.on('offer', (event)=>{
    if(!isCaller){
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate = onIceCandidate
        rtcPeerConnection.ontrack = onAddStream
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream)
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream)
        rtcPeerConnection.setRemoteDescription (new RTCSessionDescription(event))
        rtcPeerConnection.createAnswer()
            .then(sessionDescription =>{
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
    }
})

socket.on('answer', event => {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

function onAddStream(event){
    remoteVideo.srcObject = event.streams[0]
    remoteStream = event.streams[0]
}