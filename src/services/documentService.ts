import { db } from '@/db/dexie';
import { auditService } from './auditService';
import type { StoredDocument, User } from '@/types';

export const documentService = {
  /**
   * Stores a document Blob in IndexedDB with metadata and versioning
   */
  async uploadDocument(params: {
    file: File | Blob;
    fileName: string;
    mimeType: string;
    institutionId: string;
    institutionName: string;
    fdrId?: string;
    documentCategory: StoredDocument['documentCategory'];
    uploadedBy: User;
    notes?: string;
  }): Promise<StoredDocument> {
    // Check existing documents for version increment
    let version = 1;
    if (params.fdrId) {
      const existing = await db.documents
        .where('fdrId')
        .equals(params.fdrId)
        .and(d => d.documentCategory === params.documentCategory)
        .toArray();
      if (existing.length > 0) {
        version = Math.max(...existing.map(d => d.version)) + 1;
      }
    }

    const docId = `DOC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const docRecord: StoredDocument = {
      id: docId,
      fdrId: params.fdrId,
      institutionId: params.institutionId,
      institutionName: params.institutionName,
      fileName: params.fileName,
      fileSize: params.file.size,
      mimeType: params.mimeType,
      blobData: params.file, // Natively stored as Blob in IndexedDB
      version,
      documentCategory: params.documentCategory,
      uploadedById: params.uploadedBy.id,
      uploadedByName: params.uploadedBy.name,
      uploadedAt: new Date().toISOString(),
      notes: params.notes,
    };

    await db.documents.add(docRecord);

    await auditService.log({
      userId: params.uploadedBy.id,
      userName: params.uploadedBy.name,
      userRole: params.uploadedBy.role,
      institutionId: params.institutionId,
      action: 'DOCUMENT_UPLOADED',
      category: 'DOCUMENT',
      relatedRecordId: docId,
      description: `Uploaded document ${params.fileName} (v${version}) under ${params.documentCategory}.`,
    });

    return docRecord;
  },

  /**
   * Retrieves a document with strict RBAC validation
   */
  async getDocument(docId: string, currentUser?: User | null): Promise<StoredDocument> {
    const doc = await db.documents.get(docId);
    if (!doc) {
      throw new Error('Document not found in storage.');
    }

    // Role-based access validation:
    // If user is INSTITUTION, cannot view documents belonging to another institution!
    if (currentUser && currentUser.role === 'INSTITUTION') {
      if (doc.institutionId !== currentUser.institutionId) {
        throw new Error('Unauthorized Access: Institutions are strictly prohibited from viewing documents of other institutions.');
      }
    }

    return doc;
  },

  /**
   * Generates a temporary object URL for previewing the Blob
   */
  async getDocumentPreviewUrl(docId: string, currentUser?: User | null): Promise<{ url: string; doc: StoredDocument }> {
    const doc = await this.getDocument(docId, currentUser);
    const url = URL.createObjectURL(doc.blobData);
    return { url, doc };
  },

  /**
   * Downloads a document directly to the client machine
   */
  async downloadDocument(docId: string, currentUser?: User | null): Promise<void> {
    const { url, doc } = await this.getDocumentPreviewUrl(docId, currentUser);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  },

  /**
   * Lists documents with optional filter for institution and fdr
   */
  async listDocuments(filters?: {
    institutionId?: string;
    fdrId?: string;
    category?: StoredDocument['documentCategory'];
  }): Promise<Omit<StoredDocument, 'blobData'>[]> {
    let docs = await db.documents.toArray();

    if (filters?.institutionId) {
      docs = docs.filter(d => d.institutionId === filters.institutionId);
    }
    if (filters?.fdrId) {
      docs = docs.filter(d => d.fdrId === filters.fdrId);
    }
    if (filters?.category) {
      docs = docs.filter(d => d.documentCategory === filters.category);
    }

    // Return without loading large Blobs into memory for listings
    return docs.map(({ blobData, ...rest }) => rest);
  },
};
