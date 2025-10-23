import { useSeoMeta } from '@unhead/react';
import { LoginArea } from '@/components/auth/LoginArea';
import { CallHistory } from '@/components/CallHistory';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginActions } from '@/hooks/useLoginActions';
import { useContacts } from '@/hooks/useContacts';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { Phone, Video, User, LogOut, Settings, Search, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { useCall } from '@/hooks/useCall';

const Index = () => {
  const { user } = useCurrentUser();
  const { logout } = useLoginActions();
  const { startCall } = useCall();
  const { contacts, addContact, removeContact } = useContacts();
  const [activeTab, setActiveTab] = useState<'contacts' | 'history' | 'settings'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPubkey, setNewPubkey] = useState('');
  const [newName, setNewName] = useState('');

  useSeoMeta({
    title: 'Nostr Call - Decentralized Voice & Video Calling',
    description: 'Make secure, encrypted voice and video calls over Nostr with WebRTC.',
  });

  const handleAddContact = () => {
    if (newPubkey.trim()) {
      addContact(newPubkey.trim(), newName.trim() || undefined);
      setNewPubkey('');
      setNewName('');
      setShowAddDialog(false);
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const query = searchQuery.toLowerCase();
    return (
      contact.pubkey.toLowerCase().includes(query) ||
      contact.name?.toLowerCase().includes(query)
    );
  });

  function ContactItem({ pubkey, name, onCall, onRemove }: {
    pubkey: string;
    name?: string;
    onCall: (type: 'audio' | 'video') => void;
    onRemove: () => void;
  }) {
    const author = useAuthor(pubkey);
    const metadata = author.data?.metadata;
    const displayName = name || metadata?.name || genUserName(pubkey);
    const avatar = metadata?.picture;

    return (
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatar} alt={displayName} />
          <AvatarFallback className="text-sm font-semibold">
            {displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{displayName}</div>
          <div className="text-xs text-gray-500 truncate font-mono">
            {pubkey.slice(0, 16)}...
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onCall('video')}
            className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors flex items-center justify-center active:scale-95"
            aria-label="Video call"
          >
            <Video className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={() => onCall('audio')}
            className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 transition-colors flex items-center justify-center active:scale-95"
            aria-label="Audio call"
          >
            <Phone className="h-5 w-5 text-white" />
          </button>
          <button
            onClick={onRemove}
            className="h-10 w-10 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100"
            aria-label="Remove contact"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
    );
  }

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
          {activeTab === 'contacts' && (
            <div className="h-full flex flex-col">
              {/* Search Bar */}
              <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search contacts"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Contacts List */}
              <div className="flex-1 overflow-y-auto">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <User className="h-16 w-16 mx-auto mb-3 opacity-30" />
                    <p className="text-sm mb-4">
                      {searchQuery ? 'No contacts found' : 'No contacts yet'}
                    </p>
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Add Contact
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Contact</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Public Key (npub or hex)
                            </label>
                            <Input
                              type="text"
                              placeholder="npub1... or hex pubkey"
                              value={newPubkey}
                              onChange={(e) => setNewPubkey(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-2 block">
                              Name (optional)
                            </label>
                            <Input
                              type="text"
                              placeholder="Contact name"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                            />
                          </div>
                          <Button
                            onClick={handleAddContact}
                            disabled={!newPubkey.trim()}
                            className="w-full"
                          >
                            Add Contact
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredContacts.map((contact) => (
                      <ContactItem
                        key={contact.id}
                        pubkey={contact.pubkey}
                        name={contact.name}
                        onCall={(type) => startCall(contact.pubkey, type)}
                        onRemove={() => removeContact(contact.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Add Contact FAB */}
              {filteredContacts.length > 0 && (
                <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                  <DialogTrigger asChild>
                    <button
                      className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg flex items-center justify-center active:scale-95 transition-transform"
                      aria-label="Add contact"
                    >
                      <Plus className="h-6 w-6 text-white" />
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Contact</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Public Key (npub or hex)
                        </label>
                        <Input
                          type="text"
                          placeholder="npub1... or hex pubkey"
                          value={newPubkey}
                          onChange={(e) => setNewPubkey(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Name (optional)
                        </label>
                        <Input
                          type="text"
                          placeholder="Contact name"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleAddContact}
                        disabled={!newPubkey.trim()}
                        className="w-full"
                      >
                        Add Contact
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
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
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 grid grid-cols-3 safe-area-bottom">
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
