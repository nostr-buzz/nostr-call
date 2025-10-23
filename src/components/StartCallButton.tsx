/**
 * StartCallButton Component
 * Example component for initiating calls
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function StartCallButton() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [pubkey, setPubkey] = useState('');
  const [callType, setCallType] = useState<'audio' | 'video'>('video');

  const handleStartCall = () => {
    if (!pubkey.trim()) {
      return;
    }

    // Navigate to call screen with pubkey and type
    navigate(`/call?pubkey=${encodeURIComponent(pubkey.trim())}&type=${callType}`);
    setOpen(false);
    setPubkey('');
  };

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <Video className="h-5 w-5" />
          Start Call
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a Call</DialogTitle>
          <DialogDescription>
            Enter the public key (npub or hex) of the person you want to call.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="pubkey">Public Key</Label>
            <Input
              id="pubkey"
              placeholder="npub1... or hex pubkey"
              value={pubkey}
              onChange={(e) => setPubkey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleStartCall();
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Call Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={callType === 'audio' ? 'default' : 'outline'}
                onClick={() => setCallType('audio')}
                className="flex-1"
              >
                <Phone className="mr-2 h-4 w-4" />
                Audio
              </Button>
              <Button
                type="button"
                variant={callType === 'video' ? 'default' : 'outline'}
                onClick={() => setCallType('video')}
                className="flex-1"
              >
                <Video className="mr-2 h-4 w-4" />
                Video
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleStartCall} disabled={!pubkey.trim()}>
            Start Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
