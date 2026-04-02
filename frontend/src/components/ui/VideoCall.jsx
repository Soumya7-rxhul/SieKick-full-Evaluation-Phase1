import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const APP_ID = process.env.REACT_APP_AGORA_APP_ID;

export default function VideoCall({ roomId, userId, otherUser, mode, onEnd }) {
  const [joined, setJoined]         = useState(false);
  const [loading, setLoading]       = useState(true);
  const [micOn, setMicOn]           = useState(true);
  const [camOn, setCamOn]           = useState(mode === 'video');
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [duration, setDuration]     = useState(0);

  const clientRef     = useRef(null);
  const localAudio    = useRef(null);
  const localVideo    = useRef(null);
  const timerRef      = useRef(null);
  const localVideoEl  = useRef(null);
  const remoteVideoEl = useRef(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    joinCall();
    return () => {
      document.body.style.overflow = '';
      leaveCall();
    };
  }, []);

  useEffect(() => {
    if (remoteJoined) {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [remoteJoined]);

  const joinCall = async () => {
    try {
      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      clientRef.current = client;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === 'video' && remoteVideoEl.current) {
          user.videoTrack?.play(remoteVideoEl.current);
        }
        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }
        setRemoteJoined(true);
      });

      client.on('user-unpublished', () => setRemoteJoined(false));
      client.on('user-left', () => setRemoteJoined(false));

      // Use roomId as channel name, no token needed in testing mode
      await client.join(APP_ID, roomId, null, userId);

      // Create audio track
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localAudio.current = audioTrack;

      const tracksToPublish = [audioTrack];

      // Create video track if video call
      if (mode === 'video') {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideo.current = videoTrack;
        if (localVideoEl.current) videoTrack.play(localVideoEl.current);
        tracksToPublish.push(videoTrack);
      }

      await client.publish(tracksToPublish);
      setJoined(true);
      setLoading(false);
    } catch (err) {
      console.error('Agora join error:', err);
      setLoading(false);
    }
  };

  const leaveCall = async () => {
    clearInterval(timerRef.current);
    localAudio.current?.close();
    localVideo.current?.close();
    await clientRef.current?.leave();
  };

  const handleEnd = async () => {
    await leaveCall();
    onEnd();
  };

  const toggleMic = async () => {
    if (localAudio.current) {
      await localAudio.current.setEnabled(!micOn);
      setMicOn(m => !m);
    }
  };

  const toggleCam = async () => {
    if (localVideo.current) {
      await localVideo.current.setEnabled(!camOn);
      setCamOn(c => !c);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: '#0a0a0f', zIndex: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

      {/* Remote video */}
      {mode === 'video' && (
        <div ref={remoteVideoEl} style={{ position: 'absolute', inset: 0, background: '#1A1535' }} />
      )}

      {/* Audio call background */}
      {mode === 'audio' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 40 }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg,#7C3AED,#2DD4BF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 700, color: 'white', boxShadow: remoteJoined ? '0 0 0 20px rgba(124,58,237,0.15), 0 0 0 40px rgba(124,58,237,0.08)' : 'none', transition: 'box-shadow 0.5s' }}>
            {otherUser?.name?.[0]?.toUpperCase()}
          </div>
          <p style={{ color: '#F1F0F7', fontSize: 22, fontWeight: 700 }}>{otherUser?.name}</p>
          <p style={{ color: '#6E6893', fontSize: 14 }}>
            {loading ? 'Connecting...' : remoteJoined ? formatTime(duration) : 'Waiting for other person...'}
          </p>
        </div>
      )}

      {/* Local video (small) */}
      {mode === 'video' && (
        <div ref={localVideoEl} style={{ position: 'absolute', top: 20, right: 20, width: 100, height: 140, borderRadius: 12, background: '#2D2653', border: '2px solid #433B72', overflow: 'hidden', zIndex: 10 }} />
      )}

      {/* Video call status */}
      {mode === 'video' && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
          <p style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>{otherUser?.name}</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
            {loading ? 'Connecting...' : remoteJoined ? formatTime(duration) : 'Waiting...'}
          </p>
        </div>
      )}

      {/* Controls */}
      <div style={{ position: 'absolute', bottom: 60, display: 'flex', gap: 20, alignItems: 'center', zIndex: 10 }}>
        {/* Mic toggle */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={toggleMic}
          style={{ width: 56, height: 56, borderRadius: '50%', background: micOn ? 'rgba(255,255,255,0.15)' : '#F87171', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {micOn ? <Mic size={22} color="white" /> : <MicOff size={22} color="white" />}
        </motion.button>

        {/* End call */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleEnd}
          style={{ width: 68, height: 68, borderRadius: '50%', background: '#F43F5E', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(244,63,94,0.5)' }}>
          <PhoneOff size={26} color="white" />
        </motion.button>

        {/* Camera toggle (video only) */}
        {mode === 'video' && (
          <motion.button whileTap={{ scale: 0.9 }} onClick={toggleCam}
            style={{ width: 56, height: 56, borderRadius: '50%', background: camOn ? 'rgba(255,255,255,0.15)' : '#F87171', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {camOn ? <Video size={22} color="white" /> : <VideoOff size={22} color="white" />}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
