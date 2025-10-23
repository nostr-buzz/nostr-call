/**
 * Call Types for WebRTC + Nostr Voice/Video Calling
 */

export type CallState = 
  | 'idle' 
  | 'calling' 
  | 'ringing' 
  | 'connected' 
  | 'disconnected' 
  | 'failed';

export type CallType = 'audio' | 'video';

export interface MediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
}

export interface CallConfig {
  iceServers: RTCIceServer[];
  mediaConstraints: MediaStreamConstraints;
}

/**
 * Signaling message types sent via Nostr encrypted DMs
 */
export type SignalingMessageType = 
  | 'call-offer' 
  | 'call-answer' 
  | 'ice-candidate' 
  | 'call-hangup' 
  | 'call-reject';

export interface BaseSignalingMessage {
  type: SignalingMessageType;
  callId: string;
  timestamp: number;
}

export interface CallOfferMessage extends BaseSignalingMessage {
  type: 'call-offer';
  callType: CallType;
  offer: RTCSessionDescriptionInit;
}

export interface CallAnswerMessage extends BaseSignalingMessage {
  type: 'call-answer';
  answer: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage extends BaseSignalingMessage {
  type: 'ice-candidate';
  candidate: RTCIceCandidateInit;
}

export interface CallHangupMessage extends BaseSignalingMessage {
  type: 'call-hangup';
}

export interface CallRejectMessage extends BaseSignalingMessage {
  type: 'call-reject';
  reason?: string;
}

export type SignalingMessage = 
  | CallOfferMessage 
  | CallAnswerMessage 
  | IceCandidateMessage 
  | CallHangupMessage 
  | CallRejectMessage;

/**
 * Call session information
 */
export interface CallSession {
  callId: string;
  remotePubkey: string;
  callType: CallType;
  isInitiator: boolean;
  state: CallState;
  startTime?: number;
  endTime?: number;
}

/**
 * Call statistics for monitoring
 */
export interface CallStats {
  duration: number;
  bytesSent: number;
  bytesReceived: number;
  packetsLost: number;
  jitter: number;
  roundTripTime?: number;
}

/**
 * Events emitted by the call system
 */
export type CallEventType = 
  | 'state-changed' 
  | 'media-changed' 
  | 'stats-updated' 
  | 'error';

export interface CallEvent {
  type: CallEventType;
  data?: unknown;
}
