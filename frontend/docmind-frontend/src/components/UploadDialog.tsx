import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  X, Upload, FileText, CheckCircle, AlertCircle, Loader2, Plus,
  File, FileImage, FileCode, FilePieChart, Trash2, Sparkles,
} from 'lucide-react';
import { documentApi } from '../services/api';
import { useApp } from '../context/AppContext';
import type { UploadingFile } from '../types';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/csv': ['.csv'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-400" />;
  if (ext === 'csv') return <FilePieChart className="w-4 h-4 text-emerald-400" />;
  if (ext === 'md') return <FileCode className="w-4 h-4 text-teal-400" />;
  if (ext === 'docx') return <FileImage className="w-4 h-4 text-sky-400" />;
  return <File className="w-4 h-4 text-slate-400" />;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ isOpen, onClose }) => {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { fetchDocuments } = useApp();

  const onDrop = useCallback((accepted: File[]) => {
    const newFiles: UploadingFile[] = accepted.map((f) => ({
      id: crypto.randomUUID(),
      file: f,
      progress: 0,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (pending.length === 0) return;
    setIsUploading(true);

    await Promise.all(
      pending.map(async (uf) => {
        setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, status: 'uploading' } : f)));
        try {
          const res = await documentApi.upload(uf.file, (pct) => {
            setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, progress: pct } : f)));
          });
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uf.id ? { ...f, status: 'done', progress: 100, result: res.data } : f
            )
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setFiles((prev) => prev.map((f) => (f.id === uf.id ? { ...f, status: 'error', error: msg } : f)));
        }
      })
    );

    setIsUploading(false);
    await fetchDocuments();
    const successCount = files.filter((f) => f.status !== 'error').length;
    if (successCount > 0) toast.success(`${successCount} document(s) indexed successfully`);
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      onClose();
    }
  };

  const allDone = files.length > 0 && files.every((f) => f.status === 'done' || f.status === 'error');
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={handleClose} />

      {/* Dialog Card */}
      <div className="relative z-10 w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl shadow-black/60 animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0b0f19]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-500/15 border border-teal-500/25 rounded-xl flex items-center justify-center shadow-sm">
              <Upload className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Upload Knowledge Files</h2>
              <p className="text-[11px] text-slate-400">PDF · DOCX · TXT · MD · CSV</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-1.5 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drop zone */}
        <div className="p-5">
          <div
            {...getRootProps()}
            className={clsx(
              'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 overflow-hidden group',
              isDragActive
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-slate-700/80 hover:border-teal-500/50 bg-slate-900/40 hover:bg-slate-900/80'
            )}
          >
            <input {...getInputProps()} />
            <div className="relative flex flex-col items-center gap-3">
              <div className={clsx(
                'w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-inner',
                isDragActive ? 'bg-teal-500/25 scale-110' : 'bg-slate-800/80 group-hover:scale-105'
              )}>
                <Upload className={clsx('w-6 h-6 transition-colors', isDragActive ? 'text-teal-300' : 'text-slate-400 group-hover:text-teal-400')} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {isDragActive ? '✨ Drop files to index' : 'Drag & drop documents here'}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  or <span className="text-teal-400 hover:underline">browse files</span> from your computer
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center mt-1">
                {[
                  { ext: 'PDF', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
                  { ext: 'DOCX', color: 'text-sky-400 bg-sky-400/10 border-sky-400/20' },
                  { ext: 'TXT', color: 'text-slate-300 bg-slate-400/10 border-slate-400/20' },
                  { ext: 'MD', color: 'text-teal-400 bg-teal-400/10 border-teal-400/20' },
                  { ext: 'CSV', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
                ].map(({ ext, color }) => (
                  <span key={ext} className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium border font-mono', color)}>
                    .{ext.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          {files.length > 0 && (
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-xs text-slate-400 font-medium">{files.length} file(s) selected ({formatBytes(totalSize)})</span>
              <button
                onClick={() => setFiles([])}
                disabled={isUploading}
                className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors disabled:opacity-40"
              >
                <Trash2 className="w-3 h-3" /> Clear list
              </button>
            </div>
          )}

          {/* Uploading File Items */}
          {files.length > 0 && (
            <div className="mt-2 space-y-2 max-h-52 overflow-y-auto pr-1">
              {files.map((uf) => (
                <div key={uf.id} className="flex items-center gap-3 p-3 bg-slate-900/80 rounded-2xl border border-slate-800">
                  <div className="p-2 bg-slate-800 rounded-xl flex-shrink-0">
                    {getFileIcon(uf.file.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-white font-medium truncate max-w-[200px]">{uf.file.name}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span className="text-[11px] text-slate-400">{formatBytes(uf.file.size)}</span>
                        {uf.status === 'pending' && (
                          <button onClick={() => removeFile(uf.id)} className="text-slate-500 hover:text-rose-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {uf.status === 'uploading' && <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />}
                        {uf.status === 'done' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                        {uf.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-1">
                      <div
                        className={clsx(
                          'h-1 rounded-full transition-all duration-300',
                          uf.status === 'done' ? 'bg-emerald-500' :
                          uf.status === 'error' ? 'bg-rose-500' :
                          uf.status === 'uploading' ? 'bg-teal-500' : 'bg-slate-800'
                        )}
                        style={{ width: uf.status === 'pending' ? '0%' : `${uf.progress}%` }}
                      />
                    </div>
                    {uf.status === 'error' && (
                      <p className="text-[11px] text-rose-400 mt-1">{uf.error}</p>
                    )}
                    {uf.status === 'done' && uf.result && (
                      <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                        ✓ {uf.result.chunksCreated ?? 0} vector chunks embedded
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-800/80 bg-[#0b0f19]/80">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 rounded-xl transition-colors disabled:opacity-50"
          >
            {allDone ? 'Done' : 'Cancel'}
          </button>
          {!allDone && (
            <button
              onClick={handleUpload}
              disabled={isUploading || pendingCount === 0}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-cyan-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-teal-600/20 active:scale-[0.98]"
            >
              {isUploading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Indexing Documents…</>
              ) : (
                <><Plus className="w-3.5 h-3.5" /> Start Upload ({pendingCount})</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadDialog;
