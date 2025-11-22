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

  // Amélioration : Ajout de "hints" pour guider le lecteur de codes-barres
  const hints = new Map();
  // Liste étendue et priorisée de formats pour une meilleure reconnaissance
  const formats = [
    BarcodeFormat.CODE_128, // Très commun pour les étiquettes internes
    BarcodeFormat.QR_CODE,
    BarcodeFormat.EAN_13,
    BarcodeFormat.CODE_39,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR, // Ajout pour plus de compatibilité
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_93,
    BarcodeFormat.PDF_417,
    BarcodeFormat.RSS_14, // Ajout pour plus de compatibilité
    BarcodeFormat.RSS_EXPANDED, // Ajout pour plus de compatibilité
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(DecodeHintType.TRY_HARDER, true); // Demande au lecteur de faire plus d'efforts

  const codeReader = useRef(new BrowserMultiFormatReader(hints));

  useEffect(() => {
    let isMounted = true;

    const startScan = async () => {
      try {
        // Check permissions first
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        
        if (!isMounted) return;

        if (videoRef.current) {
          // Start decoding
          codeReader.current.decodeFromVideoDevice(
            null, 
            videoRef.current, 
            (result, err) => {
              if (result && isMounted) {
                onScan(result.getText());
              }
              if (err && !(err instanceof NotFoundException)) {
                // Ignore NotFoundException which happens every frame no code is detected
                console.warn(err);
              }
            }
          );
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (isMounted) {
          setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
        }
      }
    };

    startScan();

    return () => {
      isMounted = false;
      codeReader.current.reset();
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Camera className="w-5 h-5" /> Scanner
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
        />
        
        {/* Overlay Guide */}
        <div className="absolute inset-0 border-[40px] border-black/50 z-0"></div>
        <div className="relative z-10 w-64 h-48 border-2 border-fire-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
            <div className="w-full h-0.5 bg-fire-500/50 animate-pulse"></div>
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
        <p className="text-sm text-gray-400">Placez le code-barres dans le cadre pour le scanner automatiquement.</p>
      </div>
    </div>
  );
};