function isEmpty(str) {
    return !str.trim().length;
}
// ......................................................
// .......................UI Code........................
// ......................................................
document.getElementById('open-room').onclick = function() {
    var broadcastId = document.getElementById('room-id').value;
    if (broadcastId.replace(/^\s+|\s+$/g, '').length <= 0) {
        alert('Please enter broadcast-id');
        document.getElementById('room-id').focus();
        return;
    }
    connection.open(document.getElementById('room-id').value);
    disableInputButtons();
};

document.getElementById('join-room').onclick = function() {
    var broadcastId = document.getElementById('room-id').value;
    if (broadcastId.replace(/^\s+|\s+$/g, '').length <= 0) {
        alert('Please enter broadcast-id');
        document.getElementById('room-id').focus();
        return;
    }

    connection.sdpConstraints.mandatory = {
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
    };
    connection.join(document.getElementById('room-id').value, function(isRoomJoined, error) {
        if (!isRoomJoined) {
            alert("Room not found");
            return;
        } else {
            disableInputButtons();
        }
    });
};

document.getElementById('open-or-join-room').onclick = function() {
    disableInputButtons();
    connection.openOrJoin(document.getElementById('room-id').value, function(isRoomExist, roomid) {
        if (isRoomExist === false && connection.isInitiator === true) {
            // if room doesn't exist, it means that current user will create the room
        }

        if(isRoomExist) {
          connection.sdpConstraints.mandatory = {
              OfferToReceiveAudio: true,
              OfferToReceiveVideo: true
          };
        }
    });
};

// ......................................................
// ..................RTCMultiConnection Code.............
// ......................................................

var connection = new RTCMultiConnection();

// Specify the codec of streaming video
connection.codecs.video = 'VP9';
connection.preferVP9 = true;
console.log("Check for codecs");
console.log(connection.codecs.video);

connection.socketURL = 'https://muazkhan.com:9001/';

connection.socketMessageEvent = 'video-broadcast-demo';

connection.session = {
    audio: true,
    video: true,
    oneway: true
};

connection.sdpConstraints.mandatory = {
    OfferToReceiveAudio: false,
    OfferToReceiveVideo: false
};

// use your own TURN-server here!
connection.iceServers = [];
connection.iceServers.push({
    urls: 'stun:muazkhan.com:3478',
    credential: 'muazkh',
    username: 'hkzaum'
});
connection.iceServers.push({
    urls: 'turns:muazkhan.com:5349',
    credential: 'muazkh',
    username: 'hkzaum'
});
connection.iceServers.push({
    urls: 'turn:muazkhan.com:3478',
    credential: 'muazkh',
    username: 'hkzaum'
});

var videoPreview = document.getElementById('video-preview');
connection.onstream = function(event) {
    if (connection.isInitiator && event.type !== 'local') {
        return;
    }
    connection.isUpperUserLeft = false;
    videoPreview.srcObject = event.stream;
    videoPreview.play();

    videoPreview.userid = event.userid;

    if (event.type === 'local') {
        videoPreview.muted = true;
        alert('Your boardcast id is: ' + document.getElementById('broadcast-id').value);
    }

    if (connection.isInitiator == false && event.type === 'remote') {

        // he is merely relaying the media
        connection.dontCaptureUserMedia = true;
        connection.attachStreams = [event.stream];
        connection.sdpConstraints.mandatory = {
            OfferToReceiveAudio: false,
            OfferToReceiveVideo: false
        };

        connection.getSocket(function(socket) {
            socket.emit('can-relay-broadcast');

            if (connection.DetectRTC.browser.name === 'Chrome') {
                connection.getAllParticipants().forEach(function(p) {
                    if (p + '' != event.userid + '') {
                        var peer = connection.peers[p].peer;
                        peer.getLocalStreams().forEach(function(localStream) {
                            peer.removeStream(localStream);
                        });
                        event.stream.getTracks().forEach(function(track) {
                            peer.addTrack(track, event.stream);
                        });
                        connection.dontAttachStream = true;
                        connection.renegotiate(p);
                        connection.dontAttachStream = false;
                    }
                });
            }

            if (connection.DetectRTC.browser.name === 'Firefox') {
                connection.getAllParticipants().forEach(function(p) {
                    if (p + '' != event.userid + '') {
                        connection.replaceTrack(event.stream, p);
                    }
                });
            }
        });
    }

    // to keep room-id in cache
    localStorage.setItem(connection.socketMessageEvent, connection.sessionid);
	console.log("checker2");
};

connection.onstreamended = function(event) {
    alert('Broadcast is ended. We will reload this page to clear the cache.');
    location.reload();
};

connection.onMediaError = function(e) {
    if (e.message === 'Concurrent mic process limit.') {
        if (DetectRTC.audioInputDevices.length <= 1) {
            alert('Please select external microphone. Check github issue number 483.');
            return;
        }

        var secondaryMic = DetectRTC.audioInputDevices[1].deviceId;
        connection.mediaConstraints.audio = {
            deviceId: secondaryMic
        };

        connection.join(connection.sessionid);
    }
};

// ..................................
// ALL below scripts are redundant!!!
// ..................................

function disableInputButtons() {
    document.getElementById('room-id').onkeyup();

    document.getElementById('open-or-join-room').disabled = true;
    document.getElementById('open-room').disabled = true;
    document.getElementById('join-room').disabled = true;
    document.getElementById('room-id').disabled = true;
    document.getElementById('startRecord').disabled = false;
    document.getElementById('MotionDetection').disabled = false;
    document.getElementById('FaceTracking').disabled = false;
    document.getElementById('format').disabled = false;
    document.getElementById('VisualizeAudio').disabled = false;
    document.getElementById('Mute').disabled = false;
}



(function() {
    var params = {},
        r = /([^&=]+)=?([^&]*)/g;

    function d(s) {
        return decodeURIComponent(s.replace(/\+/g, ' '));
    }
    var match, search = window.location.search;
    while (match = r.exec(search.substring(1)))
        params[d(match[1])] = d(match[2]);
    window.params = params;
})();

var roomid = '';
if (localStorage.getItem(connection.socketMessageEvent)) {
    roomid = localStorage.getItem(connection.socketMessageEvent);
} else {
    roomid = connection.token();
}
document.getElementById('room-id').value = roomid;
document.getElementById('room-id').onkeyup = function() {
    localStorage.setItem(connection.socketMessageEvent, document.getElementById('room-id').value);
};

var hashString = location.hash.replace('#', '');
if (hashString.length && hashString.indexOf('comment-') == 0) {
    hashString = '';
}

var roomid = params.roomid;
if (!roomid && hashString.length) {
    roomid = hashString;
}

if (roomid && roomid.length) {
    document.getElementById('room-id').value = roomid;
    localStorage.setItem(connection.socketMessageEvent, roomid);

    // auto-join-room
    (function reCheckRoomPresence() {
        connection.checkPresence(roomid, function(isRoomExist) {
            if (isRoomExist) {
                connection.join(roomid);
                return;
            }

            setTimeout(reCheckRoomPresence, 5000);
        });
    })();

    disableInputButtons();
}

var muteCheckbox = document.getElementById('Mute');
muteCheckbox.addEventListener('change', function() {
  connection.session.audio = !muteCheckbox.checked;
});

// detect 2G
if(navigator.connection &&
   navigator.connection.type === 'cellular' &&
   navigator.connection.downlinkMax <= 0.115) {
  alert('2G is not supported. Please use a better internet service.');
}

document.getElementById('open-or-join-room').disabled = false;
document.getElementById('open-room').disabled = false;
document.getElementById('join-room').disabled = false;
document.getElementById('room-id').disabled = false;
