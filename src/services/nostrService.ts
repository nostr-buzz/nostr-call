/**
 * Nostr Service for WebRTC Signaling
 * Handles encrypted DM communication for call signaling using kind 1004
 * Kind 1004: Private, encrypted messages for real-time communication
 */

import { nip19 } from 'nostr-tools';
import type { NPool, NostrEvent, NostrFilter } from '@nostrify/nostrify';
import type { NUser } from '@nostrify/react/login';
import type { SignalingMessage } from '@/types/call';

// Enhanced logging
const logDebug = (category: string, message: string, data?: unknown) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [Nostr/${category}] ${message}`, data || '');
};

/**
 * Convert npub to hex pubkey if needed
 */
function ensureHexPubkey(pubkey: string): string {
  if (pubkey.startsWith('npub1')) {
    const decoded = nip19.decode(pubkey);
    if (decoded.type === 'npub') {
      return decoded.data;
    }
  }
  return pubkey;
}

export class NostrService {
  private pool: NPool;
  private user: NUser;
  private subscriptions: Map<string, () => void> = new Map();

  constructor(pool: NPool, user: NUser) {
    this.pool = pool;
    this.user = user;
  }

  /**
   * Send encrypted signaling message via Nostr kind 1004
   * Kind 1004 is used for private, encrypted real-time messages
   */
  async sendSignalingMessage(
    recipientPubkey: string,
    message: SignalingMessage
  ): Promise<void> {
    try {
      // Ensure pubkey is in hex format (not npub)
      const hexPubkey = ensureHexPubkey(recipientPubkey);
      
      const messageJson = JSON.stringify(message);
      
      // Use NIP-44 encryption (required for kind 1004)
      if (!this.user.signer.nip44) {
        throw new Error('NIP-44 encryption not available. Please upgrade your signer.');
      }

      const encryptedContent = await this.user.signer.nip44.encrypt(
        hexPubkey,
        messageJson
      );

      // Create encrypted call signaling event (kind 1004)
      const callEvent = {
        kind: 1004,
        content: encryptedContent,
        tags: [
          ['p', hexPubkey],
          ['call-type', message.type], // For filtering
        ],
        created_at: Math.floor(Date.now() / 1000),
      };

      // Sign and publish
      logDebug('SendMessage', `Signing ${message.type} event`, {
        kind: 1004,
        recipientPubkey: hexPubkey.slice(0, 8) + '...',
        messageType: message.type,
      });
      const signedEvent = await this.user.signer.signEvent(callEvent);
      
      logDebug('SendMessage', `Publishing ${message.type} to relays`);
      await this.pool.event(signedEvent, { signal: AbortSignal.timeout(5000) });
      
      logDebug('SendMessage', `✓ ${message.type} sent successfully`, {
        recipientPubkey: hexPubkey.slice(0, 8) + '...',
        callId: message.callId,
      });
    } catch (error) {
      console.error('Failed to send signaling message:', error);
      throw new Error(`Failed to send signaling message: ${error}`);
    }
  }

  /**
   * Subscribe to incoming signaling messages from a specific pubkey (kind 1004)
   */
  async subscribeToSignaling(
    remotePubkey: string,
    onMessage: (message: SignalingMessage) => void
  ): Promise<() => void> {
    // Ensure pubkey is in hex format
    const hexPubkey = ensureHexPubkey(remotePubkey);
    const subscriptionId = `signaling-${hexPubkey}`;

    // Unsubscribe if already subscribed
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.get(subscriptionId)?.();
    }

    const myPubkey = this.user.pubkey;

    // Filter for kind 1004 messages from the remote peer to us
    const filters: NostrFilter[] = [
      {
        kinds: [1004], // Call signaling events
        authors: [hexPubkey],
        '#p': [myPubkey],
        since: Math.floor(Date.now() / 1000) - 300, // Last 5 minutes
      },
    ];

    logDebug('Subscribe', `Subscribing to kind 1004 from remote peer`, {
      remotePubkey: hexPubkey.slice(0, 8) + '...',
      myPubkey: myPubkey.slice(0, 8) + '...',
    });

    // Use AbortController for cleanup
    const abortController = new AbortController();
    
    // Subscribe to events using req
    (async () => {
      try {
        logDebug('Subscribe', '✓ Subscription active, listening for messages');
        for await (const msg of this.pool.req(filters, { signal: abortController.signal })) {
          if (msg[0] === 'EVENT') {
            const event = msg[2] as NostrEvent;
            logDebug('ReceiveEvent', 'Received kind 1004 event', {
              eventId: event.id.slice(0, 8) + '...',
              author: event.pubkey.slice(0, 8) + '...',
            });
            
            try {
              // Decrypt the message using NIP-44
              if (!this.user.signer.nip44) {
                console.warn('NIP-44 decryption not available');
                continue;
              }

              logDebug('Decrypt', 'Decrypting message content');
              const decryptedContent = await this.user.signer.nip44.decrypt(
                event.pubkey,
                event.content
              );

              // Parse the signaling message
              const message: SignalingMessage = JSON.parse(decryptedContent);
              logDebug('Decrypt', `✓ Decrypted ${message.type} message`, {
                callId: message.callId,
                messageType: message.type,
              });

              // Validate message structure
              if (!message.type || !message.callId) {
                logDebug('Validate', 'Invalid signaling message (missing type or callId)', message);
                continue;
              }

              logDebug('ProcessMessage', `✓ Processing ${message.type}`, {
                callId: message.callId,
                from: event.pubkey.slice(0, 8) + '...',
              });
              onMessage(message);
            } catch (error) {
              console.error('Failed to decrypt/parse signaling message:', error);
            }
          }
        }
      } catch (error) {
        // Ignore abort errors
        if ((error as Error).name !== 'AbortError') {
          console.error('Subscription error:', error);
        }
      }
    })();

    // Store unsubscribe function
    const unsubscribe = () => {
      abortController.abort();
      this.subscriptions.delete(subscriptionId);
      console.log(`Unsubscribed from signaling with ${hexPubkey.slice(0, 8)}...`);
    };

    this.subscriptions.set(subscriptionId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Subscribe to all incoming call offers (kind 1004)
   * This monitors for incoming calls and shows popup immediately
   */
  async subscribeToIncomingCalls(
    onCallOffer: (offer: SignalingMessage, senderPubkey: string) => void
  ): Promise<() => void> {
    const subscriptionId = 'incoming-calls';

    // Unsubscribe if already subscribed
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.get(subscriptionId)?.();
    }

    const myPubkey = this.user.pubkey;

    // Filter for kind 1004 messages to us
    const filters: NostrFilter[] = [
      {
        kinds: [1004], // Call signaling events
        '#p': [myPubkey],
        since: Math.floor(Date.now() / 1000) - 60, // Last minute
      },
    ];

    console.log('🎧 Listening for incoming calls (kind 1004)...');

    // Use AbortController for cleanup
    const abortController = new AbortController();
    
    // Subscribe to events using req
    (async () => {
      try {
        for await (const msg of this.pool.req(filters, { signal: abortController.signal })) {
          if (msg[0] === 'EVENT') {
            const event = msg[2] as NostrEvent;
            
            try {
              // Decrypt the message using NIP-44
              if (!this.user.signer.nip44) {
                console.debug('NIP-44 decryption not available');
                continue;
              }

              const decryptedContent = await this.user.signer.nip44.decrypt(
                event.pubkey,
                event.content
              );

              // Parse the signaling message
              const message: SignalingMessage = JSON.parse(decryptedContent);

              // Only handle call-offer messages
              if (message.type === 'call-offer') {
                console.log(`📞 Incoming call from ${event.pubkey.slice(0, 8)}...`);
                // Show popup immediately
                onCallOffer(message, event.pubkey);
              }
            } catch (error) {
              // Silently ignore decryption errors (could be non-call messages)
              console.debug('Failed to decrypt message:', error);
            }
          }
        }
      } catch (error) {
        // Ignore abort errors
        if ((error as Error).name !== 'AbortError') {
          console.error('Incoming calls subscription error:', error);
        }
      }
    })();

    // Store unsubscribe function
    const unsubscribe = () => {
      abortController.abort();
      this.subscriptions.delete(subscriptionId);
      console.log('Unsubscribed from incoming calls');
    };

    this.subscriptions.set(subscriptionId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Clean up all subscriptions
   */
  cleanup(): void {
    this.subscriptions.forEach((unsubscribe) => unsubscribe());
    this.subscriptions.clear();
  }

  /**
   * Get user's public key
   */
  get pubkey(): string {
    return this.user.pubkey;
  }
}
