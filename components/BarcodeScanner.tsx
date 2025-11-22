import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { X, Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Configuration optimisée pour la performance
  const hints = new Map();
  const formats = [
    BarcodeFormat.CODE_128, // Priorité 1: Industriel / Logistique
    BarcodeFormat.CODE_39,  // Priorité 2: Industriel ancien
    BarcodeFormat.EAN_13,   // Retail
    BarcodeFormat.QR_CODE,  // 2D
    BarcodeFormat.DATA_MATRIX, // Industriel 2D
    BarcodeFormat.ITF,      // Cartons
    BarcodeFormat.CODABAR,
    BarcodeFormat.UPC_A
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(DecodeHintType.TRY_HARDER, true); 

  // On instancie le reader une seule fois
  const codeReader = useRef(new BrowserMultiFormatReader(hints, 300)); // 300ms entre les scans pour laisser le CPU respirer

  useEffect(() => {
    let isMounted = true;

    const startScan = async () => {
      try {
        // Contraintes plus agressives pour avoir une image nette (HD)
        // Cast to any to allow non-standard focusMode
        const constraints: any = {
          video: {
            facingMode: 'environment',
            width: { min: 1280, ideal: 1920 },
            height: { min: 720, ideal: 1080 },
            // Tentative d'activation de l'autofocus pour Chrome Android
            advanced: [{ focusMode: "continuous" }] 
          }
        };

        // On demande d'abord la permission explicitement pour configurer le flux
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Application des tracks au lecteur
        if (!isMounted) {
            stream.getTracks().forEach(track => track.stop());
            return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Démarrage du décodage via ZXing en utilisant le flux vidéo déjà attaché
          // Use decodeFromStream to support custom constraints and continuous scanning callback
          codeReader.current.decodeFromStream(
            stream,
            videoRef.current,
            (result: any, err: any) => {
              if (result && isMounted) {
                onScan(result.getText());
              }
              if (err && !(err instanceof NotFoundException)) {
                // console.warn(err); // Trop verbeux
              }
            }
          );
        }

        // Tenter d'appliquer le focus manuellement si l'API le permet
        const track = stream.getVideoTracks()[0];
        if (track) {
            const capabilities: any = track.getCapabilities();
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                // @ts-ignore
                track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            }
        }

      } catch (err) {
        console.error("Camera error:", err);
        if (isMounted) {
          setError("Impossible d'initialiser la caméra haute résolution. Vérifiez les permissions.");
        }
      }
    };

    startScan();

    return () => {
      isMounted = false;
      codeReader.current.reset();
      // Stop tracks manually just in case
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Camera className="w-5 h-5" /> Scanner HD
        </h2>
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
          muted // Important pour l'autoplay sur certains navigateurs
          playsInline // Important pour iOS
        />
        
        {/* Overlay Guide */}
        <div className="absolute inset-0 border-[40px] border-black/50 z-0"></div>
        <div className="relative z-10 w-72 h-48 border-2 border-fire-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
            <div className="w-full h-0.5 bg-fire-500/50 animate-pulse"></div>
            {/* Repères de coins pour aider à viser */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white -mt-0.5 -ml-0.5"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white -mt-0.5 -mr-0.5"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white -mb-0.5 -ml-0.5"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white -mb-0.5 -mr-0.5"></div>
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
      <div className="p-6 bg-black text-white text-center pb-8">
        <p className="text-sm text-gray-400">Assurez-vous d'avoir un bon éclairage et que le code soit net.</p>
      </div>
    </div>
  );
};