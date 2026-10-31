import React, { useState, useEffect } from 'react';
import { documentService } from '@/services/documentService';
import { useAuthStore } from '@/store/authStore';
import { formatDateTime, formatFileSize } from '@/utils/formatters';
import { Download, ZoomIn, ZoomOut, RotateCw, FileText, AlertCircle, ShieldCheck } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { StoredDocument } from '@/types';

interface DocumentViewerProps {
  documentId?: string;
  blob?: Blob;
  fileName?: string;
  mimeType?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  blob,
  fileName,
  mimeType,
}) => {
  const { user } = useAuthStore();
  const [doc, setDoc] = useState<StoredDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let activeUrl: string | null = null;

    async function loadDoc() {
      setIsLoading(true);
      setError(null);
      try {
        if (blob) {
          activeUrl = URL.createObjectURL(blob);
          setPreviewUrl(activeUrl);
          setDoc({
            id: 'TEMP-BLOB',
            fileName: fileName || 'Document_Preview',
            fileSize: blob.size,
            mimeType: mimeType || blob.type,
            blobData: blob,
            version: 1,
            documentCategory: 'ORIGINAL_FDR',
            uploadedById: user?.id || 'ANON',
            uploadedByName: user?.name || 'Current User',
            uploadedAt: new Date().toISOString(),
            institutionId: user?.institutionId || '',
            institutionName: user?.institutionName || '',
          });
        } else if (documentId) {
          const { url, doc: loadedDoc } = await documentService.getDocumentPreviewUrl(documentId, user);
          activeUrl = url;
          setPreviewUrl(url);
          setDoc(loadedDoc);
        } else {
          setError('No document identifier provided.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve document.');
      } finally {
        setIsLoading(false);
      }
    }

    loadDoc();

    return () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [documentId, blob, fileName, mimeType, user]);

  const handleDownload = () => {
    if (!doc || !previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isLoading) {
    return <LoadingSpinner size="md" message="Decryption and loading document from IndexedDB storage..." />;
  }

  if (error || !doc || !previewUrl) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-rose-800">Document Access Error</h4>
        <p className="mt-1 text-xs text-rose-600">{error || 'Unable to display document.'}</p>
      </div>
    );
  }

  const isPdf = doc.mimeType.includes('pdf');
  const isImage = doc.mimeType.includes('image') || doc.fileName.endsWith('.svg');

  return (
    <div className="flex flex-col bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-700">
      {/* Top control bar */}
      <div className="px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span className="text-xs font-semibold truncate max-w-[220px]" title={doc.fileName}>
            {doc.fileName}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
            v{doc.version}
          </span>
          <span className="text-[10px] text-slate-400">({formatFileSize(doc.fileSize)})</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {isImage && (
            <>
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(50, z - 20))}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono px-1">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(250, z + 20))}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white ml-1"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleDownload}
            className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="relative min-h-[380px] max-h-[580px] overflow-auto flex items-center justify-center p-4 bg-slate-950/60">
        {isPdf ? (
          <iframe
            src={previewUrl}
            title={doc.fileName}
            className="w-full h-[520px] rounded border border-slate-700 bg-white"
          />
        ) : isImage ? (
          <div className="flex items-center justify-center overflow-auto max-w-full">
            <img
              src={previewUrl}
              alt={doc.fileName}
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease',
              }}
              className="max-h-[500px] object-contain rounded shadow-md border border-slate-700 bg-white"
            />
          </div>
        ) : (
          <div className="text-center p-8 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-2 text-slate-500" />
            <p className="text-sm font-medium">Binary Document Format ({doc.mimeType})</p>
            <p className="text-xs text-slate-500 mt-1">Direct in-browser renderer not available for this format.</p>
            <button
              onClick={handleDownload}
              className="mt-3 px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600"
            >
              Download to view locally
            </button>
          </div>
        )}
      </div>

      {/* Metadata strip */}
      <div className="px-4 py-2 bg-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between border-t border-slate-700">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Local IndexedDB Encrypted Document Repository</span>
        </div>
        <div>Uploaded {formatDateTime(doc.uploadedAt)} by {doc.uploadedByName}</div>
      </div>
    </div>
  );
};
