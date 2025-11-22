import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera, RefreshCw, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  
  // Ref pour bloquer les scans multiples immédiatement (plus rapide que le state)
  const isScanningRef = useRef(false);

  // Moteur de scan : Configuration par défaut (éprouvée)
  const codeReader = useRef(new BrowserMultiFormatReader());

  useEffect(() => {
    startScan();
    return () => {
      codeReader.current.reset();
    };
  }, []);

  const startScan = () => {
    setError(null);
    setScannedResult(null);
    isScanningRef.current = false; // Réinitialiser le verrou au démarrage

    // FIX 1: Retrait du check 'navigator.mediaDevices.getUserMedia' qui est redondant (TS2774)
    if (navigator.mediaDevices) {
      if (videoRef.current) {
        codeReader.current.decodeFromVideoDevice(
            // FIX 2: Utilisation de 'null' au lieu de 'undefined' pour l'argument deviceId (TS2345)
            null, 
            videoRef.current, 
            (result, err) => {
                // Vérifier la ref au lieu du state pour une réaction immédiate
                if (result && !isScanningRef.current) {
                    isScanningRef.current = true; // Bloquer immédiatement
                    
                    const text = result.getText();
                    setScannedResult(text);
                    
                    // Arrêter le flux vidéo tout de suite pour figer l'image et libérer les ressources
                    codeReader.current.reset(); 
                    
                    // Appeler le callback parent avec un délai pour le feedback visuel
                    setTimeout(() => {
                        onScan(text);
                    }, 1000);
                }
                if (err && !(err instanceof NotFoundException)) {
                   // Silence sur les erreurs de frame vide
                }
            }
        ).catch(err => {
            console.error(err);
            setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
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
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Camera className="w-5 h-5" /> Scanner Code-Barres
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
          className="w-full h-full object-cover"
        />
        
        {!scannedResult && !error && (
            <>
                {/* VISEUR POINTILLÉ : Style identique à votre capture d'écran */}
                <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10">
                    <div className="w-full max-w-sm aspect-[2/1] border-4 border-dashed border-white/80 rounded-xl shadow-sm"></div>
                </div>
                
                {/* Texte d'aide discret en bas */}
                <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none z-10">
                    <p className="text-white/80 text-sm font-medium bg-black/30 px-4 py-2 rounded-full inline-block backdrop-blur-sm">
                        Placez le code dans le cadre
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