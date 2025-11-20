import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Check, Loader2, Zap } from 'lucide-react';
import { identifyEquipmentFromImage } from '../services/geminiService';
import { EquipmentType } from '../types';

interface ScannerAIProps {
  onClose: () => void;
  onIdentified: (type: EquipmentType, condition: string) => void;
}

export const ScannerAI: React.FC<ScannerAIProps> = ({ onClose, onIdentified }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setPermissionError(true);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setAnalyzing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', 0.7); // Compress slightly
      
      const result = await identifyEquipmentFromImage(base64);
      
      if (result.type) {
        onIdentified(result.type, result.condition);
        onClose();
      } else {
        alert("Impossible d'identifier l'objet. Réessayez avec un meilleur éclairage.");
      }
    }
    setAnalyzing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      <div className="relative flex-1 bg-black">
        {permissionError ? (
          <div className="absolute inset-0 flex items-center justify-center text-white p-6 text-center">
            <p>L'accès à la caméra est requis pour le scan IA.</p>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Overlay UI */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/70 to-transparent text-white">
            <div className="flex justify-between items-start pointer-events-auto">
              <button onClick={onClose} className="p-2 bg-white/20 rounded-full backdrop-blur-md">
                <X className="w-6 h-6" />
              </button>
              <div className="bg-fire-600/90 px-3 py-1 rounded-full flex items-center gap-2 backdrop-blur-sm">
                <Zap className="w-4 h-4" />
                <span className="text-xs font-bold tracking-wide">GEMINI VISION</span>
              </div>
            </div>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white/50 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-fire-500 rounded-tl-xl -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-fire-500 rounded-tr-xl -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-fire-500 rounded-bl-xl -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-fire-500 rounded-br-xl -mb-1 -mr-1"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 p-6 pb-10 rounded-t-3xl -mt-6 relative z-10">
        <div className="flex flex-col items-center gap-4">
          <p className="text-slate-400 text-sm font-medium">Cadrez l'équipement EPI pour identification automatique</p>
          
          <button 
            onClick={captureAndAnalyze}
            disabled={analyzing || !isStreaming}
            className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-xl shadow-fire-900/20 active:scale-95 transition-all border-4 border-slate-200"
          >
            {analyzing ? (
              <Loader2 className="w-8 h-8 text-fire-600 animate-spin" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-fire-600 border-4 border-white"></div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};