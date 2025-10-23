/**
 * WebRTC Connection Manager
 * Handles peer-to-peer media connections with STUN/TURN support
 */

import SimplePeer from 'simple-peer';
import type { Instance as SimplePeerInstance, SignalData } from 'simple-peer';
import type { CallConfig, CallStats, MediaState } from '@/types/call';

/**
 * Check if getUserMedia is available (with polyfill for older browsers)
 */
function getMediaDevices(): MediaDevices | null {
  // Modern browsers
  if (navigator.mediaDevices) {
    return navigator.mediaDevices;
  }

  // Polyfill for older browsers (iOS Safari < 11)
  interface LegacyNavigator extends Navigator {
    getUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    webkitGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
    mozGetUserMedia?: (
      constraints: MediaStreamConstraints,
      successCallback: (stream: MediaStream) => void,
      errorCallback: (error: Error) => void
    ) => void;
  }

  const legacyNavigator = navigator as LegacyNavigator;
  const getUserMedia = 
    legacyNavigator.getUserMedia ||
    legacyNavigator.webkitGetUserMedia ||
    legacyNavigator.mozGetUserMedia;

  if (getUserMedia) {
    // Wrap old getUserMedia in a Promise-based interface
    return {
      getUserMedia: (constraints: MediaStreamConstraints) => {
        return new Promise<MediaStream>((resolve, reject) => {
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      },
    } as MediaDevices;
  }

  return null;
}

export class WebRTCManager {
  private peer: SimplePeerInstance | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private config: CallConfig;
  private statsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: CallConfig) {
    this.config = config;
  }

  /**
   * Initialize local media (audio/video)
   */
  async initializeLocalMedia(
    constraints: MediaStreamConstraints = { audio: true, video: true }
  ): Promise<MediaStream> {
    try {
      // Check if running in secure context (HTTPS or localhost)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error(
          'getUserMedia requires HTTPS. Please access this app via HTTPS or localhost.'
        );
      }

      const mediaDevices = getMediaDevices();
      
      if (!mediaDevices) {
        throw new Error(
          'getUserMedia is not supported in this browser. Please use a modern browser (Chrome, Safari 11+, Firefox).'
        );
      }

      this.localStream = await mediaDevices.getUserMedia(constraints);
      
      console.log('Local media initialized:', {
        audio: this.localStream.getAudioTracks().length > 0,
        video: this.localStream.getVideoTracks().length > 0,
      });
      
      return this.localStream;
    } catch (error) {
      console.error('Failed to initialize local media:', error);
      
      // Provide more helpful error messages
      if ((error as Error).name === 'NotAllowedError') {
        throw new Error('Permission denied. Please allow camera/microphone access.');
      } else if ((error as Error).name === 'NotFoundError') {
        throw new Error('No camera/microphone found. Please connect a device.');
      } else if ((error as Error).name === 'NotReadableError') {
        throw new Error('Camera/microphone is already in use by another application.');
      } else {
        throw new Error(`Failed to access media devices: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Create a WebRTC peer connection
   */
  createPeer(
    isInitiator: boolean,
    onSignal: (signalData: SignalData) => void,
    onStream: (stream: MediaStream) => void,
    onConnect: () => void,
    onClose: () => void,
    onError: (error: Error) => void
  ): SimplePeerInstance {
    if (this.peer) {
      console.warn('Peer already exists, destroying old peer');
      this.peer.destroy();
    }

    try {
      this.peer = new SimplePeer({
        initiator: isInitiator,
        stream: this.localStream || undefined,
        trickle: true,
        config: {
          iceServers: this.config.iceServers,
        },
      });

      // Handle signaling data (to be sent via Nostr)
      this.peer.on('signal', (data: SignalData) => {
        console.log('WebRTC signal generated:', data.type);
        onSignal(data);
      });

      // Handle incoming remote stream
      this.peer.on('stream', (stream: MediaStream) => {
        console.log('Remote stream received');
        this.remoteStream = stream;
        onStream(stream);
      });

      // Handle connection established
      this.peer.on('connect', () => {
        console.log('Peer connection established');
        onConnect();
      });

      // Handle connection closed
      this.peer.on('close', () => {
        console.log('Peer connection closed');
        this.cleanup();
        onClose();
      });

      // Handle errors
      this.peer.on('error', (err: Error) => {
        console.error('Peer connection error:', err);
        onError(err);
      });

      console.log(`Peer created (initiator: ${isInitiator})`);
      return this.peer;
    } catch (error) {
      console.error('Failed to create peer:', error);
      throw error;
    }
  }

  /**
   * Process incoming signaling data from remote peer
   */
  signal(signalData: SignalData): void {
    if (!this.peer) {
      throw new Error('Peer not initialized');
    }

    try {
      this.peer.signal(signalData);
      console.log('Signaling data processed:', signalData.type);
    } catch (error) {
      console.error('Failed to process signal:', error);
      throw error;
    }
  }

  /**
   * Toggle audio mute state
   */
  toggleAudio(enabled: boolean): void {
    if (!this.localStream) {
      console.warn('No local stream available');
      return;
    }

    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });

    console.log(`Audio ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Toggle video state
   */
  toggleVideo(enabled: boolean): void {
    if (!this.localStream) {
      console.warn('No local stream available');
      return;
    }

    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });

    console.log(`Video ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current media state
   */
  getMediaState(): MediaState {
    const audioTracks = this.localStream?.getAudioTracks() || [];
    const videoTracks = this.localStream?.getVideoTracks() || [];

    return {
      audioEnabled: audioTracks.some((track) => track.enabled),
      videoEnabled: videoTracks.some((track) => track.enabled),
      isScreenSharing: false, // TODO: Implement screen sharing
    };
  }

  /**
   * Start screen sharing (replace video track)
   */
  async startScreenShare(): Promise<void> {
    if (!this.peer) {
      throw new Error('Peer not initialized');
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const screenTrack = screenStream.getVideoTracks()[0];

      if (!screenTrack) {
        throw new Error('No screen track available');
      }

      // Replace video track
      const pc = (this.peer as unknown as { _pc: RTCPeerConnection })._pc;
      const sender = pc?.getSenders().find((s) => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      // Handle screen share stop
      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      console.log('Screen sharing started');
    } catch (error) {
      console.error('Failed to start screen sharing:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing (restore camera)
   */
  async stopScreenShare(): Promise<void> {
    if (!this.peer || !this.localStream) {
      return;
    }

    try {
      const videoTrack = this.localStream.getVideoTracks()[0];

      if (!videoTrack) {
        console.warn('No video track to restore');
        return;
      }

      // Replace back to camera track
      const pc = (this.peer as unknown as { _pc: RTCPeerConnection })._pc;
      const sender = pc?.getSenders().find((s) => s.track?.kind === 'video');

      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      console.log('Screen sharing stopped');
    } catch (error) {
      console.error('Failed to stop screen sharing:', error);
      throw error;
    }
  }

  /**
   * Get connection statistics
   */
  async getStats(): Promise<CallStats | null> {
    if (!this.peer) {
      return null;
    }

    try {
      const pc = (this.peer as unknown as { _pc: RTCPeerConnection })._pc;
      if (!pc) {
        return null;
      }

      const stats = await pc.getStats();
      
      let bytesSent = 0;
      let bytesReceived = 0;
      let packetsLost = 0;
      let jitter = 0;
      let roundTripTime: number | undefined;

      stats.forEach((report) => {
        if (report.type === 'outbound-rtp') {
          bytesSent += report.bytesSent || 0;
        } else if (report.type === 'inbound-rtp') {
          bytesReceived += report.bytesReceived || 0;
          packetsLost += report.packetsLost || 0;
          jitter += report.jitter || 0;
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          roundTripTime = report.currentRoundTripTime;
        }
      });

      return {
        duration: 0, // Will be calculated by call manager
        bytesSent,
        bytesReceived,
        packetsLost,
        jitter,
        roundTripTime,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Start monitoring connection statistics
   */
  startStatsMonitoring(onStats: (stats: CallStats) => void, interval = 2000): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }

    this.statsInterval = setInterval(async () => {
      const stats = await this.getStats();
      if (stats) {
        onStats(stats);
      }
    }, interval);

    console.log('Stats monitoring started');
  }

  /**
   * Stop monitoring statistics
   */
  stopStatsMonitoring(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
      console.log('Stats monitoring stopped');
    }
  }

  /**
   * Clean up all resources
   */
  cleanup(): void {
    console.log('Cleaning up WebRTC resources');

    // Stop stats monitoring
    this.stopStatsMonitoring();

    // Stop all local media tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.localStream = null;
    }

    // Stop all remote media tracks
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        track.stop();
      });
      this.remoteStream = null;
    }

    // Destroy peer connection
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    console.log('WebRTC cleanup complete');
  }

  /**
   * Get local stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get remote stream
   */
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Check if peer is connected
   */
  isConnected(): boolean {
    return this.peer?.connected || false;
  }
}
