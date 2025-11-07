/**
 * Contact Validation and Conversion Utilities
 */

import { nip19 } from 'nostr-tools';

export interface ContactValidationResult {
  isValid: boolean;
  pubkey?: string;
  error?: string;
}

/**
 * Validates and converts npub/hex pubkey to hex format
 */
export function validateAndConvertPubkey(input: string): ContactValidationResult {
  if (!input || input.trim().length === 0) {
    return { isValid: false, error: 'Public key is required' };
  }

  const trimmedInput = input.trim();

  try {
    // Check if it's an npub
    if (trimmedInput.startsWith('npub1')) {
      const decoded = nip19.decode(trimmedInput);
      if (decoded.type === 'npub') {
        return { isValid: true, pubkey: decoded.data };
      } else {
        return { isValid: false, error: 'Invalid npub format' };
      }
    }
    
    // Check if it's a hex pubkey (64 characters)
    if (trimmedInput.match(/^[0-9a-fA-F]{64}$/)) {
      return { isValid: true, pubkey: trimmedInput.toLowerCase() };
    }

    // Invalid format
    return { 
      isValid: false, 
      error: 'Please enter a valid npub (npub1...) or hex public key (64 characters)' 
    };
  } catch (error) {
    return { 
      isValid: false, 
      error: 'Invalid public key format' 
    };
  }
}

/**
 * Checks if a pubkey belongs to the current user
 */
export function isSelfCall(targetPubkey: string, currentUserPubkey?: string): boolean {
  if (!currentUserPubkey) return false;
  return targetPubkey.toLowerCase() === currentUserPubkey.toLowerCase();
}

/**
 * Formats pubkey for display (shows npub format)
 */
export function formatPubkeyForDisplay(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey);
  } catch {
    return pubkey;
  }
}

/**
 * Formats pubkey for short display (first 8 chars of npub)
 */
export function formatPubkeyShort(pubkey: string): string {
  try {
    const npub = nip19.npubEncode(pubkey);
    return npub.slice(0, 12) + '...';
  } catch {
    return pubkey.slice(0, 8) + '...';
  }
}