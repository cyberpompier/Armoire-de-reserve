import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { X, Camera, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  
  // 1. VERROUILLAGE SYNCHRONE :
  // Cette ref empêche physiquement le scanner de valider deux fois le même code.
  // C'est plus rapide et fiable qu'un useState.
  const isScanningRef = useRef(false);

  // Moteur de scan ZXing
  const codeReader = useRef(new BrowserMultiFormatReader());

  useEffect(() => {
    startScan();
    // Nettoyage impératif à la destruction du composant
    return () => {
      codeReader.current.reset();
    };
  }, []);

  const startScan = () => {
    setError(null);
    setScannedResult(null);
    isScanningRef.current = false; // On déverrouille le scan au démarrage

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      if (videoRef.current) {
        codeReader.current.decodeFromVideoDevice(
            undefined, // Laisse la librairie choisir la meilleure caméra arrière
            videoRef.current, 
            (result, err) => {
                // Si un résultat est trouvé ET qu'on n'est pas déjà en train de traiter un succès
                if (result && !isScanningRef.current) {
                    // A. Verrouillage immédiat
                    isScanningRef.current = true;
                    
                    const text = result.getText();
                    setScannedResult(text); // Déclenche l'affichage vert (UI)
                    
                    // B. Arrêt immédiat de la caméra (fige l'image et économise la batterie)
                    codeReader.current.reset(); 
                    
                    // C. Délai de confort (UX) :
                    // On attend 1 seconde pour laisser l'utilisateur voir "Code détecté !"
                    // avant d'envoyer la donnée au parent (qui fermera probablement la fenêtre).
                    setTimeout(() => {
                        onScan(text);
                    }, 1000);
                }
                
                // Gestion silencieuse des erreurs de frame (bruit vidéo)
                if (err && !(err instanceof NotFoundException)) {
                   // On ne fait rien ici pour ne pas spammer la console
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
      {/* --- HEADER --- */}
      <div className="flex justify-between items-center p-4 text-white bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Camera className="w-5 h-5" /> Scanner Code-Barres
        </h2>
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors active:scale-95"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* --- ZONE CAMÉRA --- */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef} 
          className="w-full h-full object-cover"
        />
        
        {/* État 1 : Recherche en cours (Pas de résultat, pas d'erreur) */}
        {!scannedResult && !error && (
            <>
                {/* Viseur visuel */}
                <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none z-10">
                    <div className="w-full max-w-sm aspect-[2/1] border-4 border-dashed border-white/80 rounded-xl shadow-sm"></div>
                </div>
                
                {/* Texte d'aide en bas */}
                <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none z-10">
                    <p className="text-white/90 text-sm font-medium bg-black/40 px-4 py-2 rounded-full inline-block backdrop-blur-md border border-white/10">
                        Placez le code dans le cadre
                    </p>
                </div>
            </>
        )}
        
        {/* État 2 : Succès (Code trouvé) */}
        {scannedResult && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20 animate-in fade-in duration-200">
                <div className="bg-white p-8 rounded-2xl shadow-2xl text-center transform scale-100 transition-all">
                    <div className="flex justify-center mb-4">
                        <CheckCircle className="w-16 h-16 text-green-500 animate-bounce" />
                    </div>
                    <p className="text-green-600 font-bold text-2xl">Code détecté !</p>
                    <p className="text-slate-500 font-mono mt-2 text-lg">{scannedResult}</p>
                </div>
             </div>
        )}

        {/* État 3 : Erreur (Problème caméra) */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/90 p-6">
             <div className="text-center text-white">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="mb-6 text-lg">{error}</p>
                <button 
                    onClick={handleRetry} 
                    className="flex items-center justify-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold mx-auto hover:bg-gray-200 transition-colors"
                >
                    <RefreshCw className="w-5 h-5" /> Réessayer
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};