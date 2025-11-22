import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { X, Camera, AlertCircle, Zap, ZapOff, ZoomIn, ZoomOut } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Contrôles caméra
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);
  const streamRef = useRef<MediaStream | null>(null);

  // Configuration optimisée
  const hints = new Map();
  const formats = [
    BarcodeFormat.CODE_128, // Priorité absolue
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.UPC_A
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(DecodeHintType.TRY_HARDER, true); 

  // 50ms au lieu de 300ms pour scanner plus agressivement
  const codeReader = useRef(new BrowserMultiFormatReader(hints, 50)); 

  useEffect(() => {
    let isMounted = true;

    const startScan = async () => {
      try {
        const constraints: any = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 }, // On vise la HD
            height: { ideal: 1080 },
            advanced: [{ focusMode: "continuous" }] 
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (!isMounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        // Analyse des capacités (Torch / Zoom)
        const track = stream.getVideoTracks()[0];
        if (track) {
            const capabilities: any = track.getCapabilities();
            
            if (capabilities.torch) {
                setHasTorch(true);
            }
            
            if (capabilities.zoom) {
                setHasZoom(true);
                setMaxZoom(capabilities.zoom.max || 5);
                setZoom(capabilities.zoom.min || 1);
            }
            
            // Forcer l'autofocus si possible
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                try {
                   await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any);
                } catch (e) { console.warn("Focus failed", e); }
            }
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          codeReader.current.decodeFromStream(
            stream,
            videoRef.current,
            (result: any, err: any) => {
              if (result && isMounted) {
                // Petit délai pour éviter les lectures fantômes
                onScan(result.getText());
              }
            }
          );
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (isMounted) {
          setError("Erreur caméra. Vérifiez les permissions ou essayez un autre navigateur.");
        }
      }
    };

    startScan();

    return () => {
      isMounted = false;
      codeReader.current.reset();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [onScan]);

  // Gestion de la torche
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
       await track.applyConstraints({
         advanced: [{ torch: !isTorchOn }]
       } as any);
       setIsTorchOn(!isTorchOn);
    } catch (err) {
       console.error("Torch failed", err);
    }
  };

  // Gestion du zoom
  const handleZoom = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const newZoom = parseFloat(e.target.value);
      setZoom(newZoom);
      
      if (!streamRef.current) return;
      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;
      
      try {
         await track.applyConstraints({
           advanced: [{ zoom: newZoom }]
         } as any);
      } catch (err) {
         console.error("Zoom failed", err);
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
        <div className="flex items-center gap-3">
             <h2 className="font-bold text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" /> Scanner Pro
            </h2>
            {hasTorch && (
                <button 
                    onClick={toggleTorch}
                    className={`p-2 rounded-full transition-all ${isTorchOn ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'}`}
                >
                    {isTorchOn ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                </button>
            )}
        </div>
        
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full object-cover"
          muted 
          playsInline
        />
        
        {/* Overlay Guide */}
        <div className="absolute inset-0 border-[40px] border-black/50 z-0 pointer-events-none"></div>
        
        {/* Zoom Controls Overlay */}
        {hasZoom && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center bg-black/40 p-2 rounded-full backdrop-blur-sm">
                <ZoomIn className="w-5 h-5 text-white mb-2" />
                <input 
                    type="range" 
                    min="1" 
                    max={Math.min(maxZoom, 5)} // Cap à 5x pour éviter trop de flou numérique
                    step="0.1" 
                    value={zoom}
                    onChange={handleZoom}
                    className="h-32 w-2 appearance-none bg-white/30 rounded-full outline-none slider-vertical"
                    style={{ writingMode: 'bt-lr' as any, WebkitAppearance: 'slider-vertical' }}
                />
                <ZoomOut className="w-5 h-5 text-white mt-2" />
            </div>
        )}

        <div className="relative z-10 w-[85%] max-w-sm aspect-[3/2] border-2 border-fire-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center pointer-events-none">
            <div className="w-full h-0.5 bg-fire-500/50 animate-pulse"></div>
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-fire-500 -mt-0.5 -ml-0.5"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-fire-500 -mt-0.5 -mr-0.5"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-fire-500 -mb-0.5 -ml-0.5"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-fire-500 -mb-0.5 -mr-0.5"></div>
        </div>
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 p-6">
             <div className="text-center text-white">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p>{error}</p>
                <button onClick={onClose} className="mt-6 bg-white text-black px-6 py-2 rounded-full font-bold">Fermer</button>
             </div>
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="p-4 bg-black text-white text-center pb-safe">
        <p className="text-xs text-gray-400 mb-1">Reculez légèrement et utilisez le zoom pour faire la mise au point.</p>
        <div className="text-[10px] text-gray-600">Support Code128 / Datamatrix / QR</div>
      </div>
      
      <style>{`
        input[type=range][orient=vertical] {
            writing-mode: bt-lr; /* IE */
            -webkit-appearance: slider-vertical; /* WebKit */
            width: 8px;
            height: 100px;
            padding: 0 5px;
        }
      `}</style>
    </div>
  );
};