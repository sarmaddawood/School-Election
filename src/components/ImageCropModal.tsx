import React, { useState, useCallback, useRef } from "react";
import Cropper, { Point, Area } from "react-easy-crop";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Upload, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Check, 
  Image as ImageIcon,
  Camera,
  RefreshCw
} from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCropSave: (croppedDataUrl: string, fileBlob?: Blob) => Promise<void>;
  title?: string;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<{ dataUrl: string; blob: Blob }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("No 2d context");

  const rotRad = (rotation * Math.PI) / 180;

  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement("canvas");
  const croppedCtx = croppedCanvas.getContext("2d");

  if (!croppedCtx) throw new Error("No cropped 2d context");

  // Output resolution (400x400 for smooth profile picture)
  const outputSize = 400;
  croppedCanvas.width = outputSize;
  croppedCanvas.height = outputSize;

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        const dataUrl = croppedCanvas.toDataURL("image/jpeg", 0.92);
        resolve({ dataUrl, blob });
      },
      "image/jpeg",
      0.92
    );
  });
}

export default function ImageCropModal({
  isOpen,
  onClose,
  onCropSave,
  title = "Crop Profile Picture",
}: ImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setImageSrc(reader.result as string);
        setZoom(1);
        setRotation(0);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          setImageSrc(reader.result as string);
          setZoom(1);
          setRotation(0);
        });
        reader.readAsDataURL(file);
      }
    }
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsSaving(true);
    try {
      const { dataUrl, blob } = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      await onCropSave(dataUrl, blob);
      handleResetAndClose();
    } catch (err) {
      console.error("Error cropping image:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetAndClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#1A2B48] border border-slate-700/80 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-white"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700/80 flex items-center justify-between bg-[#132238]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Camera size={18} />
            </div>
            <h3 className="font-display font-bold text-base uppercase tracking-wider text-white">
              {title}
            </h3>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {!imageSrc ? (
            /* Upload drop zone */
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  dragOver
                    ? "border-blue-400 bg-blue-500/10"
                    : "border-slate-700 bg-[#132238] hover:border-blue-500/50 hover:bg-[#162740]"
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center shadow-inner">
                  <Upload size={26} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-wider">
                    Select or Drop Photo Here
                  </p>
                  <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
                    Supports JPG, PNG, WEBP files
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Cropper Area */
            <div className="space-y-4">
              <div className="relative w-full h-72 rounded-2xl overflow-hidden bg-black/90 border border-slate-700">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={1}
                  cropShape="round"
                  showGrid={true}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  classes={{
                    containerClassName: "rounded-2xl",
                  }}
                />
              </div>

              {/* Controls */}
              <div className="bg-[#132238] p-4 rounded-xl border border-slate-700/80 space-y-3">
                {/* Zoom */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1 font-bold w-16">
                    <ZoomIn size={14} /> Zoom:
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>

                {/* Rotate */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                    <RotateCw size={14} /> Rotate:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCw size={12} /> +90°
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageSrc(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Change File
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/80 bg-[#132238] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleResetAndClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          {imageSrc && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-lg"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Check size={14} /> Apply Cropped Photo
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
