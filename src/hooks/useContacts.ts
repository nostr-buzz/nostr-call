/**
 * Contacts Hook
 * Manages contacts list with localStorage persistence
 */

import { useLocalStorage } from './useLocalStorage';

export interface Contact {
  id: string;
  pubkey: string;
  name?: string;
  addedAt: number;
}

export function useContacts() {
  const [contacts, setContacts] = useLocalStorage<Contact[]>('nostr-contacts', []);

  const addContact = (pubkey: string, name?: string) => {
    const newContact: Contact = {
      id: `${Date.now()}-${Math.random()}`,
      pubkey,
      name,
      addedAt: Date.now(),
    };
    setContacts(prev => [newContact, ...prev]);
  };

  const removeContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const updateContact = (id: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  return {
    contacts,
    addContact,
    removeContact,
    updateContact,
  };
}
