import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { documentService } from '@/services/documentService';
import { DocumentViewer } from '@/components/document/DocumentViewer';
import { formatDateTime, formatFileSize } from '@/utils/formatters';
import { FolderLock, FileText, Download, Eye, ShieldCheck, Filter } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import type { StoredDocument } from '@/types';

export const DocumentRepositoryPage: React.FC = () => {
  const { user } = useAuthStore();
  const [documents, setDocuments] = useState<Omit<StoredDocument, 'blobData'>[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadDocuments = async () => {
    setIsLoading(true);
    // Institution isolation rule: If user is INSTITUTION, only pass user.institutionId
    const instId = user?.role === 'INSTITUTION' ? user.institutionId : undefined;
    const list = await documentService.listDocuments({
      institutionId: instId,
      category: categoryFilter === 'ALL' ? undefined : (categoryFilter as any),
    });
    setDocuments(list);
    setIsLoading(false);
  };

  useEffect(() => {
    loadDocuments();
  }, [user, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-950 tracking-tight">Encrypted Document Vault</h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized document repository storing raw binary Blobs directly inside browser IndexedDB
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Local IndexedDB Blob Storage</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Category Filter:</span>
        </div>

        <div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="ORIGINAL_FDR">Original FDR Certificates</option>
            <option value="BANK_VERIFICATION_LETTER">Bank Verification Letters</option>
            <option value="RENEWAL_FDR">Renewal Replacement Certificates</option>
            <option value="RELEASE_NOC">Release NOC Documents</option>
            <option value="CLARIFICATION_EVIDENCE">Clarification Evidence</option>
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          <FolderLock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          No documents found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        v{doc.version}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">{formatFileSize(doc.fileSize)}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-mono uppercase">
                    {doc.documentCategory.replace(/_/g, ' ')}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 truncate" title={doc.fileName}>
                  {doc.fileName}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{doc.institutionName}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatDateTime(doc.uploadedAt)}
                </span>
                <button
                  onClick={() => setSelectedDocId(doc.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-navy-900 hover:bg-navy-800 text-white transition-colors"
                >
                  <Eye className="w-3.5 h-3.5 text-teal-400" />
                  <span>View</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      <Modal
        isOpen={!!selectedDocId}
        onClose={() => setSelectedDocId(null)}
        title="Document Previewer"
        description="Encrypted binary object loaded safely from IndexedDB storage."
        maxWidth="4xl"
      >
        {selectedDocId && <DocumentViewer documentId={selectedDocId} />}
      </Modal>
    </div>
  );
};
