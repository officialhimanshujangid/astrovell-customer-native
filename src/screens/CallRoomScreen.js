/**
 * CallRoomScreen — Customer Native
 *
 * State machine:
 *   'pending'    → call placed, waiting for astrologer to accept
 *   'connecting' → astrologer accepted, fetching Zego token
 *   'active'     → Zego room joined, voice live
 *   'rejected'   → astrologer rejected
 *   'completed'  → call ended
 *
 * Voice: Zegocloud Web SDK embedded in an invisible WebView (audio-only).
 * This works in both Expo Go (with microphone perms) and dev builds.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Modal, TextInput, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import Ionicons from '@expo/vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { callApi, astrologerApi } from '../api/services';
import { colors } from '../theme/colors';
import { ZEGO_SDK } from '../utils/ZegoSDK';

const SOCKET_URL = 'https://astrology-i7c9.onrender.com';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (sec) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

// ─── Zegocloud audio-only WebView HTML ───────────────────────────────────────
// Runs inside an invisible 0×0 WebView; posts messages back to RN.
const buildZegoHtml = ({ appID, roomID, userID, token, serverUrl, userName }) => `
<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<style>*{margin:0;padding:0}body{width:0;height:0;overflow:hidden;background:transparent}</style>
<script>${ZEGO_SDK}</script>
</head><body>
<audio id="ra" autoplay playsinline></audio>
<script>
function post(t,d){try{window.ReactNativeWebView.postMessage(JSON.stringify({type:t,data:d}));}catch(e){}}

async function init(){
  try{
    if(typeof ZegoExpressEngine === 'undefined') throw new Error("Zego class not loaded");
    var zg=new ZegoExpressEngine(Number(${appID}),'${serverUrl||'wss://webliveroom-api.zegocloud.com/ws'}');
    zg.on('roomStateChanged',function(r,reason){post('room_state',reason);});
    zg.on('roomStreamUpdate',async function(r,uType,list){
      if(uType==='ADD'){
        for(var s of list){
          var rs=await zg.startPlayingStream(s.streamID);
          var el=document.getElementById('ra');
          if(el){el.srcObject=rs;el.play().catch(function(){});}
        }
        post('peer_connected',null);
      } else { post('peer_left',null); }
    });
    await zg.loginRoom('${roomID}','${token}',{userID:String('${userID}'),userName:'${userName||'Customer'}'});
    var ls=await zg.createStream({camera:{audio:true,video:false}});
    await zg.startPublishingStream('stream_${userID}',ls);
    post('ready',null);
  }catch(e){post('error',e.message||String(e));}
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
</script></body></html>`;

// ─── Voice WebView (invisible audio bridge) ──────────────────────────────────
const ZegoVoice = ({ config, onReady, onPeerConnected, onPeerLeft, onError }) => {
  if (!config) return null;
  return (
    <WebView
      originWhitelist={['*']}
      mixedContentMode="always"
      source={{ html: buildZegoHtml(config), baseUrl: 'https://astrology-i7c9.onrender.com/' }}
      style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      javaScriptEnabled
      domStorageEnabled
      onPermissionRequest={(e) => e.nativeEvent.grant(e.nativeEvent.resources)}
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === 'ready') onReady?.();
          if (msg.type === 'peer_connected') onPeerConnected?.();
          if (msg.type === 'peer_left') onPeerLeft?.();
          if (msg.type === 'error') onError?.(msg.data);
        } catch (_) {}
      }}
    />
  );
};

// ─── Rating Modal ─────────────────────────────────────────────────────────────
const RatingModal = ({ visible, callData, onSubmit, onSkip, submitting }) => {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={st.modalOverlay}>
        <View style={st.ratingBox}>
          <Text style={st.ratingTitle}>Rate your experience ⭐</Text>
          <Text style={st.ratingName}>{callData?.astrologerName || 'Astrologer'}</Text>
          <View style={st.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Text style={[st.star, n <= rating && st.starOn]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={st.ratingInput}
            value={text}
            onChangeText={setText}
            placeholder="Write your feedback..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <View style={st.ratingRow}>
            <TouchableOpacity style={st.skipBtn} onPress={onSkip}>
              <Text style={st.skipTxt}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={() => onSubmit(rating, text)}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color="#1A1A1A" size="small" />
                : <Text style={st.submitTxt}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const CallRoomScreen = ({ callId, onBack }) => {
  const { user, token } = useSelector((s) => s.auth);

  // State machine
  const [phase, setPhase] = useState('pending');   // pending|connecting|active|rejected|completed
  const [callData, setCallData]   = useState(null);
  const [timer, setTimer]         = useState(0);
  const [balance, setBalance]     = useState(0);
  const [zegoConfig, setZegoConfig] = useState(null);
  const [voiceReady, setVoiceReady] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);

  const socketRef = useRef(null);
  const timerRef  = useRef(null);

  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((p) => p + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  // Fetch Zego token and enter 'active'
  const connectVoice = useCallback(async (cid) => {
    try {
      const res = await callApi.getZegoToken({ callId: parseInt(cid), userId: user?.id });
      if (res.data?.status === 200) {
        setZegoConfig({ ...res.data, userName: user?.name || 'Customer' });
        setPhase('active');
        startTimer();
      } else {
        // Voice token failed but call is accepted — still show active without voice
        setPhase('active');
        startTimer();
        Toast.show({ type: 'error', text1: 'Voice Error', text2: 'Could not connect voice channel.' });
      }
    } catch (e) {
      setPhase('active');
      startTimer();
      Toast.show({ type: 'error', text1: 'Voice Error', text2: 'Could not connect voice channel.' });
    }
  }, [user]);

  // Socket + initial fetch
  useEffect(() => {
    if (!callId || !user) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-call', { callId: parseInt(callId) });
      console.log('[CallRoom] Socket connected, joined call', callId);
    });

    // Fetch current call state (handles late-join / app restart)
    callApi.getCallById({ callId }).then((res) => {
      const d = res.data?.recordList ?? res.data?.data ?? res.data;
      const c = Array.isArray(d) ? d[0] : d;
      if (!c) return;
      setCallData(c);
      setBalance(c.walletAmount || 0);
      if (c.callStatus === 'Accepted') {
        setPhase('connecting');
        connectVoice(callId);
      } else if (c.callStatus === 'Completed') {
        setPhase('completed');
      } else if (c.callStatus === 'Rejected') {
        setPhase('rejected');
      }
      // 'Pending' → stay in 'pending' state (waiting for socket)
    }).catch(() => {});

    // ── Socket events ──────────────────────────────────────────────────────
    socket.on('call-accepted', (data) => {
      console.log('[CallRoom] call-accepted', data);
      setCallData((prev) => ({ ...prev, ...data }));
      setBalance(data.walletAmount || 0);
      setPhase('connecting');
      Toast.show({ type: 'success', text1: '✅ Astrologer Accepted!', text2: 'Connecting voice...' });
      connectVoice(callId);
    });

    socket.on('call-rejected', () => {
      console.log('[CallRoom] call-rejected');
      setPhase('rejected');
      Toast.show({ type: 'error', text1: 'Call Rejected', text2: 'Astrologer is busy right now.' });
    });

    socket.on('call-ended', async (data) => {
      console.log('[CallRoom] call-ended', data);
      setPhase('completed');
      stopTimer();
      // Show rating if not already reviewed
      try {
        const astId = callData?.astrologerId || data?.astrologerId;
        if (astId) {
          const r = await astrologerApi.getReviews({ astrologerId: astId });
          const reviews = r.data?.recordList || r.data?.data || [];
          if (!reviews.some((x) => String(x.userId) === String(user?.id))) {
            setShowRating(true); return;
          }
        }
      } catch (_) {}
      setShowRating(true);
    });

    socket.on('call-balance-update', (data) => {
      setBalance(data.walletAmount || 0);
    });

    socket.on('call-error', (data) => {
      Toast.show({ type: 'error', text1: 'Call Error', text2: data.message || 'An error occurred.' });
    });

    socket.on('connect_error', (e) => console.warn('[CallRoom] socket error:', e.message));

    return () => { socket.disconnect(); stopTimer(); };
  }, [callId, user]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleCancel = () => {
    Alert.alert('Cancel Call', 'Cancel this call request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try { await callApi.cancelCall({ callId: parseInt(callId) }); } catch (_) {}
          onBack?.();
        },
      },
    ]);
  };

  const handleEndCall = () => {
    Alert.alert('End Call', 'End this consultation?', [
      { text: 'Keep Going', style: 'cancel' },
      {
        text: 'End Call', style: 'destructive', onPress: () => {
          socketRef.current?.emit('end-call', { callId: parseInt(callId) });
          stopTimer();
        },
      },
    ]);
  };

  const handleSubmitRating = async (rating, text) => {
    setRatingBusy(true);
    try {
      if (callData?.astrologerId) {
        await astrologerApi.addReview({ astrologerId: callData.astrologerId, rating, review: text });
        Toast.show({ type: 'success', text1: 'Thanks for your rating! ⭐' });
      }
    } catch (_) {}
    setRatingBusy(false);
    setShowRating(false);
    onBack?.();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isVideo = callData?.call_type == 11 || callData?.call_type === 'Video';
  const astroLetter = (callData?.astrologerName || 'A')[0].toUpperCase();

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor="#110022" />

      {/* Invisible audio bridge */}
      <ZegoVoice
        config={zegoConfig}
        onReady={() => { console.log('[Zego] ready'); setVoiceReady(true); }}
        onPeerConnected={() => { console.log('[Zego] peer connected'); setPeerConnected(true); }}
        onPeerLeft={() => setPeerConnected(false)}
        onError={(msg) => console.warn('[Zego] error:', msg)}
      />

      {/* ── PENDING: waiting ─────────────────────────────────────────── */}
      {phase === 'pending' && (
        <View style={st.center}>
          <View style={st.rippleContainer}>
            <View style={[st.ripple, st.ripple3]} />
            <View style={[st.ripple, st.ripple2]} />
            <View style={[st.ripple, st.ripple1]} />
            <View style={st.avatar}><Text style={st.avatarLetter}>{astroLetter}</Text></View>
          </View>
          <Text style={st.name}>{callData?.astrologerName || 'Astrologer'}</Text>
          <Text style={st.subLabel}>{isVideo ? '📹 Video Call' : '📞 Audio Call'}</Text>
          <Text style={st.waiting}>Waiting for astrologer to accept...</Text>
          <ActivityIndicator color={colors.gold} style={{ marginVertical: 12 }} />
          <TouchableOpacity style={st.cancelBtn} onPress={handleCancel} activeOpacity={0.85}>
            <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
            <Text style={st.cancelTxt}>Cancel Call</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── CONNECTING: fetching voice token ─────────────────────────── */}
      {phase === 'connecting' && (
        <View style={st.center}>
          <View style={st.avatar}><Text style={st.avatarLetter}>{astroLetter}</Text></View>
          <Text style={st.name}>{callData?.astrologerName || 'Astrologer'}</Text>
          <View style={st.connectingRow}>
            <ActivityIndicator color="#a78bfa" size="small" />
            <Text style={st.connectingTxt}>Setting up voice channel...</Text>
          </View>
        </View>
      )}

      {/* ── ACTIVE: live call ─────────────────────────────────────────── */}
      {phase === 'active' && (
        <View style={st.center}>
          {/* Avatar with glow when peer connected */}
          <View style={[st.avatarWrap, peerConnected && st.avatarGlow]}>
            <View style={[st.avatar, st.avatarActive]}>
              <Text style={st.avatarLetter}>{astroLetter}</Text>
            </View>
          </View>

          {/* Live badge */}
          <View style={st.liveBadge}>
            <View style={st.liveDot} />
            <Text style={st.liveText}>LIVE</Text>
          </View>

          <Text style={st.name}>{callData?.astrologerName || 'Astrologer'}</Text>

          {/* Voice status */}
          <Text style={st.voiceStatus}>
            {!voiceReady
              ? '⏳ Connecting voice...'
              : peerConnected
              ? '🔊 Voice connected'
              : '🔇 Waiting for peer...'}
          </Text>

          {/* Timer + Balance */}
          <View style={st.infoRow}>
            <View style={st.chip}>
              <Ionicons name="time-outline" size={13} color={colors.gold} />
              <Text style={st.chipTxt}>{fmt(timer)}</Text>
            </View>
            <View style={st.chip}>
              <Ionicons name="wallet-outline" size={13} color={colors.gold} />
              <Text style={st.chipTxt}>₹{parseFloat(balance).toFixed(2)}</Text>
            </View>
          </View>

          <TouchableOpacity style={st.endBtn} onPress={handleEndCall} activeOpacity={0.85}>
            <Ionicons name="call" size={22} color="#FFF" />
            <Text style={st.endTxt}>End Call</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── REJECTED ─────────────────────────────────────────────────── */}
      {phase === 'rejected' && (
        <View style={st.center}>
          <View style={[st.avatar, { backgroundColor: '#ef4444', borderColor: '#ef4444' }]}>
            <Ionicons name="close" size={38} color="#FFF" />
          </View>
          <Text style={st.name}>Call Rejected</Text>
          <Text style={st.waiting}>{callData?.astrologerName || 'The astrologer'} is not available.</Text>
          <TouchableOpacity style={st.goldBtn} onPress={onBack} activeOpacity={0.85}>
            <Text style={st.goldBtnTxt}>Back to Astrologers</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── COMPLETED ────────────────────────────────────────────────── */}
      {phase === 'completed' && !showRating && (
        <View style={st.center}>
          <View style={[st.avatar, { backgroundColor: '#10b981', borderColor: '#10b981' }]}>
            <Ionicons name="checkmark" size={38} color="#FFF" />
          </View>
          <Text style={st.name}>Call Ended</Text>
          <Text style={st.timerBig}>{fmt(timer)}</Text>
          <Text style={st.waiting}>Duration</Text>
          <TouchableOpacity style={st.goldBtn} onPress={onBack} activeOpacity={0.85}>
            <Text style={st.goldBtnTxt}>View Call History</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Rating Modal ─────────────────────────────────────────────── */}
      <RatingModal
        visible={showRating}
        callData={callData}
        onSubmit={handleSubmitRating}
        onSkip={() => { setShowRating(false); onBack?.(); }}
        submitting={ratingBusy}
      />
    </View>
  );
};

export default CallRoomScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────
const PURPLE = '#7c3aed';
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#110022' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  // Ripple rings for pending
  rippleContainer: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  ripple: { position: 'absolute', borderRadius: 999, backgroundColor: `${colors.gold}18` },
  ripple1: { width: 110, height: 110 },
  ripple2: { width: 135, height: 135 },
  ripple3: { width: 160, height: 160 },

  // Avatar
  avatarWrap: { marginBottom: 12 },
  avatarGlow: {
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 16,
  },
  avatar: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: colors.gold,
  },
  avatarActive: {
    width: 110, height: 110, borderRadius: 55,
    shadowColor: colors.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 20, elevation: 12,
  },
  avatarLetter: { color: '#FFF', fontSize: 40, fontWeight: '900' },

  // Live badge
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.5)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4, marginVertical: 10,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' },
  liveText: { color: '#ef4444', fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  name: { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subLabel: { color: '#a78bfa', fontSize: 15, marginBottom: 12 },
  waiting: { color: '#c4b5d8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  timerBig: { color: colors.gold, fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'], marginBottom: 4 },
  voiceStatus: { color: '#a78bfa', fontSize: 13, marginBottom: 20 },

  connectingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  connectingTxt: { color: '#a78bfa', fontSize: 14 },

  // Info chips
  infoRow: { flexDirection: 'row', gap: 14, marginBottom: 32 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(212,175,55,0.15)', borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.35)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  chipTxt: { color: colors.gold, fontWeight: '700', fontSize: 14, fontVariant: ['tabular-nums'] },

  // Buttons
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1.5,
    borderColor: '#ef4444', borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 13, marginTop: 8,
  },
  cancelTxt: { color: '#ef4444', fontWeight: '700', fontSize: 15 },

  endBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#ef4444', borderRadius: 50,
    paddingHorizontal: 40, paddingVertical: 16,
  },
  endTxt: { color: '#FFF', fontWeight: '800', fontSize: 17 },

  goldBtn: {
    backgroundColor: colors.gold, borderRadius: 14,
    paddingHorizontal: 36, paddingVertical: 14, marginTop: 12,
  },
  goldBtnTxt: { color: '#1A1A1A', fontWeight: '800', fontSize: 15 },

  // Rating modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' },
  ratingBox: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28 },
  ratingTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 6 },
  ratingName: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 16 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 20 },
  star: { fontSize: 40, color: '#DDD' },
  starOn: { color: colors.gold },
  ratingInput: {
    borderWidth: 1.5, borderColor: '#E5E5E5', borderRadius: 14,
    padding: 14, fontSize: 14, color: '#333',
    minHeight: 90, marginBottom: 20,
  },
  ratingRow: { flexDirection: 'row', gap: 12 },
  skipBtn: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  skipTxt: { color: '#666', fontWeight: '700', fontSize: 15 },
  submitBtn: { flex: 2, backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitTxt: { color: '#1A1A1A', fontWeight: '800', fontSize: 15 },
});
