/**
 * Global Incoming Call Handler
 * Monitors for incoming calls (kind 1004) and shows popup
 */

import { useNavigate } from 'react-router-dom';
import { IncomingCallPopup } from '@/components/IncomingCallPopup';
import { useCall } from '@/hooks/useCall';

export function GlobalIncomingCallHandler() {
  const navigate = useNavigate();
  const { incomingCall, answerCall, rejectCall } = useCall();

  const handleAccept = async () => {
    if (!incomingCall) return;

    // Navigate to call screen
    navigate(`/call?pubkey=${incomingCall.remotePubkey}&type=${incomingCall.callType}`);

    // Answer the call
    await answerCall();
  };

  const handleReject = async () => {
    await rejectCall();
  };

  if (!incomingCall) return null;

  return (
    <IncomingCallPopup
      isOpen={!!incomingCall}
      callerPubkey={incomingCall.remotePubkey}
      callType={incomingCall.callType}
      onAccept={handleAccept}
      onReject={handleReject}
    />
  );
}
