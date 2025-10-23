import { useSeoMeta } from '@unhead/react';
import { LoginArea } from '@/components/auth/LoginArea';
import { CallHistory } from '@/components/CallHistory';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginActions } from '@/hooks/useLoginActions';
import { Phone, Video, User, LogOut, Settings, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useCall } from '@/hooks/useCall';

const Index = () => {
  const { user } = useCurrentUser();
  const { logout } = useLoginActions();
  const { callPeer } = useCall();
  const [activeTab, setActiveTab] = useState<'keypad' | 'contacts' | 'history' | 'settings'>('keypad');
  const [phoneNumber, setPhoneNumber] = useState('');

  useSeoMeta({
    title: 'Nostr Call - Decentralized Voice & Video Calling',
    description: 'Make secure, encrypted voice and video calls over Nostr with WebRTC.',
  });

  const handleKeypadPress = (digit: string) => {
    setPhoneNumber(prev => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber(prev => prev.slice(0, -1));
  };

  const handleAudioCall = () => {
    if (phoneNumber.trim()) {
      callPeer(phoneNumber, 'audio');
    }
  };

  const handleVideoCall = () => {
    if (phoneNumber.trim()) {
      callPeer(phoneNumber, 'video');
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col max-w-md mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Nostr Call</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setActiveTab('settings')}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={logout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'keypad' && (
            <div className="flex flex-col h-full">
              {/* Phone Number Display */}
              <div className="px-6 py-8 text-center bg-white dark:bg-gray-900">
                <Input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="npub or hex pubkey"
                  className="text-center text-2xl font-light border-0 focus-visible:ring-0 bg-transparent"
                />
              </div>

              {/* Keypad */}
              <div className="flex-1 px-6 py-4">
                <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                    <button
                      key={digit}
                      onClick={() => handleKeypadPress(digit)}
                      aria-label={`Digit ${digit}`}
                      className="aspect-square rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center text-2xl font-light text-gray-900 dark:text-white active:scale-95"
                    >
                      {digit}
                    </button>
                  ))}
                </div>

                {/* Call Buttons */}
                <div className="flex items-center justify-center gap-8 mt-8">
                  <button
                    onClick={handleVideoCall}
                    disabled={!phoneNumber.trim()}
                    aria-label="Video call"
                    className="h-16 w-16 rounded-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center active:scale-95"
                  >
                    <Video className="h-7 w-7 text-white" />
                  </button>
                  <button
                    onClick={handleAudioCall}
                    disabled={!phoneNumber.trim()}
                    aria-label="Audio call"
                    className="h-20 w-20 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center active:scale-95 shadow-lg"
                  >
                    <Phone className="h-8 w-8 text-white" />
                  </button>
                  <button
                    onClick={handleBackspace}
                    disabled={!phoneNumber}
                    aria-label="Backspace"
                    className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-white text-2xl font-light active:scale-95"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="p-4">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search contacts"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="text-center py-12 text-gray-500">
                <User className="h-16 w-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No contacts yet</p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-4">
              <CallHistory />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-4 space-y-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold mb-2">Account</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono break-all">
                  {user.pubkey}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                <h3 className="font-semibold mb-2">Security</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ✓ End-to-end encrypted (NIP-44)
                </p>
              </div>
              <Button onClick={logout} variant="destructive" className="w-full">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 grid grid-cols-4 safe-area-bottom">
          <button
            onClick={() => setActiveTab('keypad')}
            className={`flex flex-col items-center py-3 transition-colors ${
              activeTab === 'keypad'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <div className="grid grid-cols-3 gap-0.5 h-5 w-5 mb-1">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-current rounded-full" />
              ))}
            </div>
            <span className="text-xs">Keypad</span>
          </button>
          
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex flex-col items-center py-3 transition-colors ${
              activeTab === 'contacts'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <User className="h-5 w-5 mb-1" />
            <span className="text-xs">Contacts</span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center py-3 transition-colors ${
              activeTab === 'history'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Phone className="h-5 w-5 mb-1" />
            <span className="text-xs">Recent</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center py-3 transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <Settings className="h-5 w-5 mb-1" />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
      <div className="text-center max-w-md w-full">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-6 rounded-full">
              <Phone className="h-16 w-16 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
            Nostr Call
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Secure, decentralized calling
          </p>

          <div className="pt-4">
            <LoginArea />
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-3 text-xs text-gray-600 dark:text-gray-400">
            <div className="text-center">
              <div className="text-2xl mb-1">🔒</div>
              <div>Encrypted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-1">🌐</div>
              <div>Decentralized</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
