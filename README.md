# NIDHI: AI-Assisted Security Deposit & FDR Lifecycle Management Portal
### All India Council for Technical Education (AICTE) • Smart India Hackathon 2026 (SIH26265)

---

## 1. Executive Summary

**NIDHI** (*National Institutional Deposit & Host Instruments*) is an enterprise-grade institutional financial document lifecycle automation platform designed for AICTE. It solves the critical problems of fragmented institution-wise Fixed Deposit Receipt (FDR) records, missed maturity and renewal deadlines, unverified FDR authenticity, delayed refund processing, manual correspondence, and lack of tamper-evident auditability.

The application features:
- **100% Offline-Capable Local Architecture**: Powered by **IndexedDB using Dexie.js**, storing all structured application records and document **Blobs natively** without requiring external cloud databases.
- **AI-Assisted Document Verification**: Integrated OCR adapter combining browser-based Tesseract.js OCR, vector extraction, and intelligent rule-based parsing with side-by-side three-way comparison matrices (Declared vs Extracted vs Findings).
- **Four Distinct Role Workflows with RBAC**: System Administrator, Accredited Institution User, Regulation Bureau Officer, and Competent Authority.
- **Append-Only Tamper-Evident Audit Trail**: Every authentication, submission, remark, transition, and approval is cryptographically chained via **SHA-256 hash links** with a built-in verification engine.
- **Configurable Maturity Monitoring**: Dynamic date calculation classifying FDRs into Active, 90-day, 60-day, 30-day, 7-day, and Overdue alert schedules.
- **Full Renewal & Release/Refund Lifecycles**: Multi-stage officer scrutiny, compliance clearances, and explicit human decision authorization generating downloadable official approval certificates.

---

## 2. Technology Stack

- **Frontend Core**: React 19, TypeScript, Vite, Tailwind CSS
- **Routing & State**: React Router v7, Zustand (Centralized RBAC state)
- **Local Persistence**: IndexedDB via Dexie.js (14 structured tables + native Blob storage)
- **Security & Hashing**: Web Crypto API (`crypto.subtle.digest` SHA-256 password hashing & audit chaining)
- **AI / OCR Engine**: Tesseract.js + Browser DOM Parser & Regex Fallback Matrix
- **Visual Analytics**: Recharts (Monthly intake trends, bank exposure concentration)
- **UI & Components**: Lucide React Icons, Canvas Confetti, Custom Accessible Dialogs & DataTables

---

## 3. Demo Accounts & Credentials

For hackathon evaluation, all demo accounts use a standard documented password:

| Role | Email Address | Password | Primary Jurisdiction |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@nidhi.local` | `password` | Central IT Governance, Officer Workload, System Settings, Audit Ledger |
| **Institution User** | `institution@nidhi.local` | `password` | Delhi Institute of Technology: FDR Submission, Renewals, Refunds |
| **Regulation Officer** | `officer@nidhi.local` | `password` | Regulation Bureau: AI Verification, Bank Confirmation, Scrutiny |
| **Competent Authority** | `authority@nidhi.local` | `password` | Executive Committee: Final Human Approval / Rejection of Releases |

> **Pro-Tip**: Use the **1-Click Hackathon Role Switcher** located on the Login Page and in the top navigation bar to seamlessly transition between roles during live demonstrations.

---

## 4. End-to-End Regulatory Workflow

```
[ Step 1: Registration ]
Admin activates Accredited Institution account in Portal Directory.
        │
        ▼
[ Step 2: FDR Submission ]
Institution enters FDR metadata and uploads certificate Blob (PDF/PNG/SVG).
System generates unique reference number (e.g. AICTE/FDR/2026/00101).
        │
        ▼
[ Step 3: AI-Assisted OCR Verification ]
Automated OCR extracts bank name, FDR number, amount, maturity, and AICTE lien clause.
Generates Confidence Score and flags discrepancies. Status: SUBMITTED.
        │
        ▼
[ Step 4: Officer Workload Allocation ]
System auto-assigns or Admin allocates application to Regulation Bureau Officer.
        │
        ▼
[ Step 5: Officer Scrutiny & Cross-Verification ]
Officer reviews side-by-side comparison matrix and uploaded instrument:
  ├─ Discrepancy Found ──► Step 6: Clarification Query issued to Institution.
  │                        Institution uploads revised certificate (RESUBMITTED).
  │
  └─ Satisfactory ──────► Step 7: Officer records direct Bank Confirmation.
                           Status transitions to VERIFIED.
        │
        ▼
[ Step 8: Maturity Radar Monitoring ]
Live date calculation engine tracks days remaining (90d, 60d, 30d, 7d).
Dispatches in-app alerts and notifications to Institution and Officers.
        │
        ▼
[ Step 9: Renewal & Replacement ]
For expiring FDRs, Institution lodges renewed certificate.
System archives original instrument and links forward to new replacement FDR.
        │
        ▼
[ Step 10: Release / Refund Application ]
Upon tenure completion or course closure, Institution requests statutory release.
        │
        ▼
[ Step 11: Officer Release Scrutiny ]
Officer verifies student caution fee clearances and academic audit reports.
Forwards formal recommendation (SCRUTINIZED).
        │
        ▼
[ Step 12: Competent Authority Human Decision ]
Member Secretary reviews case, conditions, and officer findings.
Signs decision with digital token and generates Official Approval Certificate.
        │
        ▼
[ Step 13: Lien Discharge & Closure ]
AICTE lien released at bank; FDR lifecycle updated to CLOSED.
```

---

## 5. IndexedDB Database Schema (14 Tables)

All structured data and binary documents persist locally across browser reloads:

1. `users`: Credentials, Web Crypto SHA-256 hash, roles, departments, active status.
2. `institutions`: AISHE code, accredited name, region, address, contact coordinates.
3. `fdrRecords`: Instrument numbers, principal, interest, dates, status, assigned officer, AI extraction results.
4. `documents`: File metadata and native raw **Blob** storage (no Base64 localStorage bottlenecks).
5. `verificationRecords`: OCR confidence, field-by-field matches/mismatches, officer determinations.
6. `scrutinyRemarks`: Immutable chronological officer findings and directives.
7. `clarificationRequests`: Back-and-forth query dialogs, explanations, and evidence uploads.
8. `renewalRecords`: Audit links connecting legacy matured instruments to renewed FDRs.
9. `releaseRequests`: Formal refund dockets, reasons, and statutory declarations.
10. `approvalRecords`: Competent Authority signed orders, digital tokens, condition riders.
11. `notifications`: In-app role-based alerts with unread flags and direct navigation links.
12. `auditLogs`: Append-only security ledger with sequential SHA-256 cryptographic chaining.
13. `officerAssignments`: History of workload distribution and reallocations.
14. `systemSettings`: Configurable reminder intervals, OCR confidence thresholds, organization parameters.

---

## 6. Installation & Execution Guide

### Prerequisites
- Node.js version 18+ (tested on Node v24)
- npm or pnpm

### Step 1: Install Dependencies
```bash
npm install --legacy-peer-deps
```

### Step 2: Run Automated Test Suite
Run the comprehensive 22-point end-to-end regulatory test suite:
```bash
npm test
```
*Expected Output:* `TEST RESULTS: 22 PASSED, 0 FAILED OUT OF 22 TESTS`

### Step 3: Run Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### Step 4: Build for Production
```bash
npm run build
npm run preview
```

---

## 7. Disaster Recovery & Data Management

- **Database Backup (JSON Export)**: Accessible via *System Storage > Backup & IndexedDB*. Serializes all 14 tables and document Blobs into a single structured JSON file.
- **Database Restoration (JSON Import)**: Ingests exported JSON files, clears current tables, and re-instantiates all records and binary Blobs.
- **1-Click Demo Reset**: Re-seeds pristine AICTE hackathon sample data (8 accredited institutions, 22+ FDRs across all lifecycle stages, officer assignments, and audit logs).
- **Cryptographic Audit Verification**: Accessible under *Admin > Cryptographic Audit*. Recomputes all SHA-256 block signatures sequentially from genesis to verify zero tampering.

---

## 8. SIH26265 Verification Matrix

| # | Requirement | Status | Verification Path |
| :---: | :--- | :---: | :--- |
| 1 | Working RBAC Authentication | Verified | Login as Admin, Institution, Officer, Authority |
| 2 | Persistent IndexedDB Storage | Verified | Survives full browser refresh; native Blob storage |
| 3 | AI-Assisted OCR Verification | Verified | Officer > AI Verification Studio > Comparison Matrix |
| 4 | Discrepancy Detection Engine | Verified | FDR-2026-0008 flags amount & date mismatch |
| 5 | Clarification Workflow | Verified | Officer creates query -> Institution responds -> Resubmitted |
| 6 | Bank Confirmation Separation | Verified | Officer records nodal confirmation independently of OCR |
| 7 | Dynamic Maturity Radar | Verified | Date-driven 90d, 60d, 30d, 7d classification |
| 8 | Renewal Instrument Linking | Verified | Institution > Renewal > Old FDR linked to New FDR |
| 9 | Authority Human Approval | Verified | Authority > Approvals > Signs Order > Issues Certificate |
| 10 | Cryptographic Audit Ledger | Verified | Admin > Cryptographic Audit > SHA-256 Verification |
| 11 | Institution Record Isolation | Verified | Institution cannot access another college's documents |
| 12 | CSV & PDF Print Generation | Verified | Export Master CSV & Print Statutory Certificate |

---

*Designed and developed for All India Council for Technical Education (AICTE).*
