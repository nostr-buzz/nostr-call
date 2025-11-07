/**
 * Call Provider Context
 * React context for managing call state and operations
 */

import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useNostr } from '@nostrify/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCallHistory } from '@/hooks/useCallHistory';
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
  const { addCallToHistory } = useCallHistory();

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
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ringbackAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize ringback audio
  useEffect(() => {
    ringbackAudioRef.current = new Audio('/nostr-call/phone-call.mp3');
    ringbackAudioRef.current.loop = true;
    ringbackAudioRef.current.volume = 0.7;
    
    return () => {
      if (ringbackAudioRef.current) {
        ringbackAudioRef.current.pause();
        ringbackAudioRef.current = null;
      }
    };
  }, []);

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
          
          // Ignore incoming calls if already in a call
          setCallState((currentState) => {
            if (currentState !== 'idle') {
              console.log('Ignoring incoming call - already in call state:', currentState);
              return currentState;
            }

            // Accept the incoming call
            setIncomingCall({
              remotePubkey: senderPubkey,
              offer: callOffer,
              callType: callOffer.callType,
            });
            return 'ringing';
          });
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

    // Clear incoming call data
    setIncomingCall(null);
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
    const callStartTime = Date.now();
    let historyEntryId: string | null = null;
    
    // Add call to history and track the ID for updates
    addCallToHistory({
      remotePubkey,
      callType,
      direction: 'outgoing',
      status: 'calling',
      startTime: callStartTime,
    });
    
    // Get the ID of the entry we just added (it will be the first one)
    const updateHistoryStatus = (status: string, endTime?: number) => {
      try {
        const currentHistory = JSON.parse(localStorage.getItem('nostr-call-history') || '[]');
        if (currentHistory.length > 0) {
          // Update the most recent entry (first in array)
          currentHistory[0] = {
            ...currentHistory[0],
            status,
            endTime: endTime || Date.now(),
            duration: endTime ? Math.round((endTime - callStartTime) / 1000) : Math.round((Date.now() - callStartTime) / 1000),
          };
          localStorage.setItem('nostr-call-history', JSON.stringify(currentHistory));
        }
      } catch (error) {
        console.warn('Failed to update call history:', error);
      }
    };

    try {
      setCallState('calling');

      // Start ringtone playback
      if (ringbackAudioRef.current) {
        ringbackAudioRef.current.loop = true;
        try {
          await ringbackAudioRef.current.play();
        } catch (error) {
          console.warn('Could not play ringtone:', error);
        }
      }

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
        
        // Stop ringtone
        if (ringbackAudioRef.current) {
          ringbackAudioRef.current.pause();
          ringbackAudioRef.current.currentTime = 0;
        }
        
        // Update call history with timeout status
        updateHistoryStatus('failed');
        
        cleanup();
      }, 60000);

      // Initiate signaling
      console.log('Starting WebRTC signaling...');
      const signalingCallId = await signalingRef.current.initiateCall(
        remotePubkey,
        callType,
        () => {
          // On connect - clear timeout and stop ringtone
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
          
          // Stop ringtone
          if (ringbackAudioRef.current) {
            ringbackAudioRef.current.pause();
            ringbackAudioRef.current.currentTime = 0;
          }
          
          console.log('Call connected successfully!');
          setCallState('connected');
          
          // Update call history with connected status
          updateHistoryStatus('connected');
          
          setCurrentSession({
            callId: signalingCallId,
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
          
          // Stop ringtone if still playing
          if (ringbackAudioRef.current) {
            ringbackAudioRef.current.pause();
            ringbackAudioRef.current.currentTime = 0;
          }
          
          console.log('Call closed');
          
          // Update call history with end time and duration
          updateHistoryStatus('completed');
          
          cleanup();
        },
        (error: Error) => {
          // On error
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
          
          // Stop ringtone
          if (ringbackAudioRef.current) {
            ringbackAudioRef.current.pause();
            ringbackAudioRef.current.currentTime = 0;
          }
          
          console.error('Call error:', error);
          setCallState('failed');
          
          // Update call history with error status
          updateHistoryStatus('failed');
          
          cleanup();
        }
      );

      console.log('Call initiated with ID:', signalingCallId);
      setCurrentSession({
        callId: signalingCallId,
        remotePubkey,
        callType,
        isInitiator: true,
        state: 'calling',
      });
    } catch (error) {
      if (connectionTimeout) {
        clearTimeout(connectionTimeout);
      }
      
      // Stop ringtone on error
      if (ringbackAudioRef.current) {
        ringbackAudioRef.current.pause();
        ringbackAudioRef.current.currentTime = 0;
      }
      
      console.error('Failed to start call:', error);
      setCallState('failed');
      
      // Update call history with error status
      updateHistoryStatus('failed');
      
      cleanup();
      throw error;
    }
  }, [user, cleanup, addCallToHistory]);

  /**
   * Answer an incoming call
   */
  const answerCall = useCallback(async () => {
    if (!webrtcManagerRef.current || !signalingRef.current || !incomingCall || !user) {
      throw new Error('Cannot answer call: invalid state');
    }

    const callStartTime = Date.now();

    // Add call to history immediately when answering
    addCallToHistory({
      remotePubkey: incomingCall.remotePubkey,
      callType: incomingCall.callType,
      direction: 'incoming',
      status: 'connected',
      startTime: callStartTime,
    });
    
    // Create update function for this call
    const updateIncomingHistoryStatus = (status: string, endTime?: number) => {
      try {
        const currentHistory = JSON.parse(localStorage.getItem('nostr-call-history') || '[]');
        if (currentHistory.length > 0) {
          currentHistory[0] = {
            ...currentHistory[0],
            status,
            endTime: endTime || Date.now(),
            duration: endTime ? Math.round((endTime - callStartTime) / 1000) : Math.round((Date.now() - callStartTime) / 1000),
          };
          localStorage.setItem('nostr-call-history', JSON.stringify(currentHistory));
        }
      } catch (error) {
        console.warn('Failed to update call history:', error);
      }
    };

    try {
      const { remotePubkey, offer, callType } = incomingCall;
      
      console.log('Answering call from:', remotePubkey.slice(0, 8));
      
      // Clear incoming call immediately to prevent duplicate
      setIncomingCall(null);
      setCallState('calling');

      // Initialize local media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'video',
      };
      
      console.log('Initializing local media for answer...');
      const stream = await webrtcManagerRef.current.initializeLocalMedia(constraints);
      setLocalStream(stream);
      console.log('Local media initialized');

      // Create session before answering
      setCurrentSession({
        callId: offer.callId,
        remotePubkey,
        callType,
        isInitiator: false,
        state: 'calling',
      });

      // Answer the call
      console.log('Sending answer...');
      await signalingRef.current.answerCall(
        remotePubkey,
        offer,
        () => {
          // On connect
          console.log('Call connected successfully');
          setCallState('connected');
          setCurrentSession((prev) => (prev ? { ...prev, state: 'connected', startTime: Date.now() } : null));
        },
        (stream: MediaStream) => {
          // On remote stream
          console.log('Remote stream received');
          setRemoteStream(stream);
        },
        () => {
          // On close
          console.log('Call closed by remote');
          
          // Update call history with completion
          updateIncomingHistoryStatus('completed');
          
          cleanup();
        },
        (error: Error) => {
          // On error
          console.error('Call error:', error);
          setCallState('failed');
          
          // Update call history with error
          updateIncomingHistoryStatus('failed');
          
          cleanup();
        }
      );
    } catch (error) {
      console.error('Failed to answer call:', error);
      setCallState('failed');
      setIncomingCall(null);
      
      // Update call history with error
      updateIncomingHistoryStatus('failed');
      
      cleanup();
      throw error;
    }
  }, [incomingCall, user, cleanup, addCallToHistory]);

  /**
   * Reject an incoming call
   */
  const rejectCall = useCallback(async () => {
    if (!signalingRef.current || !incomingCall) {
      return;
    }

    try {
      const { remotePubkey, offer, callType } = incomingCall;
      
      // Add rejected call to history
      addCallToHistory({
        remotePubkey,
        callType,
        direction: 'incoming',
        status: 'rejected',
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
      });
      
      await signalingRef.current.rejectCall(remotePubkey, offer.callId);
      setIncomingCall(null);
      setCallState('idle');
    } catch (error) {
      console.error('Failed to reject call:', error);
    }
  }, [incomingCall, addCallToHistory]);

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
