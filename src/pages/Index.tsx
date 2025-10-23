import { useSeoMeta } from '@unhead/react';
import { LoginArea } from '@/components/auth/LoginArea';
import { StartCallButton } from '@/components/StartCallButton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Phone } from 'lucide-react';

const Index = () => {
  const { user } = useCurrentUser();

  useSeoMeta({
    title: 'Nostr Call - Decentralized Voice & Video Calling',
    description: 'Make secure, encrypted voice and video calls over Nostr with WebRTC.',
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="text-center max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-full">
              <Phone className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            Nostr Call
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Decentralized voice and video calling powered by Nostr + WebRTC
          </p>

          <div className="pt-4 space-y-4">
            {user ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connected as <span className="font-mono">{user.pubkey.slice(0, 8)}...{user.pubkey.slice(-8)}</span>
                </p>
                <StartCallButton />
                <p className="text-xs text-gray-500">
                  Enter a public key to start a secure, encrypted call
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  Login with your Nostr identity to start making calls
                </p>
                <LoginArea />
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">
              Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700 dark:text-gray-300">End-to-end encrypted signaling (NIP-44)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Audio & video calls</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Screen sharing support</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500 font-bold">✓</span>
                <span className="text-gray-700 dark:text-gray-300">Decentralized identity (Nostr)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
