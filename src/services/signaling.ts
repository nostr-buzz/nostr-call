/**
 * Signaling Coordinator
 * Bridges Nostr encrypted DMs with WebRTC signaling
 */

import type { SignalData } from 'simple-peer';
import { NostrService } from './nostrService';
import { WebRTCManager } from './webrtc';
import type {
  SignalingMessage,
  CallOfferMessage,
  CallAnswerMessage,
  IceCandidateMessage,
  CallType,
} from '@/types/call';

// Enhanced logging
const logDebug = (category: string, message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Signaling/${category}] ${message}`, data || '');
};

export class SignalingCoordinator {
  private nostrService: NostrService;
  private webrtcManager: WebRTCManager;
  private currentCallId: string | null = null;
  private unsubscribeSignaling: (() => void) | null = null;

  constructor(nostrService: NostrService, webrtcManager: WebRTCManager) {
    this.nostrService = nostrService;
    this.webrtcManager = webrtcManager;
  }

  /**
   * Initialize an outgoing call
   */
  async initiateCall(
    remotePubkey: string,
    callType: CallType,
    onConnect: () => void,
    onStream: (stream: MediaStream) => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): Promise<string> {
    const callId = this.generateCallId();
    this.currentCallId = callId;

    logDebug('InitiateCall', `Initiating ${callType} call`, {
      remotePubkey: remotePubkey.slice(0, 8) + '...',
      callId,
      callType,
    });

    // Subscribe to signaling messages from remote peer
    logDebug('Subscribe', 'Subscribing to signaling messages from remote peer');
    this.unsubscribeSignaling = await this.nostrService.subscribeToSignaling(
      remotePubkey,
      (message) => this.handleSignalingMessage(message, remotePubkey)
    );
    logDebug('Subscribe', '✓ Subscribed to signaling messages');

    // Create WebRTC peer as initiator
    logDebug('Peer', 'Creating WebRTC peer (initiator)');
    this.webrtcManager.createPeer(
      true, // isInitiator
      (signalData: SignalData) => {
        // Send WebRTC signal via Nostr
        logDebug('SendSignal', `Sending ${signalData.type} via Nostr`, {
          callId,
          remotePubkey: remotePubkey.slice(0, 8) + '...',
        });
        this.sendWebRTCSignal(remotePubkey, callId, signalData);
      },
      onStream,
      onConnect,
      () => {
        logDebug('Cleanup', 'Call ended, cleaning up');
        this.cleanup();
        onClose();
      },
      onError
    );

    logDebug('InitiateCall', '✓ Call initiation complete', { callId });
    return callId;
  }

  /**
   * Answer an incoming call
   */
  async answerCall(
    remotePubkey: string,
    offerMessage: CallOfferMessage,
    onConnect: () => void,
    onStream: (stream: MediaStream) => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    const { callId, offer } = offerMessage;
    this.currentCallId = callId;

    logDebug('AnswerCall', `Answering call from remote peer`, {
      remotePubkey: remotePubkey.slice(0, 8) + '...',
      callId,
    });

    // Subscribe to signaling messages from remote peer
    logDebug('Subscribe', 'Subscribing to signaling messages');
    this.unsubscribeSignaling = await this.nostrService.subscribeToSignaling(
      remotePubkey,
      (message) => this.handleSignalingMessage(message, remotePubkey)
    );

    // Create WebRTC peer as answerer
    logDebug('Peer', 'Creating WebRTC peer (answerer)');
    this.webrtcManager.createPeer(
      false, // isInitiator
      (signalData: SignalData) => {
        // Send WebRTC signal via Nostr
        logDebug('SendSignal', `Sending ${signalData.type} via Nostr`, {
          callId,
          remotePubkey: remotePubkey.slice(0, 8) + '...',
        });
        this.sendWebRTCSignal(remotePubkey, callId, signalData);
      },
      onStream,
      onConnect,
      () => {
        logDebug('Cleanup', 'Call ended, cleaning up');
        this.cleanup();
        onClose();
      },
      onError
    );

    // Process the offer
    logDebug('ProcessOffer', 'Processing remote offer');
    this.webrtcManager.signal(offer as SignalData);
    logDebug('AnswerCall', '✓ Call answer complete');
  }

  /**
   * Reject an incoming call
   */
  async rejectCall(remotePubkey: string, callId: string, reason?: string): Promise<void> {
    console.log(`Rejecting call ${callId} from ${remotePubkey.slice(0, 8)}...`);

    const message: SignalingMessage = {
      type: 'call-reject',
      callId,
      timestamp: Date.now(),
      reason,
    };

    await this.nostrService.sendSignalingMessage(remotePubkey, message);
  }

  /**
   * Hang up the current call
   */
  async hangup(remotePubkey: string): Promise<void> {
    if (!this.currentCallId) {
      console.warn('No active call to hang up');
      return;
    }

    console.log(`Hanging up call ${this.currentCallId}`);

    const message: SignalingMessage = {
      type: 'call-hangup',
      callId: this.currentCallId,
      timestamp: Date.now(),
    };

    await this.nostrService.sendSignalingMessage(remotePubkey, message);
    this.cleanup();
  }

  /**
   * Handle incoming signaling messages from Nostr
   */
  private async handleSignalingMessage(
    message: SignalingMessage,
    _remotePubkey: string
  ): Promise<void> {
    // Ignore messages if no active call
    if (!this.currentCallId) {
      logDebug('HandleMessage', 'Ignoring message - no active call', { messageType: message.type });
      return;
    }

    // Ignore messages from other calls
    if (message.callId !== this.currentCallId) {
      logDebug('HandleMessage', 'Ignoring message from different call', {
        messageCallId: message.callId,
        currentCallId: this.currentCallId,
      });
      return;
    }

    logDebug('HandleMessage', `Processing ${message.type}`, {
      callId: message.callId,
      messageType: message.type,
    });

    switch (message.type) {
      case 'call-offer':
        // Offers should be handled separately through answerCall
        logDebug('HandleMessage', 'Received offer in active call, ignoring');
        break;

      case 'call-answer': {
        // Process the answer
        logDebug('ProcessAnswer', 'Processing remote answer');
        const answerMsg = message as CallAnswerMessage;
        this.webrtcManager.signal(answerMsg.answer as SignalData);
        logDebug('ProcessAnswer', '✓ Answer processed successfully');
        break;
      }

      case 'ice-candidate': {
        // Process ICE candidate
        const candidateMsg = message as IceCandidateMessage;
        logDebug('ProcessCandidate', 'Processing ICE candidate', {
          candidate: candidateMsg.candidate.candidate,
        });
        this.webrtcManager.signal(candidateMsg.candidate as SignalData);
        logDebug('ProcessCandidate', '✓ ICE candidate processed');
        break;
      }

      case 'call-hangup':
        logDebug('Hangup', 'Remote peer hung up');
        this.cleanup();
        break;

      case 'call-reject':
        console.log('Call was rejected by remote peer');
        this.cleanup();
        break;
    }
  }

  /**
   * Send WebRTC signaling data via Nostr
   */
  private async sendWebRTCSignal(
    remotePubkey: string,
    callId: string,
    signalData: SignalData
  ): Promise<void> {
    console.log(`Sending ${signalData.type || 'signal'} to ${remotePubkey.slice(0, 8)}...`);
    let message: SignalingMessage;

    if (signalData.type === 'offer') {
      // This shouldn't happen for answerer, but handle it
      const callType: CallType = 'video'; // Default, should be passed from context
      message = {
        type: 'call-offer',
        callId,
        callType,
        offer: signalData,
        timestamp: Date.now(),
      } as CallOfferMessage;
    } else if (signalData.type === 'answer') {
      message = {
        type: 'call-answer',
        callId,
        answer: signalData,
        timestamp: Date.now(),
      } as CallAnswerMessage;
    } else {
      // ICE candidate or other signaling data
      message = {
        type: 'ice-candidate',
        callId,
        candidate: signalData,
        timestamp: Date.now(),
      } as IceCandidateMessage;
    }

    await this.nostrService.sendSignalingMessage(remotePubkey, message);
  }

  /**
   * Generate a unique call ID
   */
  private generateCallId(): string {
    return `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up signaling resources
   */
  cleanup(): void {
    console.log('Cleaning up signaling coordinator');

    if (this.unsubscribeSignaling) {
      this.unsubscribeSignaling();
      this.unsubscribeSignaling = null;
    }

    this.currentCallId = null;
  }

  /**
   * Get current call ID
   */
  getCurrentCallId(): string | null {
    return this.currentCallId;
  }
}
