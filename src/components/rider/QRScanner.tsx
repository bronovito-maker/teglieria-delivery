"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";

type ScannerState = "idle" | "requesting" | "scanning" | "error";

interface Props {
  onClose: () => void;
  onCode?: (data: string) => void;
  title?: string;
}

export default function QRScanner({ onClose, onCode, title = "Scansiona QR Ordine" }: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [state, setState] = useState<ScannerState>("requesting");
  const [errorMsg, setErrorMsg] = useState("");
  const [detected, setDetected] = useState(false);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Validate and navigate to the scanned URL
  const handleScan = useCallback(
    (data: string) => {
      if (detected) return;

      if (onCode) {
        setDetected(true);
        stopCamera();
        onCode(data);
        return;
      }

      // Accept full URL or just the path /rider/ordine/:id
      try {
        let path = data;
        if (data.startsWith("http")) {
          path = new URL(data).pathname;
        }
        const match = path.match(/\/rider\/ordine\/([^/?#]+)/);
        if (match) {
          setDetected(true);
          stopCamera();
          // Brief haptic feedback if available
          if ("vibrate" in navigator) navigator.vibrate(100);
          router.push(`/rider/ordine/${match[1]}`);
        }
      } catch {
        // Not a valid URL — ignore and keep scanning
      }
    },
    [detected, onCode, router, stopCamera]
  );

  // Frame decode loop using jsQR
  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });

    if (code?.data) {
      handleScan(code.data);
      return;
    }

    rafRef.current = requestAnimationFrame(scanFrame);
  }, [handleScan]);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" }, // rear camera preferred
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setState("scanning");
        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (err: unknown) {
        if (cancelled) return;
        const e = err as { name?: string };
        if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
          setErrorMsg(
            "Accesso alla fotocamera negato. Vai nelle impostazioni del browser e abilita la fotocamera per questo sito."
          );
        } else if (e?.name === "SecurityError") {
          setErrorMsg(
            "La fotocamera è bloccata dalle impostazioni di sicurezza del sito. Avvisa lo staff e riprova dopo l'aggiornamento."
          );
        } else if (e?.name === "NotFoundError") {
          setErrorMsg("Nessuna fotocamera trovata sul dispositivo.");
        } else {
          setErrorMsg("Impossibile avviare la fotocamera. Riprova.");
        }
        setState("error");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [scanFrame, stopCamera]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors text-xl"
        aria-label="Chiudi scanner"
      >
        ✕
      </button>

      <p className="text-white/50 text-[10px] font-brand font-bold uppercase tracking-[0.3em] mb-6">
        {title}
      </p>

      <div className="relative w-72 h-72 rounded-[2rem] overflow-hidden shadow-2xl">
        {/* Video feed */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Hidden canvas for frame analysis */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning overlay */}
        {state === "scanning" && !detected && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner markers */}
            {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos, i) => (
              <div
                key={i}
                className={`absolute w-7 h-7 ${pos} ${
                  i < 2 ? "border-t-2" : "border-b-2"
                } ${i % 2 === 0 ? "border-l-2" : "border-r-2"} border-terracotta rounded-sm`}
              />
            ))}
            {/* Scan line */}
            <div className="absolute inset-x-0 h-0.5 bg-terracotta/70 top-1/2 animate-[scanline_2s_ease-in-out_infinite]" />
          </div>
        )}

        {/* States */}
        {state === "requesting" && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-xs font-brand">Avvio fotocamera...</p>
          </div>
        )}

        {detected && (
          <div className="absolute inset-0 bg-green-500/20 flex flex-col items-center justify-center gap-2">
            <span className="text-4xl">✓</span>
            <p className="text-white font-brand font-bold text-sm uppercase tracking-wider">QR rilevato!</p>
          </div>
        )}
      </div>

      {state === "error" && (
        <div className="mt-6 max-w-xs text-center px-6 py-4 bg-white/5 rounded-2xl">
          <p className="text-white/70 text-sm font-body leading-relaxed">{errorMsg}</p>
          <button
            onClick={handleClose}
            className="mt-4 px-6 py-2 rounded-full bg-terracotta text-white text-xs font-brand font-bold uppercase tracking-widest"
          >
            Chiudi
          </button>
        </div>
      )}

      {state === "scanning" && !detected && (
        <p className="mt-6 text-white/40 text-xs font-body text-center px-8">
          Inquadra il QR code sullo scontrino
        </p>
      )}
    </div>
  );
}
