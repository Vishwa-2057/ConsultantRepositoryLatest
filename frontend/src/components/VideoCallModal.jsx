import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Monitor, 
  Settings, 
  MessageSquare,
  Users,
  Clock,
  Maximize,
  Minimize,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import io from 'socket.io-client';
import { config } from '@/config/env';

const VideoCallModal = ({ isOpen, onClose, consultation, patient }) => {
  const { toast } = useToast();
  const socketRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const connectionMonitorRef = useRef(null);
  
  // Call state
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended
  const [callDuration, setCallDuration] = useState(0);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good'); // good, fair, poor
  const roomId = 'test-room-123'; // Use same room ID as patient
  
  // Timer for call duration
  useEffect(() => {
    let interval;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Initialize WebRTC when modal opens
  useEffect(() => {
    console.log('VideoCallModal useEffect triggered - isOpen:', isOpen);
    if (isOpen) {
      console.log('Modal opened, initializing call...');
      // Temporarily disable initialization to test if that's causing the issue
      // initializeCall();
      setTimeout(() => {
        console.log('Delayed initialization test');
        initializeCall();
      }, 100);
    } else {
      console.log('Modal closed, ending call...');
      // Only end call if we're not in the initial state
      if (callStatus !== 'connecting') {
        endCall();
      }
    }
    
    return () => {
      console.log('VideoCallModal cleanup triggered');
      // Don't call endCall in cleanup during initial mount
      if (callStatus !== 'connecting') {
        endCall();
      }
    };
  }, [isOpen]);

  const initializeCall = async () => {
    try {
      console.log('🚀 DOCTOR: Initializing video call...');
      setCallStatus('connecting');
      console.log('🚀 DOCTOR: callStatus set to connecting');
      
      // Connect to signaling server
      console.log('🔌 DOCTOR: Connecting to signaling server...');
      // Use HTTPS signaling server when accessed via HTTPS for media permissions
      const signalingUrl = config.SIGNALING_SERVER_URL;
      console.log('🔌 DOCTOR: Signaling server URL:', signalingUrl);
      
      socketRef.current = io(signalingUrl, {
        transports: ['websocket', 'polling'],
        forceNew: true
      });
      
      socketRef.current.on('connect', () => {
        console.log('✅ DOCTOR: Connected to signaling server');
        // Join room as doctor
        console.log(`🏠 DOCTOR: Joining room ${roomId} as doctor`);
        socketRef.current.emit('join-room', roomId, 'doctor');
      });
      
      socketRef.current.on('room-ready', (data) => {
        console.log('🏠 DOCTOR: Room ready:', data);
        if (data.patientPresent) {
          console.log('👤 DOCTOR: Patient already in room, initiating call');
          initiateWebRTCCall();
        }
      });
      
      socketRef.current.on('user-joined', (socketId, userType) => {
        console.log(`👤 DOCTOR: ${userType} joined room`);
        if (userType === 'patient') {
          console.log('🎯 DOCTOR: Patient joined, initiating WebRTC call');
          initiateWebRTCCall();
        }
      });
      
      socketRef.current.on('answer', (answer) => {
        console.log('🔥 DOCTOR: Received answer from patient');
        handleAnswer(answer);
      });
      
      socketRef.current.on('ice-candidate', (candidate) => {
        console.log('🧊 DOCTOR: Received ICE candidate from patient');
        handleIceCandidate(candidate);
      });
      
      socketRef.current.on('call-accepted', () => {
        console.log('📞 DOCTOR: Patient accepted the call');
        setCallStatus('connected');
        toast({
          title: "Call Connected",
          description: `Video call started with ${patient?.fullName || 'Patient'}`,
        });
      });
      
      // Get user media (camera and microphone)
      try {
        console.log('🎥 DOCTOR: Getting user media...');
        localStreamRef.current = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          },
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        console.log('✅ DOCTOR: Got user media successfully');
        
        // Ensure tracks are not muted
        localStreamRef.current.getTracks().forEach(track => {
          track.enabled = true;
          console.log(`DOCTOR: ${track.kind} track enabled:`, track.enabled);
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      } catch (error) {
        console.error('❌ DOCTOR: Error getting user media:', error);
        setCallStatus('error');
        return;
      }
      
    } catch (error) {
      console.error('🚨 DOCTOR: Error initializing call:', error);
      console.error('🚨 DOCTOR: Error stack:', error.stack);
      toast({
        title: "Call Failed",
        description: "Could not access camera or microphone. Please check permissions.",
        variant: "destructive"
      });
      setCallStatus('ended');
      // Don't call onClose() here - let the user manually close
      console.log('🚨 DOCTOR: Call initialization failed, but not closing modal');
    }
  };
  
  // Start connection monitoring
  const startConnectionMonitoring = () => {
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
    }
    
    connectionMonitorRef.current = setInterval(() => {
      if (peerConnectionRef.current) {
        const stats = peerConnectionRef.current.getStats();
        stats.then(reports => {
          let bytesReceived = 0;
          let bytesSent = 0;
          let packetsLost = 0;
          
          reports.forEach(report => {
            if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
              bytesReceived += report.bytesReceived || 0;
              packetsLost += report.packetsLost || 0;
            }
            if (report.type === 'outbound-rtp' && report.mediaType === 'video') {
              bytesSent += report.bytesSent || 0;
            }
          });
          
          // Check connection quality
          if (packetsLost > 50) {
            setConnectionQuality('poor');
            console.warn('Doctor: Poor connection quality detected');
          } else if (packetsLost > 10) {
            setConnectionQuality('fair');
          } else {
            setConnectionQuality('good');
          }
          
          // Check if remote video is still playing
          if (remoteVideoRef.current && remoteVideoRef.current.readyState === 0) {
            console.warn('Doctor: Remote video not ready - potential stream issue');
          }
        });
      }
    }, 5000); // Check every 5 seconds
  };

  const setupPeerConnection = () => {
    // Create peer connection
    peerConnectionRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });
    
    // Monitor connection state
    peerConnectionRef.current.onconnectionstatechange = () => {
      console.log('Doctor peer connection state:', peerConnectionRef.current.connectionState);
      if (peerConnectionRef.current.connectionState === 'connected') {
        setCallStatus('connected');
      } else if (peerConnectionRef.current.connectionState === 'failed') {
        console.error('Doctor peer connection failed - attempting recovery');
        setCallStatus('connecting');
        // Attempt to restart ICE
        peerConnectionRef.current.restartIce();
      } else if (peerConnectionRef.current.connectionState === 'disconnected') {
        console.warn('Doctor peer connection disconnected - monitoring for recovery');
        setCallStatus('connecting');
      }
    };
    
    // Monitor ICE connection state
    peerConnectionRef.current.oniceconnectionstatechange = () => {
      console.log('🔗 DOCTOR: ICE connection state:', peerConnectionRef.current.iceConnectionState);
      console.log('🔗 DOCTOR: Connection state:', peerConnectionRef.current.connectionState);
      
      if (peerConnectionRef.current.iceConnectionState === 'connected' || peerConnectionRef.current.iceConnectionState === 'completed') {
        setCallStatus('connected');
      } else if (peerConnectionRef.current.iceConnectionState === 'disconnected') {
        console.log('🔄 DOCTOR: Connection disconnected, attempting to reconnect...');
        setCallStatus('connecting');
      } else if (peerConnectionRef.current.iceConnectionState === 'failed') {
        console.error('Doctor ICE connection failed - restarting ICE');
        peerConnectionRef.current.restartIce();
      } else if (peerConnectionRef.current.iceConnectionState === 'disconnected') {
        console.warn('Doctor ICE disconnected - waiting for reconnection');
        setTimeout(() => {
          if (peerConnectionRef.current.iceConnectionState === 'disconnected') {
            console.log('Doctor ICE still disconnected after 5s - restarting');
            peerConnectionRef.current.restartIce();
          }
        }, 5000);
      } else if (peerConnectionRef.current.iceConnectionState === 'connected') {
        console.log('Doctor ICE connection restored');
        setCallStatus('connected');
        // Start connection monitoring when connected
        startConnectionMonitoring();
      }
    };
    
    // Monitor ICE gathering state
    peerConnectionRef.current.onicegatheringstatechange = () => {
      console.log('Doctor ICE gathering state:', peerConnectionRef.current.iceGatheringState);
    };
    
    // Monitor signaling state
    peerConnectionRef.current.onsignalingstatechange = () => {
      console.log('Doctor signaling state:', peerConnectionRef.current.signalingState);
    };

    // Handle remote stream
    peerConnectionRef.current.ontrack = (event) => {
      console.log('Doctor received remote track:', event.track);
      console.log('Doctor remote track kind:', event.track.kind);
      console.log('Doctor remote track readyState:', event.track.readyState);
      console.log('Doctor remote track enabled:', event.track.enabled);
      
      const remoteStream = event.streams[0];
      console.log('Doctor remote stream:', remoteStream);
      console.log('Doctor remote stream tracks:', remoteStream.getTracks());
      
      // Monitor track state changes
      event.track.onended = () => {
        console.warn('Doctor remote track ended - stream may have stopped');
        // Attempt to renegotiate
        setTimeout(() => {
          if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'connected') {
            console.log('Doctor attempting to renegotiate after track ended');
            initiateWebRTCCall();
          }
        }, 1000);
      };
      
      event.track.onmute = () => {
        console.warn('Doctor remote track muted');
      };
      
      event.track.onunmute = () => {
        console.log('Doctor remote track unmuted');
      };
      
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        
        // Monitor stream for track changes
        remoteStream.onaddtrack = (e) => {
          console.log('Doctor remote stream added track:', e.track);
        };
        
        remoteStream.onremovetrack = (e) => {
          console.warn('Doctor remote stream removed track:', e.track);
        };
        
        // Add detailed video element event listeners
        remoteVideoRef.current.onloadedmetadata = () => {
          console.log('Doctor remote video metadata loaded');
          console.log('Doctor remote video dimensions:', remoteVideoRef.current.videoWidth, 'x', remoteVideoRef.current.videoHeight);
        };
        
        remoteVideoRef.current.oncanplay = () => {
          console.log('Doctor remote video can play');
        };
        
        remoteVideoRef.current.onplay = () => {
          console.log('Doctor remote video started playing');
        };
        
        remoteVideoRef.current.onpause = () => {
          console.log('Doctor remote video paused');
        };
        
        remoteVideoRef.current.onended = () => {
          console.log('Doctor remote video ended');
        };
        
        remoteVideoRef.current.onerror = (e) => {
          console.error('Doctor remote video error:', e);
        };
        
        remoteVideoRef.current.onstalled = () => {
          console.warn('Doctor remote video stalled');
        };
        
        remoteVideoRef.current.onsuspend = () => {
          console.warn('Doctor remote video suspended');
        };
        
        // Attempt to play the video
        remoteVideoRef.current.play().then(() => {
          console.log('Doctor remote video play() succeeded');
        }).catch(error => {
          console.error('Doctor remote video play() failed:', error);
        });
      }
    };
    
    // Handle ICE candidates
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        console.log('🧊 DOCTOR: Sending ICE candidate to patient:', {
          type: event.candidate.type,
          protocol: event.candidate.protocol,
          address: event.candidate.address,
          port: event.candidate.port,
          priority: event.candidate.priority,
          foundation: event.candidate.foundation
        });
        socketRef.current.emit('ice-candidate', roomId, event.candidate);
      } else if (!event.candidate) {
        console.log('🧊 DOCTOR: ICE candidate gathering completed');
      }
    };
    
    // Add local stream to peer connection
    if (localStreamRef.current) {
      // Check if tracks are already added to avoid duplicates
      const senders = peerConnectionRef.current.getSenders();
      const hasVideoTrack = senders.some(sender => sender.track && sender.track.kind === 'video');
      const hasAudioTrack = senders.some(sender => sender.track && sender.track.kind === 'audio');
      
      localStreamRef.current.getTracks().forEach(track => {
        const isVideo = track.kind === 'video';
        const isAudio = track.kind === 'audio';
        
        if ((isVideo && !hasVideoTrack) || (isAudio && !hasAudioTrack)) {
          console.log(`Doctor adding local ${track.kind} track to peer connection`);
          console.log(`Doctor track details:`, {
            kind: track.kind,
            enabled: track.enabled,
            readyState: track.readyState,
            id: track.id
          });
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        } else {
          console.log(`Doctor ${track.kind} track already added, skipping`);
        }
      });
      
      // Log all senders after adding tracks
      const allSenders = peerConnectionRef.current.getSenders();
      console.log('Doctor all senders after adding tracks:', allSenders.map(s => ({
        kind: s.track?.kind,
        enabled: s.track?.enabled,
        hasTrack: !!s.track
      })));
    }
  };

  const initiateWebRTCCall = async () => {
    try {
      // Setup peer connection first
      setupPeerConnection();
      
      // Create offer
      console.log('Doctor creating offer...');
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      console.log('Doctor created offer successfully, sending to patient');
      
      // Log current tracks being sent
      const senders = peerConnectionRef.current.getSenders();
      console.log('Doctor current senders:', senders.map(s => ({
        kind: s.track?.kind,
        enabled: s.track?.enabled,
        readyState: s.track?.readyState,
        hasTrack: !!s.track
      })));
      
      // Log local stream details
      if (localStreamRef.current) {
        console.log('Doctor local stream tracks:', localStreamRef.current.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState
        })));
      }
      
      // Send offer to patient
      socketRef.current.emit('offer', roomId, offer);
      console.log('Offer sent to patient via signaling server');
      
      // Initiate call notification to patient
      socketRef.current.emit('initiate-call', {
        roomId,
        patientId: patient?.id,
        doctorName: 'Dr. Smith' // Replace with actual doctor name
      });
      
    } catch (error) {
      console.error('Error initiating WebRTC call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to establish connection with patient.",
        variant: "destructive"
      });
    }
  };
  
  const handleAnswer = async (answer) => {
    try {
      console.log('Doctor received answer from patient');
      console.log('Doctor peer connection signaling state:', peerConnectionRef.current.signalingState);
      
      // Check if we're in the correct state to set remote description
      if (peerConnectionRef.current.signalingState === 'have-local-offer') {
        console.log('Doctor setting remote description (patient answer)');
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('Doctor set remote description successfully - connection should be established');
      } else {
        console.warn('Doctor cannot set remote description - wrong signaling state:', peerConnectionRef.current.signalingState);
        console.log('Expected state: have-local-offer, Current state:', peerConnectionRef.current.signalingState);
        
        // If we're in stable state, the connection might already be established
        if (peerConnectionRef.current.signalingState === 'stable') {
          console.log('Doctor peer connection already in stable state - connection may already be established');
        }
      }
    } catch (error) {
      console.error('Doctor error handling answer:', error);
      console.log('Doctor signaling state during error:', peerConnectionRef.current.signalingState);
    }
  };
  
  const handleIceCandidate = async (candidate) => {
    try {
      console.log('Doctor received ICE candidate from patient:', candidate);
      await peerConnectionRef.current.addIceCandidate(candidate);
      console.log('Doctor added ICE candidate successfully');
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  };

  const endCall = () => {
    console.log('🔴 DOCTOR: endCall() called');
    console.trace('endCall stack trace');
    
    // Clear any monitoring intervals
    if (connectionMonitorRef.current) {
      clearInterval(connectionMonitorRef.current);
      connectionMonitorRef.current = null;
    }
    
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.emit('end-call', roomId);
      socketRef.current.disconnect();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    setCallStatus('ended');
    console.log('🔴 DOCTOR: About to call onClose()');
    onClose();
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        // Replace video track with screen share
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
        
        // Listen for screen share end
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          // Switch back to camera
          if (localStreamRef.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };
      } else {
        // Stop screen sharing and return to camera
        if (localStreamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
      toast({
        title: "Screen Share Failed",
        description: "Could not start screen sharing.",
        variant: "destructive"
      });
    }
  };

  const handleEndCall = () => {
    endCall();
    onClose();
    toast({
      title: "Call Ended",
      description: `Call duration: ${formatDuration(callDuration)}`,
    });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connecting': return 'warning';
      case 'connected': return 'success';
      case 'ended': return 'destructive';
      default: return 'secondary';
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'good': return 'success';
      case 'fair': return 'warning';
      case 'poor': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Video Call with {patient?.fullName || 'Patient'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(callStatus)} className="text-xs">
                  {callStatus === 'connecting' && 'Connecting...'}
                  {callStatus === 'connected' && 'Connected'}
                  {callStatus === 'ended' && 'Call Ended'}
                </Badge>
                {callStatus === 'connected' && (
                  <Badge variant={getQualityColor(connectionQuality)} className="text-xs">
                    {connectionQuality} quality
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {patient?.fullName || 'Patient'} • {consultation?.consultationType || 'Video Consultation'}
              </div>
              {callStatus === 'connected' && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {formatDuration(callDuration)}
                </div>
              )}
            </div>
          </div>

          {/* Video Area */}
          <div className="flex-1 relative bg-gray-900">
            {/* Remote Video (Patient) */}
            <div className="w-full h-full relative">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              
              {/* Placeholder for remote video */}
              {callStatus !== 'connected' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <div className="text-center text-white">
                    <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-12 h-12" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {patient?.fullName || 'Patient'}
                    </h3>
                    <p className="text-gray-300">
                      {callStatus === 'connecting' ? 'Connecting...' : 'Waiting to connect'}
                    </p>
                  </div>
                </div>
              )}

              {/* Local Video (Doctor) - Picture in Picture */}
              <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                    <VideoOff className="w-8 h-8 text-white" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                  You
                </div>
              </div>

              {/* Connection Status Overlay */}
              {callStatus === 'connecting' && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="bg-black bg-opacity-75 text-white px-6 py-4 rounded-lg text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    <p>Connecting to patient...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 bg-background border-t">
            <div className="flex items-center justify-center gap-4">
              {/* Audio Toggle */}
              <Button
                variant={isAudioEnabled ? "outline" : "destructive"}
                size="lg"
                onClick={toggleAudio}
                className="rounded-full w-12 h-12 p-0"
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              {/* Video Toggle */}
              <Button
                variant={isVideoEnabled ? "outline" : "destructive"}
                size="lg"
                onClick={toggleVideo}
                className="rounded-full w-12 h-12 p-0"
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              {/* Screen Share */}
              <Button
                variant={isScreenSharing ? "default" : "outline"}
                size="lg"
                onClick={toggleScreenShare}
                className="rounded-full w-12 h-12 p-0"
              >
                <Monitor className="w-5 h-5" />
              </Button>

              {/* Chat */}
              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-12 h-12 p-0"
              >
                <MessageSquare className="w-5 h-5" />
              </Button>

              {/* Settings */}
              <Button
                variant="outline"
                size="lg"
                className="rounded-full w-12 h-12 p-0"
              >
                <Settings className="w-5 h-5" />
              </Button>

              {/* End Call */}
              <Button
                variant="destructive"
                size="lg"
                onClick={handleEndCall}
                className="rounded-full w-12 h-12 p-0 bg-red-600 hover:bg-red-700"
              >
                <PhoneOff className="w-5 h-5" />
              </Button>
            </div>

            {/* Additional Info */}
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Consultation: {consultation?.consultationType || 'Video Call'}</span>
                {consultation?.duration && (
                  <span>Scheduled: {consultation.duration} min</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>Quality: {connectionQuality}</span>
                <div className={`w-2 h-2 rounded-full ${
                  connectionQuality === 'good' ? 'bg-green-500' : 
                  connectionQuality === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallModal;
