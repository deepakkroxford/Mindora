import React, { useState, useEffect, useRef } from 'react';
import {
  X, ZoomIn, ZoomOut, RotateCw, Maximize2, Download,
  FileText, Image as ImageIcon, Sparkles
} from 'lucide-react';
import type { DocumentDiagramDto } from '../types';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface DiagramLightboxModalProps {
  diagram: DocumentDiagramDto | null;
  onClose: () => void;
}

export const DiagramLightboxModal: React.FC<DiagramLightboxModalProps> = ({
  diagram,
  onClose,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset transform when diagram changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, [diagram]);

  // Keyboard shortcut support (Escape to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setZoom((prev) => Math.min(prev + 0.25, 4));
      } else if (e.key === '-') {
        setZoom((prev) => Math.max(prev - 0.25, 0.5));
      } else if (e.key === '0') {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!diagram) return null;

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.min(Math.max(prev * factor, 0.5), 4.5));
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = diagram.imageUrl;
    a.download = `Diagram_Page_${diagram.pageNumber}_${diagram.documentName || 'Document'}.png`;
    a.target = '_blank';
    a.click();
    toast.success('Downloading diagram image! 🖼️');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fade-in select-none"
    >
      {/* ── Top Header Toolbar ── */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center justify-between bg-slate-900/90 backdrop-blur-lg border border-slate-800 px-5 py-3 rounded-2xl shadow-2xl z-10 max-w-4xl w-full mx-auto"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate">
                Architecture / System Diagram
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 flex-shrink-0">
                Page {diagram.pageNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
              <FileText className="w-3 h-3 text-slate-500" />
              <span>{diagram.documentName || 'Source Document'}</span>
              {diagram.width > 0 && (
                <span className="text-slate-500">• {diagram.width} × {diagram.height} px</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setZoom((prev) => Math.min(prev + 0.25, 4))}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold px-2 text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.5))}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation((prev) => (prev + 90) % 360)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Reset View (0)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-slate-800 mx-1" />

          <button
            onClick={handleDownload}
            className="p-2 text-teal-400 hover:text-teal-300 hover:bg-teal-500/15 rounded-xl transition-colors"
            title="Download Image"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors ml-1"
            title="Close Lightbox (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Main Canvas Image Viewport ── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={(e) => e.stopPropagation()}
        className={clsx(
          'flex-1 flex items-center justify-center overflow-hidden my-4 relative',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        <img
          src={diagram.imageUrl}
          alt={diagram.caption || 'Extracted Architecture Diagram'}
          draggable={false}
          className="max-h-[75vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl transition-transform duration-75 ease-out ring-1 ring-white/10"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          }}
        />
      </div>

      {/* ── Bottom Caption Bar ── */}
      {diagram.caption && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900/90 backdrop-blur-md border border-slate-800 px-5 py-2.5 rounded-2xl shadow-2xl max-w-2xl w-full mx-auto text-center z-10"
        >
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {diagram.caption}
          </p>
        </div>
      )}
    </div>
  );
};

export default DiagramLightboxModal;
