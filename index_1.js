/* 
1. init
2. register
3. create meeting
4. get media stream
5. join meeting
6. add media
 */
// https://js.samples.s4d.io/browser-plugin-meetings/
// NTk4MzllYWUtYTJiZC00MTMzLWFiMmItMDc2ZTBmYTg0NDRjMzBjYjc4NDItOWVk_P0A1_3af8b8a3-c856-4011-9a72-790a0b303b19
// 1707421796@amoreapi.webex.com

const inputAccessToken = document.querySelector('#accessToken');
const inputSipAddress = document.querySelector('#sipAddress');

if (localStorage.getItem('date') > new Date().getTime()) {
  inputAccessToken.value = localStorage.getItem('accessToken');
  inputSipAddress.value = localStorage.getItem('sipAddress');
} else {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('sipAddress');
}

inputAccessToken.addEventListener('change', (event) => {
  localStorage.setItem('accessToken', event.target.value);
  localStorage.setItem('date', new Date().getTime() + (12 * 60 * 60 * 1000));
});

inputSipAddress.addEventListener('change', (event) => {
  localStorage.setItem('sipAddress', event.target.value);
});


// ------------------------------------------------------
let webex;
let accessToken;
let sipAddress;
let meetingId;
let mediaSettings = {
	"receiveAudio" : true,
	"receiveVideo" : true,
	"receiveShare" : true,
	"sendAudio" : true,
	"sendVideo" : true,
	"sendShare" : false
};
let currentMediaStreams = [];
const meetingStreamsLocalVideo = document.querySelector('#local-video');
const meetingStreamsRemotelVideo = document.querySelector('#remote-video');
const meetingStreamsRemoteAudio = document.querySelector('#remote-audio');
const meetingStreamsRemoteShare = document.querySelector('#remote-screenshare');
const toggleSendAudioButton = document.querySelector('#toggleSendAudio');
const htmlMediaElements = [
  meetingStreamsLocalVideo,
  meetingStreamsRemotelVideo,
  meetingStreamsRemoteShare,
  meetingStreamsRemoteAudio
];

document.querySelector('#start').addEventListener('click', () => {
  accessToken = inputAccessToken.value;
  sipAddress = inputSipAddress.value;

  if (navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    alert('navigator.mdeiaDevices객체가 없어 카메라 및 오디오 동작이 안될 수 있습니다.');
  }

  initWebex()
});

document.querySelector('#leaveMeeting').addEventListener('click', () => {
  leaveMeeting();
});

toggleSendAudioButton.addEventListener('click', () => {
  toggleSendAudio();
});

function getNewError(name, error) {
  let err = new Error(error || '정확한 원인을 알 수 없음');
  err.name = name;

  return err;
}

function initWebex() {
  console.log('Authentication#initWebex()');

  webex = window.webex = Webex.init({
    config: {
      logger: {
        level: 'debug'
      },
      meetings: {
        reconnection: {
          enabled: true
        }
      }
      // Any other sdk config we need
    },
    credentials: {
      access_token: accessToken
    }
  });

  webex.once('ready', () => {
    console.log('Authentication#initWebex() :: Webex Ready');
    document.querySelector('#resultInit').innerHTML = 'success init';

    runWebex();
  });
}

async function runWebex() {
  try {
    await register();
    await createMeeting();
    await getMediaStreams(mediaSettings, {});
    await joinMeeting();
    await addMedia();
    console.log('@@@@@@@@@@@@@');
  } catch(e) {
    console.log('▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼');
    console.log('catched error : ', e.name);
    console.log(e);
    console.log('▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲');
  }
}

function register() {
  console.log('Authentication#register()');

  return new Promise((resolve, reject) => {
    webex.meetings.register()
      .then(() => {
        console.log('Authentication#register() :: successfully registered');
        document.querySelector('#resultRegister').innerHTML = 'success register';

        webex.meetings.on('meeting:added', (m) => {
          const {type} = m;
      
          if (type === 'INCOMING') {
            const newMeeting = m.meeting;
      
            newMeeting.acknowledge(type);
          }
        });

        if (webex.meetings.registered) {
          resolve();
        } else {
          reject(getNewError('register_then'));
        }
      })
      .catch((error) => {
        console.warn('Authentication#register() :: error registering', error);
        document.querySelector('#resultRegister').innerHTML = 'fail register';

        reject(getNewError('register_catch', error));
      });
  });
}

function createMeeting() {
  return new Promise((resolve, reject) => {
    webex.meetings.create(sipAddress)
      .then((meeting) => {
        meetingId = meeting.id;
        
        resolve();
      })
      .catch((error) => {
        reject(getNewError('createMeeting_catch', error));
      });
  });
}

function getCurrentMeeting() {
  const meetings = webex.meetings.getAllMeetings();

  return meetings[Object.keys(meetings)[0]];
}

function getMediaStreams(mediaSettings, audioVideoInputDevices) {
  console.log('MeetingControls#getMediaStreams()');

  return new Promise((resolve, reject) => {
    const meeting = getCurrentMeeting();
  
  
    if (!meeting) {
      console.log('MeetingControls#getMediaStreams() :: no valid meeting object!');
  
      // return Promise.reject(new Error('No valid meeting object.'));
      return reject(getNewError('getMediaStreams_checkMeeting', new Error('invalid meeting')));
    }
  
    // Get local media streams
    return meeting.getMediaStreams(mediaSettings, audioVideoInputDevices)
      .then(([localStream, localShare]) => {
        console.log('MeetingControls#getMediaStreams() :: Successfully got following streams', localStream, localShare);
        // Keep track of current stream in order to addMedia later.
        const [currLocalStream, currLocalShare] = currentMediaStreams;
  
        /*
         * In the event of updating only a particular stream, other streams return as undefined.
         * We default back to previous stream in this case.
         */
        currentMediaStreams = [localStream || currLocalStream, localShare || currLocalShare];
  
        return currentMediaStreams;
      })
      .then(([localStream]) => {
        if (localStream && mediaSettings.sendVideo) {
          meetingStreamsLocalVideo.srcObject = localStream;
        }
  
        // return {localStream};
        return resolve();
      })
      .catch((error) => {
        console.log('MeetingControls#getMediaStreams() :: Error getting streams!');
  
        // return Promise.reject(error);
        return reject(getNewError('getMediaStreams_catch', error));
      });
  });
}

function joinMeeting() {
  return new Promise((resolve, reject) => {
    const meeting = webex.meetings.getAllMeetings()[meetingId];

    if (!meeting) {
      reject(getNewError('joinMeeting_checkMeeting', new Error('invalid meeting')));
    }
    const resourceId = webex.devicemanager._pairedDevice ?
      webex.devicemanager._pairedDevice.identity.id :
      undefined;

    meeting.join({
      pin: '',
      moderator: false,
      moveToResource: false,
      resourceId
    })
      .then(() => {
        document.querySelector('#resultJoinMeeting').innerHTML = meeting.destination ||
          meeting.sipUri ||
          meeting.id;
        
        resolve();
      })
      .catch((error) => {
        reject(getNewError('joinMeeting_catch', error));
      }); 
  });
}

function addMedia() {
  return new Promise((resolve, reject) => {
    const meeting = getCurrentMeeting();
    const [localStream, localShare] = currentMediaStreams;

    console.log('MeetingStreams#addMedia()');

    if (!meeting) {
      console.log('MeetingStreams#addMedia() :: no valid meeting object!');
      reject(getNewError('addMedia_checkMeeting', new Error('invalid meeting')));
    }

    meeting.addMedia({
      localShare,
      localStream,
      mediaSettings: mediaSettings
    }).then(() => {
      console.log('MeetingStreams#addMedia() :: successfully added media!');
      resolve();
    }).catch((error) => {
      console.log('MeetingStreams#addMedia() :: Error adding media!');
      reject(getNewError('addMedia_catch', error));
    });

    // Wait for media in order to show video/share
    meeting.on('media:ready', (media) => {
      // eslint-disable-next-line default-case
      switch (media.type) {
        case 'remoteVideo':
          meetingStreamsRemotelVideo.srcObject = media.stream;
          break;
        case 'remoteAudio':
          meetingStreamsRemoteAudio.srcObject = media.stream;
          break;
        case 'remoteShare':
          meetingStreamsRemoteShare.srcObject = media.stream;
          break;
        default :
          console.log(media.type);
          break;
        /* case 'localShare':
          meetingStreamsLocalShare.srcObject = media.stream;
          break; */
      }
    });
  });
}

function cleanUpMedia(mediaElements) {
  mediaElements.forEach((elem) => {
    if (elem.srcObject) {
      elem.srcObject.getTracks().forEach((track) => track.stop());
      // eslint-disable-next-line no-param-reassign
      elem.srcObject = null;
    }
  });
}

function leaveMeeting() {
  try {
    if (!meetingId) {
      throw getNewError('leaveMeeting_checkMeetingId', new Error('undefined meetingId'));
    }
  
    const meeting = webex.meetings.getAllMeetings()[meetingId];
  
    if (!meeting) {
      throw getNewError('addMedia_checkMeeting', new Error('invalid meeting'));
    }
  
    meeting.leave()
      .then(() => {
        document.querySelector('#resultLeaveMeeting').innerHTML = 'success leave meeting';
        // eslint-disable-next-line no-use-before-define
        cleanUpMedia(htmlMediaElements);
      });
  } catch(e) {
    console.log('▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼');
    console.log('catched error : ', e.name);
    console.log(e);
    console.log('▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲');
  }
}

function toggleSendAudio() {
  try {
    if (!meetingId) {
      throw getNewError('leaveMeeting_checkMeetingId', new Error('undefined meetingId'));
    }

    const meeting = getCurrentMeeting();
  
    console.log('MeetingControls#toggleSendAudio()');
    if (!meeting) {
      throw getNewError('addMedia_checkMeeting', new Error('invalid meeting'));
    }
  
    if (meeting.isAudioMuted()) {
      meeting.unmuteAudio()
        .then(() => {
          toggleSendAudioButton.innerText = 'mute';
          console.log('MeetingControls#toggleSendAudio() :: Successfully unmuted audio!');
        })
        .catch((error) => {
          throw getNewError('toggleSendAudio_unmuteAudio_catch', error);
        });
    }
    else {
      meeting.muteAudio()
        .then(() => {
          toggleSendAudioButton.innerText = 'unmute';
          console.log('MeetingControls#toggleSendAudio() :: Successfully muted audio!');
        })
        .catch((error) => {
          throw getNewError('toggleSendAudio_muteAudio_catch', error);
        });
    }
  } catch(e) {
    console.log('▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼');
    console.log('catched error : ', e.name);
    console.log(e);
    console.log('▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲');
  }
}