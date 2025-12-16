"use client"; // Required for browser APIs like camera access

import { useEffect, useRef, useState } from "react";


export default function LiveCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>("");
  const [fps, setFps] = useState<number>(0);
  const [caption, setCaption] = useState<string>("Waiting for caption...");
  const [inferenceTime, setInferenceTime] = useState<number | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const calculateFps = () => {
      const now = performance.now();
      frameCount++;

      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }

      animationFrameId = requestAnimationFrame(calculateFps);
    };

    if (isStreaming) {
      calculateFps();
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [isStreaming]);

  const startCamera = async () => {
    setConnectionStatus('checking');
    setError("");
    setCaption("Waiting for caption..."); // Reset caption
    setInferenceTime(null); // Reset timer

    try {
      // 1. Check Backend Health
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const healthRes = await fetch(`${API_URL}/health`);

      if (!healthRes.ok) {
        throw new Error("Backend is offline");
      }

      setConnectionStatus('connected');
      setIsStreaming(true);

      // 2. Start Camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setConnectionStatus('error');
      setError("Could not connect to backend system.");
      console.error("Connection error:", err);
    }
  };

  const stopCamera = () => {
    setIsStreaming(false);
    setConnectionStatus('idle');
    setFps(0);
    setCaption("Camera stopped");
    setInferenceTime(null);

    // Stop all video tracks to turn off camera light
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    if (isStreaming) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  useEffect(() => {
    // Only capture if streaming
    if (!isStreaming) return;

    const captureAndSendFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const formData = new FormData();
            formData.append("file", blob, "frame.jpg");

            try {
              const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
              const response = await fetch(`${API_URL}/predict`, {
                method: "POST",
                body: formData,
              });
              const data = await response.json();
              if (data.status === "success") {
                setCaption(data.caption);
                setInferenceTime(data.inference_time);
              }
            } catch (err) {
              console.error("Error sending frame:", err);
            }
          }
        }, "image/jpeg", 0.7);
      }
    };

    const intervalId = setInterval(captureAndSendFrame, 3000);
    return () => clearInterval(intervalId);
  }, [isStreaming]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1a1a] text-white">

      <div className="relative w-full max-w-2xl p-4">

        {/* Top Control Bar */}
        <div className="flex items-center justify-between mb-6 px-2">
          {/* Left: Stats */}
          <div className="w-1/3">
            {isStreaming && (
              <div className="flex flex-col">
                <span className="text-xs font-bold text-green-400">● LIVE</span>
                <span className="text-[10px] text-gray-500 tracking-wider">
                  {fps} FPS
                </span>
              </div>
            )}
            {!isStreaming && connectionStatus === 'idle' && (
              <span className="text-xs font-bold text-gray-600">● READY</span>
            )}
            {!isStreaming && connectionStatus === 'error' && (
              <span className="text-xs font-bold text-red-500">● ERROR</span>
            )}
          </div>

          {/* Center: Main Toggle */}
          <div className="flex justify-center w-1/3">
            <button
              onClick={toggleCamera}
              disabled={connectionStatus === 'checking'}
              className={`
                 px-8 py-2 rounded-full text-sm font-medium transition-all duration-300 shadow-lg
                 ${isStreaming
                  ? 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500 hover:text-white'
                  : 'bg-white text-black hover:bg-gray-200 border-transparent'}
                 ${connectionStatus === 'checking' ? 'opacity-50 cursor-wait' : ''}
               `}
            >
              {connectionStatus === 'checking' ? 'Connecting...' : (isStreaming ? 'Stop Camera' : 'Start Camera')}
            </button>
          </div>

          {/* Right: Spacer for balance */}
          <div className="w-1/3 flex justify-end">
            {/* Could put settings icon here later */}
          </div>
        </div>

        {/* Video / Placeholder Area */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-700 bg-black shadow-2xl aspect-video">

          {/* Active Camera Feed */}
          {isStreaming && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover grayscale-[20%] contrast-110 scale-x-[-1]"
            />
          )}

          {/* Idle / Loading State Overlay */}
          {!isStreaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 text-gray-500">
              {error ? (
                <div className="text-red-400 text-sm font-light px-4 text-center">{error}</div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full border-2 border-gray-800 flex items-center justify-center">
                    <span className="text-xl">📷</span>
                  </div>
                  <span className="text-xs tracking-widest uppercase opacity-50">Camera Offline</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Caption Display */}
        <div className="mt-6 text-center h-16">
          {isStreaming ? (
            <>
              <p className="text-sm font-light text-gray-400 transition-all">
                {caption}
              </p>
              {inferenceTime !== null && (
                <p className="text-xs text-gray-600 mt-1">
                  Inference: {inferenceTime.toFixed(2)}s
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-light text-gray-600 italic">
              Waiting to start...
            </p>
          )}
        </div>

      </div>
    </main>
  );
}