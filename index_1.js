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
    console.warn('navigator.mdeiaDevices객체가 없어 카메라 및 오디오 동작이 안될 수 있습니다.');
  }

  initWebex();
});

document.querySelector('#leaveMeeting').addEventListener('click', () => {
  leaveMeeting();
});

toggleSendAudioButton.addEventListener('click', () => {
  toggleSendAudio();
});

function printLog(content) {
  console.log('▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼');
  console.log(content);
  console.log('▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲');
}

/*
  에러코드 분류
    [01] : register
    [02] : createMeeting
    [03] : getMediaStreams
    [04] : joinMeeting
    [05] : addMedia
    [06] : leaveMeeting
    [07] : toggleSendAudio
 */
function printError(e, doAlert) {
  console.log('▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼');
  console.log('catched error : ', e.name);
  console.log(e);
  console.log('▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲');

  if (doAlert) {
    alert(e.name.substr(0,4) + '_라이브 참석에 실패했습니다.\n라이브가 보이지 않으면 뒤로가기 후 재입장하거나 앱을 재실행 해주세요.');
  }
}

function getNewError(name, error) {
  let err = new Error(error || '정확한 원인을 알 수 없음');
  err.name = name;

  return err;
}

function initWebex() {
  printLog('initWebex start');
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
    printLog('initWebex done');
    console.log('Authentication#initWebex() :: Webex Ready');
    document.querySelector('#resultInit').innerHTML = 'success init';

    runWebex();
  });
}

async function runWebex() {
  try {
    printLog('runWebex start');
    await register();
    await createMeeting();
    await getMediaStreams(mediaSettings, {});
    await joinMeeting();
    await addMedia();
    printLog('runWebex done');
  } catch(e) {
    printError(e, true);
  }
}

function register() {
  printLog('register start');
  console.log('Authentication#register()');

  return new Promise((resolve, reject) => {
    webex.meetings.register()
      .then(() => {
        console.log('Authentication#register() :: successfully registered');
        document.querySelector('#resultRegister').innerHTML = 'success register';

        webex.meetings.on('meeting:added', (m) => {
          printLog('register meeting:added');
          const {type} = m;
      
          if (type === 'INCOMING') {
            const newMeeting = m.meeting;
      
            newMeeting.acknowledge(type);
          }
        });
        webex.meetings.on('meeting:removed', () => {
          printLog('register meeting:removed');
          // 호스트가 미팅 종료 시 발생 (호스트가 미팅 나가기 선택 시 감지 안됨)
          alert('라이브 방송이 종료되었습니다.');
        });

        if (webex.meetings.registered) {
          printLog('register done');
          resolve();
        } else {
          reject(getNewError('[01]register_then'));
        }
      })
      .catch((error) => {
        console.warn('Authentication#register() :: error registering', error);
        document.querySelector('#resultRegister').innerHTML = 'fail register';

        reject(getNewError('[01]register_catch', error));
      });
  });
}

function createMeeting() {
  printLog('createMeeting start');

  return new Promise((resolve, reject) => {
    webex.meetings.create(sipAddress)
      .then((meeting) => {
        meetingId = meeting.id;
        
        printLog('createMeeting done');
        resolve();
      })
      .catch((error) => {
        reject(getNewError('[02]createMeeting_catch', error));
      });
  });
}

function getCurrentMeeting() {
  const meetings = webex.meetings.getAllMeetings();

  return meetings[Object.keys(meetings)[0]];
}

function getMediaStreams(mediaSettings, audioVideoInputDevices) {
  printLog('getMediaStreams start');
  console.log('MeetingControls#getMediaStreams()');

  return new Promise((resolve, reject) => {
    const meeting = getCurrentMeeting();
  
    if (!meeting) {
      console.log('MeetingControls#getMediaStreams() :: no valid meeting object!');
  
      // return Promise.reject(new Error('No valid meeting object.'));
      return reject(getNewError('[03]getMediaStreams_checkMeeting', new Error('invalid meeting')));
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
  
        printLog('getMediaStreams done');
        // return {localStream};
        return resolve();
      })
      .catch((error) => {
        console.log('MeetingControls#getMediaStreams() :: Error getting streams!');
  
        // return Promise.reject(error);
        return reject(getNewError('[03]getMediaStreams_catch', error));
      });
  });
}

function joinMeeting() {
  printLog('joinMeeting start');

  return new Promise((resolve, reject) => {
    const meeting = webex.meetings.getAllMeetings()[meetingId];

    if (!meeting) {
      reject(getNewError('[04]joinMeeting_checkMeeting', new Error('invalid meeting')));
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
        
        printLog('joinMeeting done');
        resolve();
      })
      .catch((error) => {
        if (error.stack.toString().indexOf('started yet') > -1) {
          reject(getNewError('[04]joinMeeting_catch_notStartedMeeting'));
        } else {
          reject(getNewError('[04]joinMeeting_catch', error));
        }
      }); 
  });
}

function addMedia() {
  printLog('addMedia start');

  return new Promise((resolve, reject) => {
    const meeting = getCurrentMeeting();
    const [localStream, localShare] = currentMediaStreams;

    console.log('MeetingStreams#addMedia()');

    if (!meeting) {
      console.log('MeetingStreams#addMedia() :: no valid meeting object!');
      reject(getNewError('[05]addMedia_checkMeeting', new Error('invalid meeting')));
    }

    meeting.addMedia({
      localShare,
      localStream,
      mediaSettings: mediaSettings
    }).then(() => {
      printLog('addMedia done');
      console.log('MeetingStreams#addMedia() :: successfully added media!');
      resolve();
    }).catch((error) => {
      console.log('MeetingStreams#addMedia() :: Error adding media!');
      reject(getNewError('[05]addMedia_catch', error));
    });

    // Wait for media in order to show video/share
    meeting.on('media:ready', (media) => {
      printLog('addMedia media:ready >>> ' + media.type);

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
  printLog('leaveMeeting start');

  try {
    if (!meetingId) {
      throw getNewError('[06]leaveMeeting_checkMeetingId', new Error('undefined meetingId'));
    }
  
    const meeting = webex.meetings.getAllMeetings()[meetingId];
  
    if (!meeting) {
      throw getNewError('[06]addMedia_checkMeeting', new Error('invalid meeting'));
    }
  
    meeting.leave()
      .then(() => {
        document.querySelector('#resultLeaveMeeting').innerHTML = 'success leave meeting';
        // eslint-disable-next-line no-use-before-define
        cleanUpMedia(htmlMediaElements);

        printLog('leaveMeeting done');
      });
  } catch(e) {
    printError(e);
  }
}

function toggleSendAudio() {
  printLog('toggleSendAudio start');

  try {
    if (!meetingId) {
      throw getNewError('[07]leaveMeeting_checkMeetingId', new Error('undefined meetingId'));
    }

    const meeting = getCurrentMeeting();
  
    console.log('MeetingControls#toggleSendAudio()');
    if (!meeting) {
      throw getNewError('[07]addMedia_checkMeeting', new Error('invalid meeting'));
    }
  
    if (meeting.isAudioMuted()) {
      meeting.unmuteAudio()
        .then(() => {
          toggleSendAudioButton.innerText = 'mute';
          console.log('MeetingControls#toggleSendAudio() :: Successfully unmuted audio!');

          printLog('toggleSendAudio done');
        })
        .catch((error) => {
          throw getNewError('[07]toggleSendAudio_unmuteAudio_catch', error);
        });
    }
    else {
      meeting.muteAudio()
        .then(() => {
          toggleSendAudioButton.innerText = 'unmute';
          console.log('MeetingControls#toggleSendAudio() :: Successfully muted audio!');

          printLog('toggleSendAudio done');
        })
        .catch((error) => {
          throw getNewError('[07]toggleSendAudio_muteAudio_catch', error);
        });
    }
  } catch(e) {
    printError(e, true);
  }
}