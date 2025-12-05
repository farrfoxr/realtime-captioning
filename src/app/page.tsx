"use client"; // Required for browser APIs like camera access

import { useEffect, useRef, useState } from "react";

export default function LiveCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string>("");
  const [fps, setFps] = useState<number>(0);
  const [caption, setCaption] = useState<string>("Waiting for caption...");

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

    calculateFps();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    async function startCamera() {
      try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 } // Request 720p for decent quality
        });

        // Assign the camera stream to the video element
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError("Camera access denied or not available.");
        console.error("Error accessing camera:", err);
      }
    }

    startCamera();
  }, []);

  useEffect(() => {
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
              const response = await fetch("http://localhost:8000/predict", {
                method: "POST",
                body: formData,
              });
              const data = await response.json();
              if (data.status === "success") {
                setCaption(data.caption);
              }
            } catch (err) {
              console.error("Error sending frame:", err);
            }
          }
        }, "image/jpeg", 0.7); // 0.7 quality for balance
      }
    };

    const intervalId = setInterval(captureAndSendFrame, 3000); // Capture every 3 seconds

    return () => clearInterval(intervalId);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1a1a] text-white">

      {/* Container for the video feed */}
      <div className="relative w-full max-w-2xl p-4">

        <div className="mb-4 text-center">
          <span className="text-xs font-light tracking-widest text-gray-500">
            1280 x 720 • {fps} FPS
          </span>
        </div>

        {/* Video Element */}
        <div className="overflow-hidden rounded-2xl border border-gray-700 bg-black shadow-2xl">
          {error ? (
            <div className="flex h-[400px] items-center justify-center text-red-400">
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover grayscale-[20%] contrast-110 scale-x-[-1]"
            />
          )}
        </div>

        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Caption Display */}
        <div className="mt-6 text-center">
          <p className="text-sm font-light text-gray-400">
            {caption}
          </p>
        </div>

      </div>
    </main>
  );
}