'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, MicOff, Camera, CameraOff, Phone, PhoneOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TranscriptMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface InterviewData {
  id: string;
  scheduledAt: string;
  job: {
    title: string;
    description: string;
    recruiter: {
      company: string;
    };
  };
  screenshotInterval: number;
}

export default function VoiceInterviewPage() {
  const params = useParams();
  const router = useRouter();
  const uniqueLink = params.uniqueLink as string;

  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInterviewEnded, setIsInterviewEnded] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const screenshotIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceDetectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const vadRef = useRef<{ctx: AudioContext; analyser: AnalyserNode; source: MediaStreamAudioSourceNode; data: Uint8Array; silenceMs: number; lastVoice: number} | null>(null);
  const [detectorInfo, setDetectorInfo] = useState<string>('');
  const [faceCount, setFaceCount] = useState<number>(0);
  const faceStatus = useMemo<'ok' | 'none' | 'multiple'>(() => {
    if (faceCount === 1) return 'ok';
    if (faceCount === 0) return 'none';
    return 'multiple';
  }, [faceCount]);
  // Eye tracking (FaceMesh)
  const faceMeshModelRef = useRef<any>(null);
  const tfReadyRef = useRef(false);
  const detectorReadyRef = useRef(false);
  const faceMeshRuntimeRef = useRef<'mediapipe' | 'tfjs' | null>(null);
  // TFJS / BlazeFace caching
  const blazeModelRef = useRef<any>(null);
  const tfInitRef = useRef(false);
  const [gazeOff, setGazeOff] = useState(false);
  const offScreenCounterRef = useRef(0);
  const [eyesClosed, setEyesClosed] = useState(false);
  const closedEyesCounterRef = useRef(0);
  const [proctorWarning, setProctorWarning] = useState<string | null>(null);
  const [eyeTrackingAvailable, setEyeTrackingAvailable] = useState(false);
  const [terminatedByFullscreen, setTerminatedByFullscreen] = useState(false);

  // Ensure TFJS backend is initialized once with fallbacks
  const ensureTFReady = useCallback(async () => {
    if (tfInitRef.current) return;
    try {
      const tf = await import('@tensorflow/tfjs-core');
      // Try WebGL first
      try {
        await import('@tensorflow/tfjs-backend-webgl');
        await tf.setBackend('webgl');
      } catch {}
      // If WebGL not active, try WASM
      try {
        if (typeof tf.getBackend === 'function' && tf.getBackend() !== 'webgl') {
          await import('@tensorflow/tfjs-backend-wasm');
          await tf.setBackend('wasm');
        }
      } catch {}
      // Converter utils (no-op for backends)
      await import('@tensorflow/tfjs-converter');
      await tf.ready();
      tfInitRef.current = true;
    } catch (e) {
      console.warn('TF init failed:', e);
    }
  }, []);

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      // Determine protocol based on current page
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      // Use backend host/port, but protocol based on current page
      const url = new URL(backendUrl);
      const wsUrl = `${wsProtocol}://${url.hostname}:${url.port || '4000'}/interview/${uniqueLink}`;
      console.log('Connecting to:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      wsRef.current.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log('Received message:', message.type);

        switch (message.type) {
          case 'interview-ready':
            setInterviewData(message.interview);
            break;

          case 'voice-connected':
            console.log('Voice AI connected');
            break;

          case 'audio-chunk':
            // Play AI audio response
            if (audioRef.current && message.data) {
              try {
                // Convert base64 to blob
                const audioData = Uint8Array.from(atob(message.data), c => c.charCodeAt(0));
                const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                audioRef.current.src = audioUrl;
                audioRef.current.onloadeddata = () => {
                  audioRef.current?.play().catch(console.error);
                };
                
                // Clean up URL after playing
                audioRef.current.onended = () => {
                  URL.revokeObjectURL(audioUrl);
                };
              } catch (error) {
                console.error('Error playing audio:', error);
              }
            }
            break;

          case 'transcript-update':
            setTranscript(prev => [...prev, message.message]);
            break;

          case 'transcription-status':
            // Show temporary feedback to user
            console.log('Transcription status:', message.message);
            // You could add a toast notification here
            break;

          case 'interview-complete':
          case 'interview-completed':
            setIsInterviewEnded(true);
            setIsInterviewActive(false);
            alert('Interview completed! Results have been sent to the recruiter.');
            setTimeout(() => {
              router.push('/candidate/dashboard');
            }, 3000);
            break;

          case 'error':
            setError(message.message);
            break;
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        if (event.code === 1008) {
          setError(event.reason || 'Interview link is invalid or expired');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
      };

    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      setError('Failed to connect to interview');
    }
  }, [uniqueLink, router]);

  // Initialize media devices
  const initializeMedia = async () => {
    try {
      console.log('Requesting media permissions...');
      
      // Start with a simple request to ensure we get permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 960, max: 1280 },
          height: { ideal: 540, max: 720 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });

      console.log('Media permissions granted');
      mediaStreamRef.current = stream;

      // Validate video track and setup video display
      const vTrack = stream.getVideoTracks()[0];
      if (!vTrack) {
        throw new Error('No video track available. Please check your camera permissions or device.');
      }
      if (videoRef.current) {
        // Set critical attributes for autoplay on mobile browsers
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('muted', 'true');
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.srcObject = stream;
        const tryPlay = () => {
          videoRef.current?.play().catch(() => {
            // Will be retried on next event
          });
        };
        videoRef.current.onloadedmetadata = tryPlay;
        videoRef.current.oncanplay = tryPlay;
        // Initial attempt
        tryPlay();
      }

      setIsCameraEnabled(true);
      setIsMicEnabled(true);

      // Create a separate audio-only stream for recording
      const audioOnlyStream = new MediaStream();
      stream.getAudioTracks().forEach(track => {
        audioOnlyStream.addTrack(track);
      });

      // Setup lightweight VAD (silence detection) to auto-stop
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = ctx.createMediaStreamSource(audioOnlyStream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        vadRef.current = { ctx, analyser, source, data, silenceMs: 0, lastVoice: Date.now() };
      } catch {}

  // Setup MediaRecorder with audio-only stream for better compatibility with Whisper
      let mediaRecorder: MediaRecorder;
      
      try {
        // Try audio-only formats for better Whisper compatibility
        const audioFormats = [
          'audio/webm;codecs=opus',
          'audio/webm;codecs=pcm',
          'audio/webm',
          'audio/mp4;codecs=mp4a.40.2',
          'audio/mp4',
          'audio/mpeg',
          ''  // Default
        ];
        
        let selectedFormat = '';
        for (const format of audioFormats) {
          if (format === '' || MediaRecorder.isTypeSupported(format)) {
            selectedFormat = format;
            console.log('Selected audio format:', selectedFormat);
            break;
          }
        }
        
        if (selectedFormat) {
          // Lower bitrate and slice for lower latency
          mediaRecorder = new MediaRecorder(audioOnlyStream, { 
            mimeType: selectedFormat,
            audioBitsPerSecond: 96000
          });
        } else {
          mediaRecorder = new MediaRecorder(audioOnlyStream, {
            audioBitsPerSecond: 96000
          });
        }
        
        console.log('Created audio-only MediaRecorder with format:', selectedFormat || 'default');
      } catch (error) {
        console.error('Failed to create MediaRecorder:', error);
        throw new Error('Your browser does not support audio recording. Please try a different browser.');
      }

      mediaRecorderRef.current = mediaRecorder;

      // Collect chunks and send once per utterance on stop for better transcription quality
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Audio recording error. Please refresh and try again.');
        setIsRecording(false);
      };

      mediaRecorder.onstop = async () => {
        // Clear any buffered chunks; chunks already streamed
        audioChunksRef.current = [];
      };

    } catch (error) {
      console.error('Error accessing media devices:', error);
      
      // Provide specific error messages based on the error type
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setError('Microphone and camera access denied. Please allow permissions and refresh the page.');
        } else if (error.name === 'NotFoundError') {
          setError('No microphone or camera found. Please connect these devices and refresh.');
        } else if (error.name === 'NotSupportedError') {
          setError('Your browser does not support media recording. Please try Chrome or Firefox.');
        } else {
          setError(`Media access error: ${error.message}`);
        }
      } else {
        setError('Please allow camera and microphone access to start the interview');
      }
  }
  };

  // Start recording audio
  const startRecording = () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
        audioChunksRef.current = [];
  // Start recording (no timeslice) and collect chunks until stop
  mediaRecorderRef.current.start();
  // Start VAD loop
  if (vadRef.current) {
    const { analyser, data } = vadRef.current;
    const tick = () => {
      if (!isRecording || !vadRef.current) return;
  (analyser as any).getByteTimeDomainData(data as any);
      // Compute simple RMS
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const now = Date.now();
      if (rms > 0.02) {
        vadRef.current.lastVoice = now;
      }
      // Auto-stop if 1200ms of silence after at least 2.5s of speech window
      if (now - vadRef.current.lastVoice > 1200) {
        stopRecording();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
        setIsRecording(true);
  console.log('Started recording audio (1s slices)');
        
        // Auto-stop after 30 seconds to prevent overly long recordings
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            stopRecording();
            console.log('Auto-stopped recording after 30 seconds');
          }
        }, 30000);
      } else {
        console.warn('MediaRecorder not ready or already recording');
        if (!mediaRecorderRef.current) {
          setError('Audio recording not initialized. Please refresh and try again.');
        }
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start audio recording. Please check your microphone permissions.');
      setIsRecording(false);
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('Stopped recording audio');
      // Reset VAD trackers
      if (vadRef.current) {
        vadRef.current.lastVoice = Date.now();
      }
      // After stop, combine chunks and send a single blob
      setTimeout(() => {
        if (audioChunksRef.current.length > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const blob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
          audioChunksRef.current = [];
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            wsRef.current?.send(JSON.stringify({ type: 'audio-data', audioData: base64, mimeType: blob.type, size: blob.size }));
          };
          reader.readAsDataURL(blob);
        }
      }, 0);
    }
  };

  // Screenshot capture (optional reason for proctoring)
  const captureScreenshot = useCallback((reason?: string) => {
    if (videoRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        wsRef.current.send(JSON.stringify({
          type: 'screenshot',
    imageData: imageData.split(',')[1], // Remove data:image/jpeg;base64, prefix
    reason: reason || undefined
        }));
      }
    }
  }, []);

  const drawOverlay = (boxes: Array<{ x: number; y: number; width: number; height: number }>) => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!video || !canvas) return;
    const vw = video.videoWidth || video.clientWidth;
    const vh = video.videoHeight || video.clientHeight;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = boxes.length === 1 ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 3;
    for (const b of boxes) {
      ctx.strokeRect(b.x, b.y, b.width, b.height);
    }
  };

  const detectFaces = useCallback(async () => {
    const video = videoRef.current;
  if (!video || (video.videoWidth === 0 && video.readyState < 2)) return; // ensure frame is available
    try {
      // Prefer native FaceDetector if available
      const NativeFD = (window as any).FaceDetector;
      if (NativeFD) {
        const fd = new NativeFD({ fastMode: true, maxDetectedFaces: 3 });
        const faces: any[] = await fd.detect(video);
        const boxes = faces.map((f: any) => {
          const bb = f.boundingBox || f;
          return { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
        });
        if (!detectorInfo) setDetectorInfo('FaceDetector (native)');
        if (faceCount <= 1 && boxes.length > 1) {
          captureScreenshot('multiple-faces');
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'proctor-event', event: 'multiple-faces', at: Date.now() }));
          }
        }
        setFaceCount(boxes.length);
        drawOverlay(boxes);
        return;
      }
      // Robust fallback: BlazeFace first, then FaceMesh bounding from keypoints
      try {
        if (!blazeModelRef.current) {
          const blazeface = await import('@tensorflow-models/blazeface');
          await ensureTFReady();
          blazeModelRef.current = await blazeface.load();
        }
        const preds: any[] = await blazeModelRef.current.estimateFaces(video as any, false);
        if (Array.isArray(preds)) {
          const boxes = preds.map((p: any) => {
            const [x1, y1] = p.topLeft as [number, number];
            const [x2, y2] = p.bottomRight as [number, number];
            return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
          });
          if (!detectorInfo) setDetectorInfo('BlazeFace (TFJS)');
          if (faceCount <= 1 && preds.length > 1) {
            captureScreenshot('multiple-faces');
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({ type: 'proctor-event', event: 'multiple-faces', at: Date.now() }));
            }
          }
          setFaceCount(preds.length);
          drawOverlay(boxes);
          return;
        }
      } catch {}
      // Fallback to FaceMesh detector (presence via keypoints)
      if (detectorReadyRef.current && faceMeshModelRef.current) {
        const preds = await faceMeshModelRef.current.estimateFaces(video, { flipHorizontal: true });
        const boxes = (preds || []).map((p: any) => {
          const pts = (p.keypoints || []).map((kp: any) => [kp.x, kp.y]);
          if (!pts.length) return { x: 0, y: 0, width: 0, height: 0 };
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          for (const [x, y] of pts) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
          return { x: minX, y: minY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
        });
        if (!detectorInfo) setDetectorInfo(faceMeshRuntimeRef.current === 'mediapipe' ? 'FaceMesh (Mediapipe)' : 'FaceMesh (TFJS)');
        const count = (preds || []).length;
        if (faceCount <= 1 && count > 1) {
          captureScreenshot('multiple-faces');
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'proctor-event', event: 'multiple-faces', at: Date.now() }));
          }
        }
        setFaceCount(count);
        drawOverlay(boxes);
        return;
      }
    } catch (e) {
      // Detection errors are non-fatal; do not spam the UI
    }
  }, [detectorInfo, faceCount, captureScreenshot]);

  // (Removed face-api.js fallback and gating helper)

  // New: Permission and start flow
  const handleAllowAndStart = async () => {
    setPermissionError(null);
    try {
  await initializeMedia();
      connectWebSocket();
      setShowPermissionModal(false);
      setIsInterviewActive(true);
      // Slight delay before requesting fullscreen to avoid jank
      setTimeout(async () => {
        try {
          if (!document.fullscreenElement) {
            await document.documentElement.requestFullscreen();
          }
        } catch {}
      }, 300);
      // Intervals are started via effects once video + data ready
    } catch (err: any) {
      setPermissionError(err?.message || 'Failed to access camera/microphone. Please try again.');
    }
  };

  // End interview
  const endInterview = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'end-interview'
      }));
    }

    // Cleanup
    if (screenshotIntervalRef.current) {
      clearInterval(screenshotIntervalRef.current);
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }

    setIsInterviewActive(false);
  };

  // Toggle microphone
  const toggleMicrophone = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraEnabled(videoTrack.enabled);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current);
      }
      if (faceDetectIntervalRef.current) {
        clearInterval(faceDetectIntervalRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (isInterviewActive && !isInterviewEnded) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isInterviewActive, isInterviewEnded]);

  // Video attach watchdog: retries attaching stream and playing until frames are available
  useEffect(() => {
    if (!isInterviewActive || isInterviewEnded) return;
    const video = videoRef.current;
    const stream = mediaStreamRef.current;
    if (!video || !stream) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12; // ~6s total
    const retry = () => {
      if (cancelled) return;
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.playsInline = true;
      video.muted = true;
      video.play().catch(() => {});
      if ((video as HTMLVideoElement).videoWidth > 0 || attempts >= maxAttempts) return;
      attempts += 1;
      setTimeout(retry, 500);
    };
    retry();
    return () => {
      cancelled = true;
    };
  }, [isInterviewActive, isInterviewEnded]);

  // Start face detection interval when interview is active (screenshots occur only on violations)
  useEffect(() => {
  if (!isInterviewActive) return;
    // No periodic screenshots
    // If FaceMesh eye tracking is active, skip extra face-detect polling to reduce load
    if (!detectorReadyRef.current && !faceDetectIntervalRef.current) {
      faceDetectIntervalRef.current = setInterval(detectFaces, 800);
    }
    return () => {
      if (screenshotIntervalRef.current) {
        clearInterval(screenshotIntervalRef.current);
        screenshotIntervalRef.current = null;
      }
      if (faceDetectIntervalRef.current) {
        clearInterval(faceDetectIntervalRef.current);
        faceDetectIntervalRef.current = null;
      }
    };
  }, [isInterviewActive, interviewData, captureScreenshot, detectFaces]);

  // Load FaceMesh for eye tracking (prefer MediaPipe runtime, fallback to TFJS)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const fl = await import('@tensorflow-models/face-landmarks-detection');
        // Try mediapipe runtime first
        try {
          const model = await fl.createDetector(fl.SupportedModels.MediaPipeFaceMesh, {
            runtime: 'mediapipe',
            refineLandmarks: true,
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh',
            maxFaces: 1,
          } as any);
          if (!cancelled) {
            faceMeshModelRef.current = model;
            faceMeshRuntimeRef.current = 'mediapipe';
            detectorReadyRef.current = true;
            setEyeTrackingAvailable(true);
            setDetectorInfo('FaceMesh (Mediapipe)');
          }
          return;
        } catch (e) {
          // fallback to tfjs
        }
  await ensureTFReady();
        const model = await fl.createDetector(fl.SupportedModels.MediaPipeFaceMesh, {
          runtime: 'tfjs',
          refineLandmarks: true,
          maxFaces: 1,
        } as any);
        if (!cancelled) {
          faceMeshModelRef.current = model;
          faceMeshRuntimeRef.current = 'tfjs';
          tfReadyRef.current = true;
          detectorReadyRef.current = true;
          setEyeTrackingAvailable(true);
          setDetectorInfo('FaceMesh (TFJS)');
        }
      } catch (e) {
        console.warn('Eye tracking init failed:', e);
        setEyeTrackingAvailable(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  // Eye tracking loop (throttled)
  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = async (ts?: number) => {
      raf = requestAnimationFrame(loop);
      if (ts && last && ts - last < 120) return; // ~8 FPS throttle
      last = ts || performance.now();
  if (!isInterviewActive || !detectorReadyRef.current || !faceMeshModelRef.current) return;
      const video = videoRef.current;
      const canvas = overlayRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      // Do not clear here completely to avoid flicker with face boxes; draw markers only
      try {
        const preds = await faceMeshModelRef.current.estimateFaces(video, { flipHorizontal: true });
        if (!preds || preds.length === 0) {
          offScreenCounterRef.current++;
          setGazeOff(offScreenCounterRef.current > 20);
          return;
        }
        offScreenCounterRef.current = 0;
        const pts = (preds[0].keypoints || []).map((p: any) => [p.x, p.y]);
        if (pts.length < 400) return; // not enough keypoints
        const L_OUT = pts[33], L_IN = pts[133];
        const R_OUT = pts[362], R_IN = pts[263];
        const L_UP = pts[159], L_LO = pts[145];
        const R_UP = pts[386], R_LO = pts[374];
        const L_IRIS = pts[468] ?? [(L_OUT[0] + L_IN[0]) / 2, (L_UP[1] + L_LO[1]) / 2];
        const R_IRIS = pts[473] ?? [(R_OUT[0] + R_IN[0]) / 2, (R_UP[1] + R_LO[1]) / 2];
        // Eye openness (rough EAR)
        const ear = (Math.hypot(L_UP[0]-L_LO[0], L_UP[1]-L_LO[1]) + Math.hypot(R_UP[0]-R_LO[0], R_UP[1]-R_LO[1])) / 2
          / (Math.hypot(L_OUT[0]-L_IN[0], L_OUT[1]-L_IN[1]) + Math.hypot(R_OUT[0]-R_IN[0], R_OUT[1]-R_IN[1]));
        const closed = ear < 0.18;
        if (closed) closedEyesCounterRef.current++; else closedEyesCounterRef.current = 0;
        setEyesClosed(closedEyesCounterRef.current > 10);
        // Gaze center (rough bounds)
        const hRatioL = (L_IRIS[0] - L_OUT[0]) / (L_IN[0] - L_OUT[0]);
        const hRatioR = (R_IRIS[0] - R_OUT[0]) / (R_IN[0] - R_OUT[0]);
        const vRatioL = (L_IRIS[1] - L_UP[1]) / (L_LO[1] - L_UP[1]);
        const vRatioR = (R_IRIS[1] - R_UP[1]) / (R_LO[1] - R_UP[1]);
        const centerish = (r: number) => r > 0.28 && r < 0.72;
        const centered = centerish(hRatioL) && centerish(hRatioR) && vRatioL > 0.25 && vRatioL < 0.75 && vRatioR > 0.25 && vRatioR < 0.75;
        if (!centered) offScreenCounterRef.current++; else offScreenCounterRef.current = 0;
        const nowOff = offScreenCounterRef.current > 20;
        const wasOff = gazeOff;
        setGazeOff(nowOff);
        if (!wasOff && nowOff) {
          captureScreenshot('gaze-off-screen');
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'proctor-event', event: 'gaze-off-screen', at: Date.now() }));
          }
        }
        // Draw minimal iris overlay
        ctx.fillStyle = '#10b981';
        ctx.beginPath(); ctx.arc(L_IRIS[0], L_IRIS[1], 3, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(R_IRIS[0], R_IRIS[1], 3, 0, Math.PI*2); ctx.fill();
      } catch {}
    };
  raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isInterviewActive, gazeOff, captureScreenshot]);

  // Require fullscreen and tab focus; terminate if leaving fullscreen
  useEffect(() => {
    if (!isInterviewActive) return;
    const requireFull = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch {}
    };
    requireFull();
    const visHandler = () => {
      if (document.hidden) {
        setProctorWarning('Tab switch detected. Please stay focused on the interview.');
      } else {
        setProctorWarning(null);
      }
    };
    const fsHandler = () => {
      if (!document.fullscreenElement) {
        setProctorWarning('Interview terminated: left fullscreen.');
        setTerminatedByFullscreen(true);
        if (wsRef.current) {
          try { wsRef.current.close(1000, 'Left fullscreen'); } catch {}
        }
        if (screenshotIntervalRef.current) { clearInterval(screenshotIntervalRef.current); screenshotIntervalRef.current = null; }
        if (faceDetectIntervalRef.current) { clearInterval(faceDetectIntervalRef.current); faceDetectIntervalRef.current = null; }
        setIsInterviewActive(false);
      } else {
        setProctorWarning(null);
      }
    };
    document.addEventListener('visibilitychange', visHandler);
    document.addEventListener('fullscreenchange', fsHandler);
    window.addEventListener('blur', visHandler);
    return () => {
      document.removeEventListener('visibilitychange', visHandler);
      document.removeEventListener('fullscreenchange', fsHandler);
      window.removeEventListener('blur', visHandler);
    };
  }, [isInterviewActive]);

  const restartInterview = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      setTerminatedByFullscreen(false);
      setIsInterviewEnded(false);
      setTimeLeft(10 * 60);
      connectWebSocket();
      setIsInterviewActive(true);
    } catch {}
  };

  // Format timer mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Interview Error</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/candidate/dashboard')} 
              className="w-full mt-4"
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isInterviewEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Interview Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center mb-4">
              Thank you for completing the interview! Your responses have been recorded and sent to the recruiter.
            </p>
            <p className="text-sm text-gray-600 text-center">
              Redirecting to dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Dialog open={showPermissionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Your AI Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-700">To begin, please allow camera and microphone access. This is required for the AI interview process.</p>
            {permissionError && (
              <Alert>
                <AlertDescription>{permissionError}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={handleAllowAndStart}
              disabled={isInterviewActive}
            >
              Allow & Start Interview
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/candidate/dashboard')}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {!showPermissionModal && (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-6xl mx-auto">
            {terminatedByFullscreen && (
              <Card className="mb-4 border-red-300 bg-red-50">
                <CardHeader>
                  <CardTitle className="text-red-700">Interview terminated</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 text-red-700">You exited fullscreen. The session was terminated. You can restart the interview now.</p>
                  <Button onClick={restartInterview} className="bg-red-600 hover:bg-red-700">Restart Interview</Button>
                </CardContent>
              </Card>
            )}
            {/* Header */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-2xl">
                      {interviewData?.job.title || 'AI Interview'}
                    </CardTitle>
                    <p className="text-gray-600">
                      {interviewData?.job.recruiter.company || 'Company Interview'}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {/* Timer badge */}
                    {isInterviewActive && !isInterviewEnded && (
                      <Badge variant="outline" className="text-lg px-3 py-1 bg-white border-gray-300 text-gray-900">
                        ⏰ {formatTime(timeLeft)}
                      </Badge>
                    )}
                    <Badge variant={isConnected ? 'default' : 'secondary'}>
                      {isConnected ? 'Connected' : 'Connecting...'}
                    </Badge>
                    {isInterviewActive && (
                      <Badge variant="default" className="bg-red-600">
                        Recording
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Video Feed */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Video Feed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                      {!isCameraEnabled && (
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                          <CameraOff className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      {isInterviewActive && (
                        <div className={`absolute top-2 left-2 right-2 mx-auto w-fit px-3 py-1 rounded-md text-xs font-medium ${faceStatus === 'ok' ? 'bg-black/60 text-white' : faceStatus === 'none' ? 'bg-yellow-500 text-white' : 'bg-red-600 text-white'}`}>
                          {faceStatus === 'ok' ? (gazeOff ? 'Please keep your eyes on the screen.' : (detectorInfo || 'Detector active')) : faceStatus === 'none' ? 'No face detected. Please position your face in view.' : 'Multiple faces detected. Only one person should be visible.'}
                        </div>
                      )}
                      {eyesClosed && isInterviewActive && (
                        <div className="absolute top-12 left-2 right-2 mx-auto w-fit px-3 py-1 rounded-md text-xs font-medium bg-fuchsia-600 text-white">
                          Your eyes appear closed. Please stay attentive.
                        </div>
                      )}
                      {proctorWarning && isInterviewActive && (
                        <div className="absolute bottom-2 left-2 right-2 mx-auto w-fit px-3 py-1 rounded-md text-xs font-medium bg-orange-500 text-white">
                          {proctorWarning}
                        </div>
                      )}
                    </div>
                    {/* Controls */}
                    <div className="flex justify-center gap-4 mt-4">
                      <Button
                        variant={isMicEnabled ? 'default' : 'destructive'}
                        size="lg"
                        onClick={toggleMicrophone}
                        disabled={!isInterviewActive}
                      >
                        {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                      </Button>
                      <Button
                        variant={isCameraEnabled ? 'default' : 'destructive'}
                        size="lg"
                        onClick={toggleCamera}
                        disabled={!isInterviewActive}
                      >
                        {isCameraEnabled ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                      </Button>
                      {/* Start/Stop Speaking Controls */}
                      {isInterviewActive && (
                        <Button
                          size="lg"
                          onClick={isRecording ? stopRecording : startRecording}
                          variant={isRecording ? 'destructive' : 'default'}
                          disabled={!isMicEnabled}
                        >
                          {isRecording ? 'Stop Speaking' : 'Start Speaking'}
                        </Button>
                      )}
                      {isRecording && (
                        <p className="text-sm text-blue-600 text-center">
                          🎤 Recording... Speak clearly for 3+ seconds, then click Stop
                        </p>
                      )}
                      {!isRecording && isInterviewActive && (
                        <p className="text-sm text-gray-600 text-center">
                          Click "Start Speaking" to record your response (3+ seconds minimum)
                        </p>
                      )}
                      <Button
                        size="lg"
                        onClick={endInterview}
                        variant="destructive"
                        disabled={!isInterviewActive}
                      >
                        <PhoneOff className="w-5 h-5 mr-2" />
                        End Interview
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {/* Transcript */}
              <div>
                <Card className="h-[600px]">
                  <CardHeader>
                    <CardTitle>Interview Transcript</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[500px] overflow-y-auto space-y-4">
                      {transcript.length === 0 ? (
                        <div className="text-center text-gray-500 mt-8">
                          <p>Interview transcript will appear here</p>
                          <p className="text-sm mt-2">Start the interview to begin</p>
                        </div>
                      ) : (
                        transcript.map((message, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg ${
                              message.role === 'assistant'
                                ? 'bg-blue-50 border-l-4 border-blue-500'
                                : 'bg-gray-50 border-l-4 border-gray-500'
                            }`}
                          >
                            <div className="font-semibold text-sm mb-1">
                              {message.role === 'assistant' ? 'AI Interviewer' : 'You'}
                            </div>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            {/* Hidden audio element for AI responses */}
            <audio ref={audioRef} className="hidden" />
          </div>
        </div>
      )}
    </>
  );
}
