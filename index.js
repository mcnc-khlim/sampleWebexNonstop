/* 
1. init
2. register
3. create meeting
4. get media stream
5. join meeting
6. add media
 */
// https://js.samples.s4d.io/browser-plugin-meetings/
// OTJlZjUyZDUtMmQ4Yy00NzQxLWEyYWMtMWZhZmFhMTIwMDRhYmY5NTIxM2UtODZk_P0A1_3af8b8a3-c856-4011-9a72-790a0b303b19
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
const htmlMediaElements = [
  meetingStreamsLocalVideo,
  meetingStreamsRemotelVideo,
  meetingStreamsRemoteShare,
  meetingStreamsRemoteAudio
];

document.querySelector('#start').addEventListener('click', () => {
  accessToken = inputAccessToken.value;
  sipAddress = inputSipAddress.value;

  initWebex();
});


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

    register();
  });
}

function register() {
  console.log('Authentication#register()');

  webex.meetings.register()
    .then(() => {
      console.log('Authentication#register() :: successfully registered');
    })
    .catch((error) => {
      console.warn('Authentication#register() :: error registering', error);
    })
    .finally(() => {
      document.querySelector('#resultRegister').innerHTML = webex.meetings.registered ? 'success register' : 'fail register';

      if (webex.meetings.registered) {
        createMeeting();
      }
    });

  webex.meetings.on('meeting:added', (m) => {
    const {type} = m;

    if (type === 'INCOMING') {
      const newMeeting = m.meeting;

      newMeeting.acknowledge(type);
    }
  });
}

function createMeeting() {
  webex.meetings.create(sipAddress)
    .then((meeting) => {
      meetingId = meeting.id;
      getMediaStreams(mediaSettings, {})
    })
    .catch((error) => {
      console.log('createMeeting catch');
      console.wran(error);
    });
}

function getCurrentMeeting() {
  const meetings = webex.meetings.getAllMeetings();

  return meetings[Object.keys(meetings)[0]];
}

function getMediaStreams(mediaSettings, audioVideoInputDevices) {
  const meeting = getCurrentMeeting();

  console.log('MeetingControls#getMediaStreams()');

  if (!meeting) {
    console.log('MeetingControls#getMediaStreams() :: no valid meeting object!');

    return Promise.reject(new Error('No valid meeting object.'));
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

      return {localStream};
    })
    .catch((error) => {
      console.log('MeetingControls#getMediaStreams() :: Error getting streams!');
      console.error();

      return Promise.reject(error);
    });
}