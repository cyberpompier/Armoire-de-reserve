import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException, DecodeHintType, BarcodeFormat } from '@zxing/library';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  
  // Configuration avancée pour les codes difficiles (courbés, textiles)
  const hints = new Map();
  // TRY_HARDER est crucial pour les étiquettes textiles courbées
  hints.set(DecodeHintType.TRY_HARDER, true);
  
  // On spécifie les formats pour éviter de chercher inutilement d'autres types
  // Votre étiquette est un Code 128
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.EAN_13,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.QR_CODE
  ]);

  const codeReader = useRef(new BrowserMultiFormatReader(hints));

  useEffect(() => {
    startScan();
    return () => {
      codeReader.current.reset();
    };
  }, []);

  const startScan = () => {
    setError(null);
    setScannedResult(null);

    // Fix TS2774: Removed redundant navigator.mediaDevices.getUserMedia check
    if (navigator.mediaDevices) {
      if (videoRef.current) {
        // On demande explicitement de la HD (1920x1080)
        // C'est indispensable pour lire les barres fines sur un code long comme le vôtre
        const constraints = {
            video: { 
                facingMode: 'environment',
                width: { min: 1280, ideal: 1920 },
                height: { min: 720, ideal: 1080 }
            }
        };

        codeReader.current.decodeFromConstraints(
            constraints,
            videoRef.current, 
            (result, err) => {
                if (result && !scannedResult) {
                    const text = result.getText();
                    setScannedResult(text);
                    onScan(text);
                }
                if (err && !(err instanceof NotFoundException)) {
                    // console.warn(err);
                }
            }
        ).catch(err => {
            console.error(err);
            setError("Impossible d'accéder à la caméra haute résolution.");
        });
      }
    } else {
         setError("La caméra n'est pas supportée par ce navigateur.");
    }
  };

  const handleRetry = () => {
    codeReader.current.reset();
    startScan();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex justify-between items-center p-4 text-white bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Camera className="w-5 h-5" /> Scanner Pro
        </h2>
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover"
        />
        
        {!scannedResult && !error && (
            <>
                <div className="absolute inset-0 border-[40px] border-black/50 z-0 pointer-events-none"></div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    {/* Cadre plus large pour les codes longs */}
                    <div className="w-80 h-40 border-2 border-white/50 rounded-lg relative">
                         <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-fire-500 -mt-0.5 -ml-0.5"></div>
                         <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-fire-500 -mt-0.5 -mr-0.5"></div>
                         <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-fire-500 -mb-0.5 -ml-0.5"></div>
                         <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-fire-500 -mb-0.5 -mr-0.5"></div>
                         
                         {/* Ligne de visée rouge pour aider à l'alignement */}
                         <div className="absolute top-1/2 left-4 right-4 h-px bg-red-500/50"></div>
                    </div>
                </div>
                <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none">
                    <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-full inline-block">
                        Aplatissez bien l'étiquette si possible
                    </p>
                </div>
            </>
        )}
        
        {scannedResult && (
             <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm z-20">
                <div className="bg-white p-6 rounded-2xl shadow-xl text-center animate-bounce">
                    <p className="text-green-600 font-bold text-xl">Code détecté !</p>
                    <p className="text-slate-500 font-mono mt-2">{scannedResult}</p>
                </div>
             </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 p-6">
             <div className="text-center text-white">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="mb-6">{error}</p>
                <button onClick={handleRetry} className="flex items-center justify-center gap-2 bg-white text-black px-6 py-2 rounded-full font-bold mx-auto">
                    <RefreshCw className="w-4 h-4" /> Réessayer
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};