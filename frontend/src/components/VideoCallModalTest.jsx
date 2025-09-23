import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const VideoCallModalTest = ({ isOpen, onClose, consultation, patient }) => {
  const [callStatus, setCallStatus] = useState('idle');

  useEffect(() => {
    console.log('TEST MODAL: useEffect triggered - isOpen:', isOpen);
    console.log('TEST MODAL: callStatus:', callStatus);
    
    if (isOpen) {
      console.log('TEST MODAL: Modal opened');
      setCallStatus('connecting');
    }
    
    return () => {
      console.log('TEST MODAL: Cleanup triggered');
    };
  }, [isOpen]);

  const handleTestClick = () => {
    console.log('TEST MODAL: Test button clicked');
    setCallStatus('testing');
  };

  console.log('TEST MODAL: Rendering with isOpen:', isOpen, 'callStatus:', callStatus);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Test Video Call Modal</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <p>Modal Status: {callStatus}</p>
          <p>Is Open: {isOpen ? 'true' : 'false'}</p>
          <Button onClick={handleTestClick}>Test Button</Button>
          <Button onClick={onClose} variant="outline">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModalTest;
