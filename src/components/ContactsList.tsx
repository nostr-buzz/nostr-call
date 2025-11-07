/**
 * Contacts List Component
 * Displays contacts with search and ability to add/remove
 */

import { Phone, Video, Trash2, UserPlus, Search, AlertCircle } from 'lucide-react';
import { useContacts, type Contact } from '@/hooks/useContacts';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { genUserName } from '@/lib/genUserName';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { validateAndConvertPubkey, isSelfCall } from '@/utils/contactUtils';

interface ContactsListProps {
  onCall?: (pubkey: string, type: 'audio' | 'video') => void;
}

function ContactItem({ contact, onCall, onRemove, currentUserPubkey }: { 
  contact: Contact; 
  onCall: (type: 'audio' | 'video') => void;
  onRemove: () => void;
  currentUserPubkey?: string;
}) {
  const author = useAuthor(contact.pubkey);
  const metadata = author.data?.metadata;
  const displayName = contact.name || metadata?.name || genUserName(contact.pubkey);
  const avatar = metadata?.picture;
  const isCurrentUser = currentUserPubkey ? isSelfCall(contact.pubkey, currentUserPubkey) : false;

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
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono">
          {contact.pubkey.slice(0, 16)}...
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCall('audio')}
          disabled={isCurrentUser}
          className="h-9 w-9 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 disabled:opacity-30 disabled:cursor-not-allowed"
          title={isCurrentUser ? "You cannot call yourself" : "Audio call"}
        >
          <Phone className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onCall('video')}
          disabled={isCurrentUser}
          className="h-9 w-9 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"
          title={isCurrentUser ? "You cannot call yourself" : "Video call"}
        >
          <Video className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove contact"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ContactsList({ onCall }: ContactsListProps) {
  const { contacts, addContact, removeContact } = useContacts();
  const { user } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [newPubkey, setNewPubkey] = useState('');
  const [newName, setNewName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  const filteredContacts = contacts.filter(contact => {
    const displayName = contact.name || genUserName(contact.pubkey);
    return (
      displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.pubkey.includes(searchQuery)
    );
  });

  const handleAddContact = () => {
    setValidationError('');
    
    const validation = validateAndConvertPubkey(newPubkey);
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid public key');
      return;
    }

    // Check if trying to add self
    if (user && isSelfCall(validation.pubkey!, user.pubkey)) {
      setValidationError('You cannot add yourself to contacts');
      return;
    }

    // Check if contact already exists
    const existingContact = contacts.find(c => c.pubkey.toLowerCase() === validation.pubkey!.toLowerCase());
    if (existingContact) {
      setValidationError('This contact already exists');
      return;
    }

    // Add the contact with the validated hex pubkey
    addContact(validation.pubkey!, newName || undefined);
    setNewPubkey('');
    setNewName('');
    setValidationError('');
    setDialogOpen(false);
  };

  const handleCall = (pubkey: string, type: 'audio' | 'video') => {
    // Prevent self-calling
    if (user && isSelfCall(pubkey, user.pubkey)) {
      alert('You cannot call yourself');
      return;
    }

    if (onCall) {
      onCall(pubkey, type);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search & Add */}
      <div className="p-4 space-y-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <UserPlus className="h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
              
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pubkey (npub or hex)
                </label>
                <Input
                  type="text"
                  placeholder="npub1... or hex pubkey"
                  value={newPubkey}
                  onChange={(e) => {
                    setNewPubkey(e.target.value);
                    if (validationError) setValidationError('');
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supports both npub1... and hex format
                </p>
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
                className="w-full"
                disabled={!newPubkey.trim()}
              >
                Add Contact
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UserPlus className="h-16 w-16 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </p>
            <p className="text-xs mt-1">
              {!searchQuery && 'Add contacts to start calling'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredContacts.map((contact) => (
              <ContactItem
                key={contact.id}
                contact={contact}
                onCall={(type) => handleCall(contact.pubkey, type)}
                onRemove={() => removeContact(contact.id)}
                currentUserPubkey={user?.pubkey}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
