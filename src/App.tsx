import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Download, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Point {
  x: number;
  y: number;
}

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [frame, setFrame] = useState<string>('/frame.png');
  const [frameError, setFrameError] = useState<boolean>(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frameInputRef = useRef<HTMLInputElement>(null);

  const handleFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setFrame(readerEvent.target?.result as string);
        setFrameError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const frameImgRef = useRef<HTMLImageElement | null>(null);
  const userImgRef = useRef<HTMLImageElement | null>(null);

  // Pre-load images whenever the source changes
  useEffect(() => {
    if (frame) {
      const img = new Image();
      img.src = frame;
      img.onload = () => {
        console.log("Frame loaded successfully");
        frameImgRef.current = img;
        setFrameError(false);
        renderCanvas();
      };
      img.onerror = () => {
        console.error("Failed to load frame from:", frame);
        setFrameError(true);
      };
    }
  }, [frame]);

  useEffect(() => {
    if (image) {
      const img = new Image();
      img.src = image;
      img.onload = () => {
        console.log("User image loaded successfully");
        userImgRef.current = img;
        renderCanvas();
      };
      img.onerror = () => {
        console.error("Failed to load user image");
      };
    } else {
      userImgRef.current = null;
      renderCanvas();
    }
  }, [image]);

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw User Image (Background)
    if (userImgRef.current) {
      const img = userImgRef.current;
      const aspect = img.width / img.height;
      let drawW = canvas.width * scale;
      let drawH = (canvas.width / aspect) * scale;
      
      ctx.save();
      ctx.translate(canvas.width / 2 + position.x, canvas.height / 2 + position.y);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else if (!isCameraActive) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 32px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      ctx.fillText('Unggah Foto Anda', canvas.width / 2, canvas.height / 2);
    }

    // 2. Draw Frame (Foreground)
    if (frameImgRef.current) {
      ctx.drawImage(frameImgRef.current, 0, 0, canvas.width, canvas.height);
    }
  };

  // Re-render when position or scale changes (from dragging/zooming)
  useEffect(() => {
    renderCanvas();
  }, [scale, position, isCameraActive]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setImage(readerEvent.target?.result as string);
        setPosition({ x: 0, y: 0 });
        setScale(1);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCameraActive(false);
      alert("Tidak dapat mengakses kamera");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      const ctx = tempCanvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      setImage(tempCanvas.toDataURL('image/jpeg'));
      
      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;
    
    if ('touches' in e && e.touches.length === 2) {
      setIsDragging(false);
      setLastTouchDistance(getDistance(e.touches));
      return;
    }

    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;

    if ('touches' in e && e.touches.length === 2 && lastTouchDistance !== null) {
      const currentDistance = getDistance(e.touches);
      const delta = currentDistance / lastTouchDistance;
      // Gently scale based on delta
      setScale(prev => Math.min(Math.max(0.1, prev * delta), 5));
      setLastTouchDistance(currentDistance);
      return;
    }

    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setLastTouchDistance(null);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'my-twibbon.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const resetEditor = () => {
    setImage(null);
    setPosition({ x: 0, y: 0 });
    setScale(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 sm:p-8">
      {/* Header Bento Card */}
      <header className="max-w-7xl mx-auto mb-6 bento-card p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Camera className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl tracking-tight text-slate-800">TwibbonMakerPanbit</h1>
            <p className="text-sm font-medium text-slate-500">Cepat, Mudah, & Berkualitas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => frameInputRef.current?.click()}
            className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-sm transition-all"
          >
            Ganti Bingkai
          </button>
          <button 
            onClick={resetEditor}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-all"
            title="Reset"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <input 
            ref={frameInputRef}
            type="file" 
            accept="image/*" 
            onChange={handleFrameUpload} 
            className="hidden" 
          />
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Main Canvas Area Card (Editor Preview) */}
        <section className="bento-card overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-500 tracking-wide uppercase">Editor Preview</span>
            </div>
          </div>

          <div className="flex-grow flex items-center justify-center p-6 sm:p-12 bg-slate-50 canvas-bg">
            <div 
              className="relative w-full aspect-square max-w-[500px] bg-white shadow-2xl rounded-2xl overflow-hidden cursor-move touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
            >
              <canvas 
                ref={canvasRef} 
                width={1000} 
                height={1000} 
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {frameError && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-3 py-1 rounded-full font-bold shadow-lg">
                  Bingkai Gagal Dimuat
                </div>
              )}

              {isCameraActive && (
                <div className="absolute inset-0 bg-black">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                    <button 
                      onClick={capturePhoto}
                      className="w-16 h-16 bg-white rounded-full border-4 border-white/30 active:scale-95 transition-transform shadow-2xl"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Download Bar */}
          <AnimatePresence>
            {image && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-6 bg-white border-t border-slate-100 flex items-center justify-center"
              >
                <button 
                  onClick={downloadImage}
                  className="flex items-center gap-3 bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 w-full sm:w-auto"
                >
                  <Download className="w-6 h-6" />
                  SIMPAN & DOWNLOAD
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Conditional Steps */}
        <AnimatePresence mode="wait">
          {!image ? (
            /* Step 1: Input Card */
            <motion.section 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bento-card p-8 flex flex-col sm:flex-row items-center gap-8"
            >
              <div className="flex-1">
                <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3">Langkah 1</span>
                <h2 className="text-2xl font-bold text-slate-800">Pilih Foto Anda</h2>
                <p className="text-slate-500 text-sm mt-2 max-w-sm">Unggah foto terbaikmu atau gunakan kamera untuk mulai membuat twibbon keren hari ini.</p>
              </div>

              <div className="flex flex-col gap-3 w-full sm:w-72">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative w-full py-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-3xl flex flex-col items-center justify-center gap-2 text-blue-700 transition-all hover:bg-blue-100/50 hover:border-blue-300"
                >
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-bold text-sm">Pilih File Foto</span>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </button>

                <button 
                  onClick={startCamera}
                  className="w-full py-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-3 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
                >
                  <Camera className="w-5 h-5 opacity-70" />
                  Gunakan Kamera
                </button>
              </div>
            </motion.section>
          ) : (
            /* Step 2: Controls Card */
            <motion.section 
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bento-card p-8 flex flex-col lg:flex-row gap-8"
            >
              <div className="flex-1">
                <span className="inline-block px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3">Langkah 2</span>
                <h2 className="text-2xl font-bold text-slate-800">Sesuaikan Foto</h2>
                <p className="text-slate-500 text-sm mt-2">Gunakan kontrol di samping untuk mengatur ukuran dan posisi foto agar pas dalam bingkai.</p>
              </div>

              <div className="flex-1 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm font-bold text-slate-700">
                    <span>Ukuran (Zoom)</span>
                    <span className="text-blue-600">{(scale * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.01"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between gap-2">
                    <button 
                      onClick={() => setScale(Math.max(0.1, scale - 0.1))}
                      className="flex-1 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <ZoomOut className="w-4 h-4 mr-2" /> Kecil
                    </button>
                    <button 
                      onClick={() => setScale(scale + 0.1)}
                      className="flex-1 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs flex items-center justify-center hover:bg-slate-100 transition-colors"
                    >
                      <ZoomIn className="w-4 h-4 mr-2" /> Besar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setPosition({ x: 0, y: 0 })}
                    className="col-span-2 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    <Move className="w-4 h-4 mr-2" /> Reset Posisi
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs flex items-center justify-center hover:bg-slate-100 transition-colors"
                  >
                    Ganti Foto
                  </button>
                  <button 
                    onClick={resetEditor}
                    className="py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-bold text-xs flex items-center justify-center hover:bg-slate-100 transition-colors text-red-500"
                  >
                    Selesai
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 py-8 text-center text-slate-400">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Twibbonize Lite &copy; 2026 Powered BY TU Panbit</p>
      </footer>
    </div>
  );
}
