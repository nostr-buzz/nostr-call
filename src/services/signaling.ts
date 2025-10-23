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

    console.log(`Initiating ${callType} call to ${remotePubkey.slice(0, 8)}...`);

    // Subscribe to signaling messages from remote peer
    this.unsubscribeSignaling = await this.nostrService.subscribeToSignaling(
      remotePubkey,
      (message) => this.handleSignalingMessage(message, remotePubkey)
    );

    // Create WebRTC peer as initiator
    this.webrtcManager.createPeer(
      true, // isInitiator
      (signalData: SignalData) => {
        // Send WebRTC signal via Nostr
        this.sendWebRTCSignal(remotePubkey, callId, signalData);
      },
      onStream,
      onConnect,
      () => {
        this.cleanup();
        onClose();
      },
      onError
    );

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

    console.log(`Answering call from ${remotePubkey.slice(0, 8)}...`);

    // Subscribe to signaling messages from remote peer
    this.unsubscribeSignaling = await this.nostrService.subscribeToSignaling(
      remotePubkey,
      (message) => this.handleSignalingMessage(message, remotePubkey)
    );

    // Create WebRTC peer as answerer
    this.webrtcManager.createPeer(
      false, // isInitiator
      (signalData: SignalData) => {
        // Send WebRTC signal via Nostr
        this.sendWebRTCSignal(remotePubkey, callId, signalData);
      },
      onStream,
      onConnect,
      () => {
        this.cleanup();
        onClose();
      },
      onError
    );

    // Process the offer
    this.webrtcManager.signal(offer as SignalData);
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
    // Ignore messages from other calls
    if (message.callId !== this.currentCallId) {
      console.debug('Ignoring message from different call:', message.callId);
      return;
    }

    console.log(`Handling signaling message: ${message.type}`);

    switch (message.type) {
      case 'call-offer':
        // Offers should be handled separately through answerCall
        console.warn('Received offer in active call, ignoring');
        break;

      case 'call-answer': {
        // Process the answer
        const answerMsg = message as CallAnswerMessage;
        this.webrtcManager.signal(answerMsg.answer as SignalData);
        break;
      }

      case 'ice-candidate': {
        // Process ICE candidate
        const candidateMsg = message as IceCandidateMessage;
        this.webrtcManager.signal(candidateMsg.candidate as SignalData);
        break;
      }

      case 'call-hangup':
        console.log('Remote peer hung up');
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
