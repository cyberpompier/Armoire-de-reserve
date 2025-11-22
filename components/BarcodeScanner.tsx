import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Utilisation d'une ref pour le verrouillage immédiat (plus rapide que le State React)
  // C'est le secret de la stabilité du Code 1.
  const shouldScanRef = useRef<boolean>(true); 
  const codeReader = useRef(new BrowserMultiFormatReader());

  const [error, setError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  useEffect(() => {
    startScan();
    // Nettoyage propre à la fermeture (Point fort du Code 1)
    return () => {
      codeReader.current.reset();
    };
  }, []);

  const startScan = () => {
    setError(null);
    setScannedResult(null);
    shouldScanRef.current = true; // On autorise le scan

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      if (videoRef.current) {
        // Utilisation de 'undefined' au lieu de 'null' (meilleure compatibilité Code 1)
        codeReader.current.decodeFromVideoDevice(
            undefined, 
            videoRef.current, 
            (result, err) => {
                // VERROUILLAGE : On ne traite le résultat que si le verrou est ouvert
                if (result && shouldScanRef.current) {
                    // 1. On verrouille immédiatement pour éviter les doubles scans
                    shouldScanRef.current = false;
                    
                    const text = result.getText();
                    setScannedResult(text);

                    // 2. On arrête la caméra tout de suite pour figer l'instant (Performance)
                    codeReader.current.reset();

                    // 3. On attend un peu pour montrer l'animation de succès à l'utilisateur
                    setTimeout(() => {
                        onScan(text);
                    }, 800);
                }
                
                if (err && !(err instanceof NotFoundException)) {
                   // On ignore les erreurs de lecture frame par frame (bruit)
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
      {/* Header Moderne (Code 2) */}
      <div className="flex justify-between items-center p-4 text-white bg-black/50 backdrop-blur-md absolute top-0 left-0 right-0 z-10 safe-area-top">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-400" /> Scanner Code-Barres
        </h2>
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors active:scale-95"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Zone Caméra */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          // On garde object-cover pour le plein écran, mais le scan est stabilisé par la logique JS
          className="w-full h-full object-cover opacity-90"
        />
        
        {!scannedResult && !error && (
            <>
                {/* VISEUR (Code 2 amélioré) */}
                <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10">
                    <div className="relative w-full max-w-xs aspect-square border-2 border-white/30 rounded-3xl">
                        {/* Coins blancs marqués pour guider l'œil */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-2xl -mt-1 -ml-1"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-2xl -mt-1 -mr-1"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-2xl -mb-1 -ml-1"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-2xl -mb-1 -mr-1"></div>
                        
                        {/* Ligne de scan animée */}
                        <div className="absolute inset-x-4 h-0.5 bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-[scan_2s_ease-in-out_infinite] top-1/2"></div>
                    </div>
                </div>
                
                {/* Texte d'aide */}
                <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none z-10 px-4">
                    <p className="text-white/90 text-sm font-medium bg-black/40 px-6 py-3 rounded-full inline-block backdrop-blur-md border border-white/10">
                        Placez le code-barres dans le cadre
                    </p>
                </div>
            </>
        )}
        
        {/* Feedback Succès (Code 2 avec logique Code 1) */}
        {scannedResult && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-20 animate-in fade-in duration-200">
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center transform transition-all scale-100">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4 animate-bounce" />
                    <p className="text-green-600 font-bold text-2xl">Code trouvé !</p>
                    <p className="text-gray-500 font-mono mt-2 text-lg tracking-wider bg-gray-100 py-1 px-3 rounded-lg">{scannedResult}</p>
                </div>
             </div>
        )}

        {/* Gestion Erreurs (Inspiré Code 1) */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90 p-6">
             <div className="text-center text-white max-w-xs">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                <h3 className="text-xl font-bold mb-2">Erreur</h3>
                <p className="text-gray-300 mb-8">{error}</p>
                <button 
                    onClick={handleRetry} 
                    className="flex items-center justify-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold mx-auto hover:bg-gray-200 transition-colors w-full"
                >
                    <RefreshCw className="w-5 h-5" /> Réessayer
                </button>
             </div>
          </div>
        )}
      </div>
      
      {/* Ajout d'une animation personnalisée pour la barre de scan */}
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-100px); opacity: 0; }
          50% { transform: translateY(100px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};