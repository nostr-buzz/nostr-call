/**
 * Call Provider Context
 * React context for managing call state and operations
 */

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { NostrService } from '@/services/nostrService';
import { WebRTCManager } from '@/services/webrtc';
import { SignalingCoordinator } from '@/services/signaling';
import type {
  CallState,
  CallType,
  MediaState,
  CallSession,
  SignalingMessage,
  CallOfferMessage,
} from '@/types/call';

interface IncomingCallData {
  remotePubkey: string;
  offer: CallOfferMessage;
  callType: CallType;
}

interface CallContextValue {
  // State
  callState: CallState;
  currentSession: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  mediaState: MediaState;
  incomingCall: IncomingCallData | null;

  // Actions
  startCall: (remotePubkey: string, callType: CallType) => Promise<void>;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  hangup: () => Promise<void>;
  toggleAudio: () => void;
  toggleVideo: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

interface CallProviderProps {
  children: React.ReactNode;
}

// Professional STUN/TURN servers for reliable connections
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // Google STUN servers (multiple for redundancy)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  
  // Additional reliable STUN servers
  { urls: 'stun:stun.services.mozilla.com:3478' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  
  // Open Relay Project (free TURN servers)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

export const CallProvider: React.FC<CallProviderProps> = ({ children }) => {
  const { nostr } = useNostr();
  const { user } = useCurrentUser();

  // State
  const [callState, setCallState] = useState<CallState>('idle');
  const [currentSession, setCurrentSession] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [mediaState, setMediaState] = useState<MediaState>({
    audioEnabled: true,
    videoEnabled: true,
    isScreenSharing: false,
  });
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  // Service refs
  const nostrServiceRef = useRef<NostrService | null>(null);
  const webrtcManagerRef = useRef<WebRTCManager | null>(null);
  const signalingRef = useRef<SignalingCoordinator | null>(null);
  const unsubscribeIncomingRef = useRef<(() => void) | null>(null);

  // Initialize services when user is available
  useEffect(() => {
    if (!user || !nostr) {
      return;
    }

    // Initialize services
    nostrServiceRef.current = new NostrService(nostr, user);
    webrtcManagerRef.current = new WebRTCManager({
      iceServers: DEFAULT_ICE_SERVERS,
      mediaConstraints: { audio: true, video: true },
    });
    signalingRef.current = new SignalingCoordinator(
      nostrServiceRef.current,
      webrtcManagerRef.current
    );

    // Subscribe to incoming calls
    const setupIncomingCallListener = async () => {
      if (!nostrServiceRef.current) return;

      unsubscribeIncomingRef.current = await nostrServiceRef.current.subscribeToIncomingCalls(
        (offer: SignalingMessage, senderPubkey: string) => {
          const callOffer = offer as CallOfferMessage;
          
          setIncomingCall({
            remotePubkey: senderPubkey,
            offer: callOffer,
            callType: callOffer.callType,
          });
          setCallState('ringing');
        }
      );
    };

    setupIncomingCallListener();

    // Cleanup on unmount
    return () => {
      if (unsubscribeIncomingRef.current) {
        unsubscribeIncomingRef.current();
      }
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.cleanup();
      }
      if (signalingRef.current) {
        signalingRef.current.cleanup();
      }
      if (nostrServiceRef.current) {
        nostrServiceRef.current.cleanup();
      }
    };
  }, [user, nostr]);

  /**
   * Cleanup call resources
   */
  const cleanup = useCallback(() => {
    console.log('Cleaning up call resources');

    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.cleanup();
    }

    if (signalingRef.current) {
      signalingRef.current.cleanup();
    }

    setCallState('idle');
    setCurrentSession(null);
    setLocalStream(null);
    setRemoteStream(null);
    setMediaState({
      audioEnabled: true,
      videoEnabled: true,
      isScreenSharing: false,
    });
  }, []);

  /**
   * Start an outgoing call
   */
  const startCall = useCallback(async (remotePubkey: string, callType: CallType) => {
    if (!webrtcManagerRef.current || !signalingRef.current || !user) {
      throw new Error('Call services not initialized');
    }

    let connectionTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      setCallState('calling');

      // Initialize local media with timeout
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video',
      };
      
      console.log('Requesting media access...', constraints);
      const stream = await webrtcManagerRef.current.initializeLocalMedia(constraints);
      setLocalStream(stream);
      console.log('Media access granted');

      // Set connection timeout (60 seconds)
      connectionTimeout = setTimeout(() => {
        console.error('Connection timeout - call failed to establish');
        setCallState('failed');
        cleanup();
      }, 60000);

      // Initiate signaling
      console.log('Starting WebRTC signaling...');
      const callId = await signalingRef.current.initiateCall(
        remotePubkey,
        callType,
        () => {
          // On connect - clear timeout
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
          console.log('Call connected successfully!');
          setCallState('connected');
          setCurrentSession({
            callId,
            remotePubkey,
            callType,
            isInitiator: true,
            state: 'connected',
            startTime: Date.now(),
          });
        },
        (stream: MediaStream) => {
          // On remote stream
          console.log('Remote stream received');
          setRemoteStream(stream);
        },
        () => {
          // On close
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
          console.log('Call closed');
          cleanup();
        },
        (error: Error) => {
          // On error
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
          console.error('Call error:', error);
          setCallState('failed');
          cleanup();
        }
      );

      console.log('Call initiated with ID:', callId);
      setCurrentSession({
        callId,
        remotePubkey,
        callType,
        isInitiator: true,
        state: 'calling',
      });
    } catch (error) {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      console.error('Failed to start call:', error);
      setCallState('failed');
      cleanup();
      throw error;
    }
  }, [user, cleanup]);

  /**
   * Answer an incoming call
   */
  const answerCall = useCallback(async () => {
    if (!webrtcManagerRef.current || !signalingRef.current || !incomingCall || !user) {
      throw new Error('Cannot answer call: invalid state');
    }

    try {
      const { remotePubkey, offer, callType } = incomingCall;

      // Initialize local media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video',
      };
      
      const stream = await webrtcManagerRef.current.initializeLocalMedia(constraints);
      setLocalStream(stream);

      // Answer the call
      await signalingRef.current.answerCall(
        remotePubkey,
        offer,
        () => {
          // On connect
          setCallState('connected');
          setCurrentSession((prev) => (prev ? { ...prev, state: 'connected', startTime: Date.now() } : null));
        },
        (stream: MediaStream) => {
          // On remote stream
          setRemoteStream(stream);
        },
        () => {
          // On close
          cleanup();
        },
        (error: Error) => {
          // On error
          console.error('Call error:', error);
          setCallState('failed');
          cleanup();
        }
      );

      setCurrentSession({
        callId: offer.callId,
        remotePubkey,
        callType,
        isInitiator: false,
        state: 'connected',
      });
      setIncomingCall(null);
    } catch (error) {
      console.error('Failed to answer call:', error);
      setCallState('failed');
      cleanup();
      throw error;
    }
  }, [incomingCall, user, cleanup]);

  /**
   * Reject an incoming call
   */
  const rejectCall = useCallback(async () => {
    if (!signalingRef.current || !incomingCall) {
      return;
    }

    try {
      const { remotePubkey, offer } = incomingCall;
      await signalingRef.current.rejectCall(remotePubkey, offer.callId);
      setIncomingCall(null);
      setCallState('idle');
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  }, [incomingCall]);

  /**
   * Hang up the current call
   */
  const hangup = useCallback(async () => {
    if (!signalingRef.current || !currentSession) {
      cleanup();
      return;
    }

    try {
      await signalingRef.current.hangup(currentSession.remotePubkey);
    } catch (error) {
      console.error('Failed to hang up:', error);
    } finally {
      cleanup();
    }
  }, [currentSession, cleanup]);

  /**
   * Toggle audio mute
   */
  const toggleAudio = useCallback(() => {
    if (!webrtcManagerRef.current) return;

    const newState = !mediaState.audioEnabled;
    webrtcManagerRef.current.toggleAudio(newState);
    setMediaState((prev) => ({ ...prev, audioEnabled: newState }));
  }, [mediaState.audioEnabled]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(() => {
    if (!webrtcManagerRef.current) return;

    const newState = !mediaState.videoEnabled;
    webrtcManagerRef.current.toggleVideo(newState);
    setMediaState((prev) => ({ ...prev, videoEnabled: newState }));
  }, [mediaState.videoEnabled]);

  /**
   * Start screen sharing
   */
  const startScreenShare = useCallback(async () => {
    if (!webrtcManagerRef.current) return;

    try {
      await webrtcManagerRef.current.startScreenShare();
      setMediaState((prev) => ({ ...prev, isScreenSharing: true }));
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }, []);

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(async () => {
    if (!webrtcManagerRef.current) return;

    try {
      await webrtcManagerRef.current.stopScreenShare();
      setMediaState((prev) => ({ ...prev, isScreenSharing: false }));
    } catch (error) {
      console.error('Failed to stop screen share:', error);
      throw error;
    }
  }, []);

  const value: CallContextValue = {
    callState,
    currentSession,
    localStream,
    remoteStream,
    mediaState,
    incomingCall,
    startCall,
    answerCall,
    rejectCall,
    hangup,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export { CallContext };
export type { CallContextValue };
