import { db } from './dexie';
import { hashPassword, computeAuditHash } from './crypto';
import type {
  User,
  Institution,
  FDRRecord,
  StoredDocument,
  VerificationRecord,
  ScrutinyRemark,
  ClarificationRequest,
  ReleaseRequest,
  ApprovalRecord,
  NotificationItem,
  AuditLog,
  OfficerAssignment,
  SystemSettings,
} from '@/types';

export const DEMO_PASSWORD = 'password';

// Helper to create sample FDR receipt image blob for testing document viewer and OCR
export function createSampleFdrBlob(fdrNumber: string, bank: string, holder: string, amount: string): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500" style="background:#ffffff; font-family:sans-serif;">
    <rect x="15" y="15" width="770" height="470" fill="#fffdfa" stroke="#0B2545" stroke-width="4" stroke-dasharray="8 4" rx="10"/>
    <rect x="25" y="25" width="750" height="450" fill="none" stroke="#134074" stroke-width="1.5" rx="8"/>
    
    <text x="400" y="70" font-size="24" font-weight="bold" fill="#0B2545" text-anchor="middle">${bank.toUpperCase()}</text>
    <text x="400" y="95" font-size="14" fill="#4B5563" text-anchor="middle">RETAIL BANKING DIVISION • FIXED DEPOSIT RECEIPT</text>
    <line x1="50" y1="115" x2="750" y2="115" stroke="#CBD5E1" stroke-width="2"/>
    
    <text x="60" y="150" font-size="14" font-weight="600" fill="#1F2937">FDR NUMBER:</text>
    <text x="220" y="150" font-size="16" font-weight="bold" fill="#0F766E">${fdrNumber}</text>
    
    <text x="480" y="150" font-size="14" font-weight="600" fill="#1F2937">DEPOSIT TYPE:</text>
    <text x="620" y="150" font-size="14" fill="#1F2937">JOINT SECURITY DEPOSIT</text>
    
    <text x="60" y="190" font-size="14" font-weight="600" fill="#1F2937">DEPOSITOR NAME:</text>
    <text x="220" y="190" font-size="15" font-weight="bold" fill="#111827">${holder}</text>
    
    <text x="60" y="230" font-size="14" font-weight="600" fill="#1F2937">JOINT HOLDER:</text>
    <text x="220" y="230" font-size="14" fill="#374151">Regional Officer, AICTE (Statutory Authority)</text>
    
    <text x="60" y="270" font-size="14" font-weight="600" fill="#1F2937">PRINCIPAL AMOUNT:</text>
    <text x="220" y="270" font-size="18" font-weight="bold" fill="#0B2545">INR ${amount}</text>
    
    <text x="480" y="270" font-size="14" font-weight="600" fill="#1F2937">INTEREST RATE:</text>
    <text x="620" y="270" font-size="15" font-weight="bold" fill="#047857">7.25% p.a.</text>
    
    <text x="60" y="310" font-size="14" font-weight="600" fill="#1F2937">ISSUE DATE:</text>
    <text x="220" y="310" font-size="14" fill="#374151">15-01-2023</text>
    
    <text x="480" y="310" font-size="14" font-weight="600" fill="#1F2937">MATURITY DATE:</text>
    <text x="620" y="310" font-size="15" font-weight="bold" fill="#DC2626">15-01-2028</text>
    
    <rect x="50" y="350" width="700" height="60" fill="#F0FDF4" stroke="#BBF7D0" rx="6"/>
    <text x="70" y="375" font-size="12" font-weight="bold" fill="#166534">LIEN CLAUSE: NON-ENCASHABLE WITHOUT PRIOR NOC FROM ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</text>
    <text x="70" y="395" font-size="11" fill="#15803D">Auto-renewal upon maturity mandated under AICTE Approval Process Handbook Regulations.</text>
    
    <line x1="550" y1="450" x2="720" y2="450" stroke="#374151" stroke-width="1.5"/>
    <text x="635" y="465" font-size="12" fill="#4B5563" text-anchor="middle">Authorized Bank Signatory</text>
  </svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

export async function seedDatabase(force: boolean = false): Promise<void> {
  const existingUsers = await db.users.count();
  if (existingUsers > 0 && !force) {
    return; // Already seeded
  }

  // Clear existing if force reset
  if (force) {
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        await table.clear();
      }
    });
  }

  const defaultPasswordHash = await hashPassword(DEMO_PASSWORD);
  const now = new Date().toISOString();

  // 1. SYSTEM SETTINGS
  const defaultSettings: SystemSettings = {
    id: 'SETTINGS-01',
    reminderIntervalsDays: [90, 60, 30, 7],
    autoAssignmentEnabled: true,
    ocrConfidenceThreshold: 75,
    allowInstitutionDrafts: true,
    portalMaintenanceMode: false,
    organizationName: 'All India Council for Technical Education (AICTE)',
    portalVersion: '2.4.0 (SIH26265)',
    updatedAt: now,
    updatedBy: 'SYSTEM',
  };
  await db.systemSettings.put(defaultSettings);

  // 2. INSTITUTIONS (8 realistic institutions across India)
  const institutions: Institution[] = [
    {
      id: 'INST-101',
      code: 'AICTE-DEL-101',
      name: 'Delhi Institute of Engineering & Technology',
      type: 'SELF_FINANCING',
      region: 'NORTH',
      state: 'Delhi',
      city: 'New Delhi',
      address: 'Plot 12, Institutional Area, Sector 62, New Delhi 110092',
      contactPerson: 'Dr. Rajesh Sharma',
      email: 'institution@nidhi.local', // Main demo institution
      phone: '+91 9811023456',
      approvalYear: 2012,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'INST-102',
      code: 'AICTE-MAH-102',
      name: 'Mumbai Polytechnic & Advanced Technology Campus',
      type: 'AIDED',
      region: 'WEST',
      state: 'Maharashtra',
      city: 'Mumbai',
      address: 'Vidyavihar East, Mumbai 400077',
      contactPerson: 'Prof. Ananya Deshmukh',
      email: 'contact@mumbaipoly.edu.in',
      phone: '+91 9822034567',
      approvalYear: 2008,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'INST-103',
      code: 'AICTE-BLR-103',
      name: 'Karnataka Academy of Technical Studies',
      type: 'SELF_FINANCING',
      region: 'SOUTH',
      state: 'Karnataka',
      city: 'Bengaluru',
      address: 'Whitefield Main Road, Bengaluru 560066',
      contactPerson: 'Dr. Venkatesh Murthy',
      email: 'registrar@kats-blr.ac.in',
      phone: '+91 9845012345',
      approvalYear: 2015,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'INST-104',
      code: 'AICTE-TN-104',
      name: 'Chennai Institute of Management and Technology',
      type: 'SELF_FINANCING',
      region: 'SOUTH',
      state: 'Tamil Nadu',
      city: 'Chennai',
      address: 'OMR Road, Sholinganallur, Chennai 600119',
      contactPerson: 'Mrs. S. Meenakshi',
      email: 'admin@cimt.edu.in',
      phone: '+91 9841056789',
      approvalYear: 2016,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'INST-105',
      code: 'AICTE-WB-105',
      name: 'Bengal College of Engineering & Research',
      type: 'AIDED',
      region: 'EAST',
      state: 'West Bengal',
      city: 'Kolkata',
      address: 'Salt Lake Sector V, Kolkata 700091',
      contactPerson: 'Dr. Subir Bannerjee',
      email: 'office@bcer-kolkata.org',
      phone: '+91 9830067890',
      approvalYear: 2010,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'INST-106',
      code: 'AICTE-UP-106',
      name: 'Lucknow Institute of Pharmaceutical Sciences',
      type: 'SELF_FINANCING',
      region: 'NORTH',
      state: 'Uttar Pradesh',
      city: 'Lucknow',
      address: 'Kursi Road, Jankipuram, Lucknow 226021',
      contactPerson: 'Dr. Manoj Tiwari',
      email: 'principal@lips-up.ac.in',
      phone: '+91 9415089123',
      approvalYear: 2018,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'INST-107',
      code: 'AICTE-MP-107',
      name: 'Bhopal Institute of Technical Education',
      type: 'SELF_FINANCING',
      region: 'CENTRAL',
      state: 'Madhya Pradesh',
      city: 'Bhopal',
      address: 'Kolar Road, Bhopal 462042',
      contactPerson: 'Prof. Sunita Verma',
      email: 'info@bite-bhopal.edu.in',
      phone: '+91 9893045612',
      approvalYear: 2014,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'INST-108',
      code: 'AICTE-GUJ-108',
      name: 'Gujarat Technological Institute of Architecture',
      type: 'SELF_FINANCING',
      region: 'WEST',
      state: 'Gujarat',
      city: 'Ahmedabad',
      address: 'SG Highway, Bodakdev, Ahmedabad 380054',
      contactPerson: 'Ar. Harshil Patel',
      email: 'dean@gtia-ahd.ac.in',
      phone: '+91 9825012987',
      approvalYear: 2017,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
  await db.institutions.bulkPut(institutions);

  // 3. USERS (Admin, Institution, Officer, Authority + extras)
  const users: User[] = [
    {
      id: 'USER-ADMIN-01',
      name: 'Dr. Arvind Kumar',
      email: 'admin@nidhi.local',
      passwordHash: defaultPasswordHash,
      role: 'ADMIN',
      department: 'Central Administration & Governance',
      designation: 'System Administrator & IT Director',
      phone: '+91 9910011001',
      isActive: true,
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'USER-INST-01',
      name: 'Dr. Rajesh Sharma (Registrar)',
      email: 'institution@nidhi.local',
      passwordHash: defaultPasswordHash,
      role: 'INSTITUTION',
      institutionId: 'INST-101',
      institutionName: 'Delhi Institute of Engineering & Technology',
      department: 'Academic Administration',
      designation: 'Registrar',
      phone: '+91 9811023456',
      isActive: true,
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'USER-OFFICER-01',
      name: 'Sh. Vikramaditya Rathore',
      email: 'officer@nidhi.local',
      passwordHash: defaultPasswordHash,
      role: 'OFFICER',
      department: 'Regulation Bureau - Financial Scrutiny Cell',
      designation: 'Deputy Director (Regulation)',
      phone: '+91 9810099887',
      isActive: true,
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'USER-OFFICER-02',
      name: 'Smt. Priyadarshini Rao',
      email: 'officer.south@nidhi.local',
      passwordHash: defaultPasswordHash,
      role: 'OFFICER',
      department: 'Regional Office (South) Scrutiny Cell',
      designation: 'Assistant Director (Finance)',
      phone: '+91 9845099887',
      isActive: true,
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'USER-AUTH-01',
      name: 'Prof. (Dr.) T. G. Sitharam',
      email: 'authority@nidhi.local',
      passwordHash: defaultPasswordHash,
      role: 'AUTHORITY',
      department: 'AICTE Executive Committee',
      designation: 'Competent Authority / Member Secretary',
      phone: '+91 9999012345',
      isActive: true,
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
    },
  ];
  await db.users.bulkPut(users);

  // 4. DOCUMENTS & 20+ FDR RECORDS
  // We'll generate realistic FDRs across various states (Active, Expiring in 90d, 60d, 30d, 7d, Matured, Clarification, Release pending, Approved)
  const fdrList: FDRRecord[] = [];
  const docList: StoredDocument[] = [];
  const remarksList: ScrutinyRemark[] = [];
  const clarifList: ClarificationRequest[] = [];
  const releaseList: ReleaseRequest[] = [];
  const approvalList: ApprovalRecord[] = [];
  const assignmentList: OfficerAssignment[] = [];
  const notifList: NotificationItem[] = [];

  // Helper date generators relative to today
  const addDays = (d: number) => {
    const date = new Date();
    date.setDate(date.getDate() + d);
    return date.toISOString().split('T')[0];
  };
  const subDays = (d: number) => {
    const date = new Date();
    date.setDate(date.getDate() - d);
    return date.toISOString().split('T')[0];
  };

  const sampleConfigs = [
    // 1: Verified & Active (Expiring in 700 days)
    {
      id: 'FDR-2026-0001',
      ref: 'AICTE/FDR/2026/00101',
      inst: institutions[0],
      bank: 'State Bank of India',
      branch: 'Sector 62 Noida Branch',
      fdrNum: 'SBI-FDR-98124501',
      amount: 1500000,
      rate: 7.1,
      issue: subDays(400),
      maturity: addDays(695),
      status: 'VERIFIED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'JOINT_FDR' as const,
    },
    // 2: Expiring within 7 days!
    {
      id: 'FDR-2026-0002',
      ref: 'AICTE/FDR/2026/00102',
      inst: institutions[0],
      bank: 'Punjab National Bank',
      branch: 'Connaught Place New Delhi',
      fdrNum: 'PNB-FDR-55441122',
      amount: 2500000,
      rate: 7.25,
      issue: subDays(1820),
      maturity: addDays(5),
      status: 'RENEWAL_PENDING' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'SECURITY_DEPOSIT' as const,
    },
    // 3: Expiring within 30 days
    {
      id: 'FDR-2026-0003',
      ref: 'AICTE/FDR/2026/00103',
      inst: institutions[0],
      bank: 'Canara Bank',
      branch: 'Laxmi Nagar Delhi',
      fdrNum: 'CAN-FDR-33221199',
      amount: 1000000,
      rate: 6.9,
      issue: subDays(1065),
      maturity: addDays(22),
      status: 'VERIFIED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'JOINT_FDR' as const,
    },
    // 4: Expiring within 60 days
    {
      id: 'FDR-2026-0004',
      ref: 'AICTE/FDR/2026/00104',
      inst: institutions[1],
      bank: 'Bank of Baroda',
      branch: 'Vidyavihar Mumbai',
      fdrNum: 'BOB-FDR-77889900',
      amount: 3500000,
      rate: 7.3,
      issue: subDays(1050),
      maturity: addDays(45),
      status: 'VERIFIED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'PERFORMANCE_GUARANTEE' as const,
    },
    // 5: Expiring within 90 days
    {
      id: 'FDR-2026-0005',
      ref: 'AICTE/FDR/2026/00105',
      inst: institutions[2],
      bank: 'Union Bank of India',
      branch: 'Whitefield Bengaluru',
      fdrNum: 'UBI-FDR-44556677',
      amount: 2000000,
      rate: 7.0,
      issue: subDays(1015),
      maturity: addDays(80),
      status: 'VERIFIED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[3],
      bankConfirmed: true,
      depositType: 'JOINT_FDR' as const,
    },
    // 6: Already Matured
    {
      id: 'FDR-2026-0006',
      ref: 'AICTE/FDR/2026/00106',
      inst: institutions[3],
      bank: 'Indian Bank',
      branch: 'Adyar Chennai',
      fdrNum: 'INDB-FDR-11223344',
      amount: 1500000,
      rate: 6.8,
      issue: subDays(1850),
      maturity: subDays(25),
      status: 'MATURED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[3],
      bankConfirmed: true,
      depositType: 'ENDOWMENT_FUND' as const,
    },
    // 7: Newly Submitted (Needs AI Verification & Assignment)
    {
      id: 'FDR-2026-0007',
      ref: 'AICTE/FDR/2026/00107',
      inst: institutions[0],
      bank: 'HDFC Bank Ltd',
      branch: 'Preet Vihar Delhi',
      fdrNum: 'HDFC-FDR-99001122',
      amount: 5000000,
      rate: 7.4,
      issue: subDays(2),
      maturity: addDays(1823),
      status: 'SUBMITTED' as const,
      verStatus: 'PENDING' as const,
      officer: users[2],
      bankConfirmed: false,
      depositType: 'JOINT_FDR' as const,
    },
    // 8: Under Scrutiny with Discrepancy Detected (Mismatched amount / date in OCR)
    {
      id: 'FDR-2026-0008',
      ref: 'AICTE/FDR/2026/00108',
      inst: institutions[4],
      bank: 'State Bank of India',
      branch: 'Salt Lake Sector V Kolkata',
      fdrNum: 'SBI-FDR-44332211',
      amount: 1800000,
      rate: 7.15,
      issue: subDays(15),
      maturity: addDays(1810),
      status: 'DISCREPANCY_DETECTED' as const,
      verStatus: 'DISCREPANCY' as const,
      officer: users[2],
      bankConfirmed: false,
      depositType: 'JOINT_FDR' as const,
    },
    // 9: Clarification Requested from Institution
    {
      id: 'FDR-2026-0009',
      ref: 'AICTE/FDR/2026/00109',
      inst: institutions[0],
      bank: 'ICICI Bank',
      branch: 'Nirman Vihar Delhi',
      fdrNum: 'ICICI-FDR-66554433',
      amount: 1200000,
      rate: 7.2,
      issue: subDays(20),
      maturity: addDays(1805),
      status: 'CLARIFICATION_REQUESTED' as const,
      verStatus: 'DISCREPANCY' as const,
      officer: users[2],
      bankConfirmed: false,
      depositType: 'SECURITY_DEPOSIT' as const,
    },
    // 10: Clarification Resubmitted by Institution
    {
      id: 'FDR-2026-0010',
      ref: 'AICTE/FDR/2026/00110',
      inst: institutions[5],
      bank: 'Bank of India',
      branch: 'Hazratganj Lucknow',
      fdrNum: 'BOI-FDR-88990011',
      amount: 1500000,
      rate: 7.05,
      issue: subDays(30),
      maturity: addDays(1795),
      status: 'RESUBMITTED' as const,
      verStatus: 'IN_PROGRESS' as const,
      officer: users[2],
      bankConfirmed: false,
      depositType: 'JOINT_FDR' as const,
    },
    // 11: Release Requested by Institution (Waiting for Officer Scrutiny)
    {
      id: 'FDR-2026-0011',
      ref: 'AICTE/FDR/2026/00111',
      inst: institutions[0],
      bank: 'Punjab & Sind Bank',
      branch: 'Nehru Place Delhi',
      fdrNum: 'PSB-FDR-11335577',
      amount: 3000000,
      rate: 6.95,
      issue: subDays(1825),
      maturity: subDays(5),
      status: 'RELEASE_REQUESTED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'PERFORMANCE_GUARANTEE' as const,
    },
    // 12: Release Scrutinized & Recommended to Authority (Pending Final Decision)
    {
      id: 'FDR-2026-0012',
      ref: 'AICTE/FDR/2026/00112',
      inst: institutions[1],
      bank: 'Central Bank of India',
      branch: 'Fort Mumbai',
      fdrNum: 'CBI-FDR-22446688',
      amount: 4000000,
      rate: 7.1,
      issue: subDays(1830),
      maturity: subDays(10),
      status: 'RELEASE_SCRUTINIZED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'SECURITY_DEPOSIT' as const,
    },
    // 13: Release Approved by Competent Authority
    {
      id: 'FDR-2026-0013',
      ref: 'AICTE/FDR/2026/00113',
      inst: institutions[6],
      bank: 'State Bank of India',
      branch: 'TT Nagar Bhopal',
      fdrNum: 'SBI-FDR-77112233',
      amount: 2000000,
      rate: 7.25,
      issue: subDays(1840),
      maturity: subDays(15),
      status: 'RELEASE_APPROVED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'JOINT_FDR' as const,
    },
    // 14: Release Rejected by Competent Authority
    {
      id: 'FDR-2026-0014',
      ref: 'AICTE/FDR/2026/00114',
      inst: institutions[7],
      bank: 'Bank of Baroda',
      branch: 'Navrangpura Ahmedabad',
      fdrNum: 'BOB-FDR-99224466',
      amount: 1500000,
      rate: 7.0,
      issue: subDays(1800),
      maturity: subDays(2),
      status: 'RELEASE_REJECTED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'ENDOWMENT_FUND' as const,
    },
    // 15: Fully Closed FDR Lifecycle
    {
      id: 'FDR-2026-0015',
      ref: 'AICTE/FDR/2026/00115',
      inst: institutions[2],
      bank: 'Canara Bank',
      branch: 'Jayanagar Bengaluru',
      fdrNum: 'CAN-FDR-55667788',
      amount: 2500000,
      rate: 6.85,
      issue: subDays(2190),
      maturity: subDays(365),
      status: 'CLOSED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[3],
      bankConfirmed: true,
      depositType: 'JOINT_FDR' as const,
    },
    // 16: Replaced / Renewed FDR (Old instrument)
    {
      id: 'FDR-2026-0016',
      ref: 'AICTE/FDR/2026/00116',
      inst: institutions[0],
      bank: 'Kotak Mahindra Bank',
      branch: 'Janakpuri New Delhi',
      fdrNum: 'KMB-FDR-12345678',
      amount: 1000000,
      rate: 6.9,
      issue: subDays(1826),
      maturity: subDays(1),
      status: 'RENEWED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'JOINT_FDR' as const,
      isRenewed: true,
      renewedToFdrId: 'FDR-2026-0017',
    },
    // 17: Renewal Instrument (New instrument linked to 16)
    {
      id: 'FDR-2026-0017',
      ref: 'AICTE/FDR/2026/00117',
      inst: institutions[0],
      bank: 'Kotak Mahindra Bank',
      branch: 'Janakpuri New Delhi',
      fdrNum: 'KMB-FDR-87654321',
      amount: 1000000,
      rate: 7.4,
      issue: subDays(1),
      maturity: addDays(1824),
      status: 'VERIFIED' as const,
      verStatus: 'MATCHED' as const,
      officer: users[2],
      bankConfirmed: false,
      depositType: 'JOINT_FDR' as const,
      renewedFromFdrId: 'FDR-2026-0016',
    },
    // 18: Active Large Deposit (₹1.5 Crore)
    {
      id: 'FDR-2026-0018',
      ref: 'AICTE/FDR/2026/00118',
      inst: institutions[3],
      bank: 'State Bank of India',
      branch: 'Anna Salai Chennai',
      fdrNum: 'SBI-FDR-15000099',
      amount: 15000000,
      rate: 7.35,
      issue: subDays(120),
      maturity: addDays(1705),
      status: 'VERIFIED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[3],
      bankConfirmed: true,
      depositType: 'ENDOWMENT_FUND' as const,
    },
    // 19: Under Officer Scrutiny (In progress)
    {
      id: 'FDR-2026-0019',
      ref: 'AICTE/FDR/2026/00119',
      inst: institutions[5],
      bank: 'Punjab National Bank',
      branch: 'Alambagh Lucknow',
      fdrNum: 'PNB-FDR-98712345',
      amount: 2200000,
      rate: 7.1,
      issue: subDays(10),
      maturity: addDays(1815),
      status: 'UNDER_VERIFICATION' as const,
      verStatus: 'IN_PROGRESS' as const,
      officer: users[2],
      bankConfirmed: false,
      depositType: 'JOINT_FDR' as const,
    },
    // 20: Rejected FDR (Fake stamp / Invalid Joint Mandate)
    {
      id: 'FDR-2026-0020',
      ref: 'AICTE/FDR/2026/00120',
      inst: institutions[4],
      bank: 'Axis Bank Ltd',
      branch: 'Park Street Kolkata',
      fdrNum: 'AXIS-FDR-00112233',
      amount: 1200000,
      rate: 6.75,
      issue: subDays(60),
      maturity: addDays(1765),
      status: 'REJECTED' as const,
      verStatus: 'REJECTED' as const,
      officer: users[2],
      bankConfirmed: false,
      depositType: 'JOINT_FDR' as const,
    },
    // 21: Another Active (Expiring in 280 days)
    {
      id: 'FDR-2026-0021',
      ref: 'AICTE/FDR/2026/00121',
      inst: institutions[1],
      bank: 'Bank of Maharashtra',
      branch: 'Shivaji Nagar Pune',
      fdrNum: 'BOM-FDR-44558899',
      amount: 1800000,
      rate: 7.2,
      issue: subDays(450),
      maturity: addDays(280),
      status: 'VERIFIED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'SECURITY_DEPOSIT' as const,
    },
    // 22: Matured without renewal
    {
      id: 'FDR-2026-0022',
      ref: 'AICTE/FDR/2026/00122',
      inst: institutions[6],
      bank: 'Canara Bank',
      branch: 'MP Nagar Bhopal',
      fdrNum: 'CAN-FDR-99887766',
      amount: 1600000,
      rate: 6.9,
      issue: subDays(1835),
      maturity: subDays(10),
      status: 'MATURED' as const,
      verStatus: 'CONFIRMED_BY_BANK' as const,
      officer: users[2],
      bankConfirmed: true,
      depositType: 'JOINT_FDR' as const,
    },
  ];

  for (const cfg of sampleConfigs) {
    const docId = `DOC-${cfg.id}`;
    const docBlob = createSampleFdrBlob(cfg.fdrNum, cfg.bank, cfg.inst.name, cfg.amount.toLocaleString('en-IN'));

    const doc: StoredDocument = {
      id: docId,
      fdrId: cfg.id,
      institutionId: cfg.inst.id,
      institutionName: cfg.inst.name,
      fileName: `${cfg.fdrNum}_Certificate.svg`,
      fileSize: docBlob.size,
      mimeType: 'image/svg+xml',
      blobData: docBlob,
      version: 1,
      documentCategory: 'ORIGINAL_FDR',
      uploadedById: cfg.inst.id,
      uploadedByName: cfg.inst.contactPerson,
      uploadedAt: cfg.issue,
      notes: `Original Fixed Deposit Certificate submitted for ${cfg.depositType}`,
    };
    docList.push(doc);

    // AI Extracted data
    const hasDiscrepancy = cfg.id === 'FDR-2026-0008' || cfg.id === 'FDR-2026-0009';
    const extractedAmount = hasDiscrepancy ? cfg.amount - 200000 : cfg.amount;
    const extractedMaturity = hasDiscrepancy ? subDays(30) : cfg.maturity;

    const fdr: FDRRecord = {
      id: cfg.id,
      applicationReference: cfg.ref,
      institutionId: cfg.inst.id,
      institutionName: cfg.inst.name,
      bankName: cfg.bank,
      branchName: cfg.branch,
      fdrNumber: cfg.fdrNum,
      accountHolderName: cfg.inst.name,
      jointHolderName: 'Regional Officer, AICTE',
      principalAmount: cfg.amount,
      interestRate: cfg.rate,
      issueDate: cfg.issue,
      maturityDate: cfg.maturity,
      validityDate: cfg.maturity,
      depositType: cfg.depositType,
      bankReferenceNumber: `REF-${cfg.fdrNum}`,
      documentId: docId,
      documentName: doc.fileName,
      workflowStatus: cfg.status,
      verificationStatus: cfg.verStatus,
      assignedOfficerId: cfg.officer.id,
      assignedOfficerName: cfg.officer.name,
      assignedAt: cfg.issue,
      aiExtractedData: {
        bankName: cfg.bank,
        branch: cfg.branch,
        fdrNumber: cfg.fdrNum,
        accountHolder: cfg.inst.name,
        principalAmount: extractedAmount,
        interestRate: cfg.rate,
        issueDate: cfg.issue,
        maturityDate: extractedMaturity,
        confidenceScore: hasDiscrepancy ? 68 : 96,
        extractedAt: cfg.issue,
      },
      discrepancies: hasDiscrepancy
        ? [
            {
              field: 'principalAmount',
              submittedValue: cfg.amount,
              extractedValue: extractedAmount,
              status: 'MISMATCH',
              notes: 'Extracted amount differs from submitted value by ₹2,00,000.',
            },
            {
              field: 'maturityDate',
              submittedValue: cfg.maturity,
              extractedValue: extractedMaturity,
              status: 'MISMATCH',
              notes: 'Maturity date printed on receipt does not match portal entry.',
            },
          ]
        : [
            {
              field: 'principalAmount',
              submittedValue: cfg.amount,
              extractedValue: cfg.amount,
              status: 'MATCH',
            },
            {
              field: 'fdrNumber',
              submittedValue: cfg.fdrNum,
              extractedValue: cfg.fdrNum,
              status: 'MATCH',
            },
            {
              field: 'bankName',
              submittedValue: cfg.bank,
              extractedValue: cfg.bank,
              status: 'MATCH',
            },
            {
              field: 'maturityDate',
              submittedValue: cfg.maturity,
              extractedValue: cfg.maturity,
              status: 'MATCH',
            },
          ],
      bankConfirmed: cfg.bankConfirmed,
      bankConfirmationRef: cfg.bankConfirmed ? `BNK-CONF-${cfg.fdrNum}` : undefined,
      bankConfirmationDate: cfg.bankConfirmed ? subDays(50) : undefined,
      bankConfirmationOfficer: cfg.bankConfirmed ? cfg.officer.name : undefined,
      isRenewed: cfg.isRenewed,
      renewedFromFdrId: cfg.renewedFromFdrId,
      renewedToFdrId: cfg.renewedToFdrId,
      createdById: cfg.inst.id,
      createdByName: cfg.inst.contactPerson,
      createdAt: cfg.issue,
      updatedAt: now,
    };
    fdrList.push(fdr);

    // Assignment record
    assignmentList.push({
      id: `ASGN-${cfg.id}`,
      fdrId: cfg.id,
      officerId: cfg.officer.id,
      officerName: cfg.officer.name,
      assignedById: users[0].id,
      assignedByName: users[0].name,
      assignedAt: cfg.issue,
      status: 'ACTIVE',
      notes: 'Assigned for regulatory verification as per regional allocation.',
    });

    // Verification record
    const verRecord: VerificationRecord = {
      id: `VER-${cfg.id}`,
      fdrId: cfg.id,
      institutionId: cfg.inst.id,
      officerId: cfg.officer.id,
      officerName: cfg.officer.name,
      overallStatus: cfg.verStatus,
      confidenceScore: hasDiscrepancy ? 68 : 96,
      fieldComparisons: fdr.discrepancies || [],
      aiNotes: hasDiscrepancy
        ? 'AI OCR detected field discrepancies requiring officer scrutiny.'
        : 'Automated OCR field match verified with high confidence score.',
      officerNotes: cfg.bankConfirmed
        ? 'Confirmed directly with designated bank branch via official nodal verification letter.'
        : undefined,
      bankVerified: cfg.bankConfirmed,
      bankVerificationDetails: cfg.bankConfirmed
        ? {
            verifiedByBankStaff: 'Branch Chief Manager',
            branchConfirmed: true,
            verificationDate: subDays(50),
            writtenConfirmationUploaded: true,
          }
        : undefined,
      decision: cfg.verStatus === 'CONFIRMED_BY_BANK' || cfg.verStatus === 'MATCHED'
        ? 'ACCEPT'
        : cfg.verStatus === 'REJECTED'
        ? 'REJECT'
        : hasDiscrepancy
        ? 'REQUEST_CLARIFICATION'
        : 'PENDING',
      completedAt: cfg.bankConfirmed ? subDays(50) : undefined,
      createdAt: cfg.issue,
      updatedAt: now,
    };
    await db.verificationRecords.put(verRecord);
  }

  // Add specific records for workflow demonstrations:
  // 1. Clarification Request for FDR-2026-0009
  clarifList.push({
    id: 'CLARIF-0009',
    fdrId: 'FDR-2026-0009',
    fdrNumber: 'ICICI-FDR-66554433',
    institutionId: 'INST-101',
    institutionName: 'Delhi Institute of Engineering & Technology',
    officerId: users[2].id,
    officerName: users[2].name,
    queryTitle: 'Discrepancy in Principal Amount and Missing Joint Lien Clause',
    queryDetails:
      'The uploaded FDR document reflects an amount of ₹10,00,000 whereas the portal application states ₹12,00,000. Additionally, the mandatory lien marking endorsement in favor of Regional Officer, AICTE is missing in the bank certificate.',
    discrepancies: [
      {
        field: 'principalAmount',
        submittedValue: 1200000,
        extractedValue: 1000000,
        status: 'MISMATCH',
        notes: 'Discrepancy of ₹2,00,000 observed.',
      },
    ],
    requestedDocuments: ['Revised FDR Certificate from Bank with Lien endorsement', 'Bank Confirmation Letter'],
    status: 'PENDING_RESPONSE',
    createdAt: subDays(5),
    updatedAt: subDays(5),
  });

  // 2. Scrutiny remarks
  remarksList.push(
    {
      id: 'REM-001',
      fdrId: 'FDR-2026-0009',
      officerId: users[2].id,
      officerName: users[2].name,
      stage: 'INITIAL_VERIFICATION',
      findingCategory: 'DISCREPANCY',
      comment: 'Discrepancy identified between submitted application amount and uploaded instrument copy. Joint holder clause absent.',
      isActionable: true,
      actionRequired: 'Clarification sought from institution.',
      createdAt: subDays(5),
    },
    {
      id: 'REM-002',
      fdrId: 'FDR-2026-0012',
      officerId: users[2].id,
      officerName: users[2].name,
      stage: 'RELEASE_EVALUATION',
      findingCategory: 'SATISFACTORY',
      comment: 'Tenure of 10 years completed. All regulatory dues, student grievance clearances and academic audits are verified and clear. Forwarded for final approval.',
      isActionable: false,
      createdAt: subDays(3),
    }
  );

  // 3. Release Requests
  // Pending officer review (FDR-2026-0011)
  releaseList.push({
    id: 'REL-2026-0001',
    fdrId: 'FDR-2026-0011',
    fdrNumber: 'PSB-FDR-11335577',
    institutionId: 'INST-101',
    institutionName: 'Delhi Institute of Engineering & Technology',
    principalAmount: 3000000,
    depositType: 'PERFORMANCE_GUARANTEE',
    requestReason: 'TENURE_COMPLETED',
    reasonDetails:
      'The mandated regulatory period of 5 years for the additional intake batch has elapsed without any student claims or regulatory violations. Requesting unconditional release of FDR lien.',
    status: 'SUBMITTED',
    allDuesCleared: true,
    academicAuditCleared: true,
    noLegalDisputeDeclared: true,
    createdAt: subDays(4),
    updatedAt: subDays(4),
  });

  // Scrutinized & Recommended to Authority (FDR-2026-0012)
  releaseList.push({
    id: 'REL-2026-0002',
    fdrId: 'FDR-2026-0012',
    fdrNumber: 'CBI-FDR-22446688',
    institutionId: 'INST-102',
    institutionName: 'Mumbai Polytechnic & Advanced Technology Campus',
    principalAmount: 4000000,
    depositType: 'SECURITY_DEPOSIT',
    requestReason: 'COURSE_CLOSURE',
    reasonDetails:
      'Permanent closure of legacy diploma stream approved vide AICTE Approval Order 2024-25. Final batch graduated in June 2025.',
    status: 'SCRUTINIZED',
    officerId: users[2].id,
    officerName: users[2].name,
    officerScrutinyRemarks:
      'Verified with Regional Directorate (WRO). Course closure formalities fulfilled, faculty gratuities disbursed, no complaints pending.',
    allDuesCleared: true,
    academicAuditCleared: true,
    noLegalDisputeDeclared: true,
    scrutinizedAt: subDays(2),
    createdAt: subDays(8),
    updatedAt: subDays(2),
  });

  // Approved by Authority (FDR-2026-0013)
  releaseList.push({
    id: 'REL-2026-0003',
    fdrId: 'FDR-2026-0013',
    fdrNumber: 'SBI-FDR-77112233',
    institutionId: 'INST-107',
    institutionName: 'Bhopal Institute of Technical Education',
    principalAmount: 2000000,
    depositType: 'JOINT_FDR',
    requestReason: 'SUBSTITUTION_APPROVED',
    reasonDetails: 'Original FDR replaced with higher value composite deposit.',
    status: 'APPROVED',
    officerId: users[2].id,
    officerName: users[2].name,
    officerScrutinyRemarks: 'Replacement FDR verified and active on portal.',
    allDuesCleared: true,
    academicAuditCleared: true,
    noLegalDisputeDeclared: true,
    scrutinizedAt: subDays(10),
    authorityDecision: 'APPROVED',
    authorityDecisionRemarks:
      'Approved for release of AICTE lien. Bank instructed to discharge joint mandate in favor of institution trust.',
    authorityDecidedBy: users[4].name,
    authorityDecidedAt: subDays(5),
    approvalCertificateRef: 'AICTE/APPR/REL/2026/0003',
    createdAt: subDays(14),
    updatedAt: subDays(5),
  });

  // Approval record for REL-2026-0003
  approvalList.push({
    id: 'APPR-0003',
    referenceNumber: 'AICTE/APPR/REL/2026/0003',
    releaseRequestId: 'REL-2026-0003',
    fdrId: 'FDR-2026-0013',
    fdrNumber: 'SBI-FDR-77112233',
    institutionId: 'INST-107',
    institutionName: 'Bhopal Institute of Technical Education',
    amount: 2000000,
    decision: 'APPROVED',
    authorityId: users[4].id,
    authorityName: users[4].name,
    authorityDesignation: users[4].designation || 'Competent Authority',
    remarks: 'Approved in accordance with Chapter VII of AICTE APH Regulations.',
    conditionsApplied: ['Original deposit discharge certificate to be filed within 30 days.'],
    signatureVerificationToken: 'SIG-VER-883920-AUTH-AICTE',
    createdAt: subDays(5),
  });

  // 4. Notifications
  notifList.push(
    {
      id: 'NOTIF-01',
      targetRole: 'OFFICER',
      title: 'New FDR Submission Received',
      message: 'Delhi Institute of Engineering & Technology submitted FDR-2026-0007 (₹50,00,000) for verification.',
      type: 'INFO',
      category: 'FDR_SUBMISSION',
      relatedFdrId: 'FDR-2026-0007',
      isRead: false,
      createdAt: subDays(1),
    },
    {
      id: 'NOTIF-02',
      institutionId: 'INST-101',
      title: 'Clarification Requested on FDR-2026-0009',
      message: 'Officer Sh. Vikramaditya Rathore requested clarification regarding amount discrepancy and lien endorsement.',
      type: 'WARNING',
      category: 'CLARIFICATION',
      relatedFdrId: 'FDR-2026-0009',
      isRead: false,
      createdAt: subDays(4),
    },
    {
      id: 'NOTIF-03',
      targetRole: 'AUTHORITY',
      title: 'Release Case Recommended for Decision',
      message: 'Release Request REL-2026-0002 for Mumbai Polytechnic (₹40,00,000) is awaiting your final decision.',
      type: 'ALERT',
      category: 'RELEASE_DECISION',
      relatedRecordId: 'REL-2026-0002',
      isRead: false,
      createdAt: subDays(2),
    },
    {
      id: 'NOTIF-04',
      targetRole: 'INSTITUTION',
      institutionId: 'INST-101',
      title: 'FDR Approaching Maturity (5 Days Remaining)',
      message: 'Security deposit FDR PNB-FDR-55441122 matures on ' + addDays(5) + '. Renewal is mandatory.',
      type: 'ALERT',
      category: 'MATURITY_REMINDER',
      relatedFdrId: 'FDR-2026-0002',
      isRead: false,
      createdAt: subDays(1),
    }
  );

  // 5. Append-only Hash-chained Audit Logs
  const auditEntries = [
    {
      action: 'SYSTEM_INITIALIZATION',
      category: 'SYSTEM' as const,
      desc: 'NIDHI Database initialized with AICTE regulatory schema and baseline parameters.',
      time: subDays(60),
      user: users[0],
    },
    {
      action: 'USER_LOGIN',
      category: 'AUTH' as const,
      desc: 'Administrator logged into NIDHI secure portal.',
      time: subDays(30),
      user: users[0],
    },
    {
      action: 'FDR_SUBMITTED',
      category: 'FDR' as const,
      desc: 'Institution submitted new FDR record FDR-2026-0001 (SBI, ₹15,00,000).',
      time: subDays(25),
      user: users[1],
    },
    {
      action: 'AI_OCR_PROCESSED',
      category: 'VERIFICATION' as const,
      desc: 'Automated OCR extraction completed for FDR-2026-0001. Confidence: 96%.',
      time: subDays(25),
      user: users[0],
    },
    {
      action: 'BANK_VERIFICATION_RECORDED',
      category: 'VERIFICATION' as const,
      desc: 'Official bank confirmation recorded by Officer Sh. Vikramaditya Rathore for FDR-2026-0001.',
      time: subDays(20),
      user: users[2],
    },
    {
      action: 'CLARIFICATION_ISSUED',
      category: 'CLARIFICATION' as const,
      desc: 'Clarification query raised for FDR-2026-0009 regarding amount mismatch.',
      time: subDays(5),
      user: users[2],
    },
    {
      action: 'RELEASE_APPROVED',
      category: 'RELEASE' as const,
      desc: 'Release request REL-2026-0003 approved by Competent Authority Prof. (Dr.) T. G. Sitharam.',
      time: subDays(5),
      user: users[4],
    },
  ];

  let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
  const logsList: AuditLog[] = [];

  for (let i = 0; i < auditEntries.length; i++) {
    const item = auditEntries[i];
    const eventId = `EVT-${(1000 + i).toString()}`;
    const entryHash = await computeAuditHash(
      prevHash,
      eventId,
      item.user.id,
      item.action,
      item.time,
      item.desc
    );

    const log: AuditLog = {
      id: `LOG-${(1000 + i).toString()}`,
      eventId,
      userId: item.user.id,
      userName: item.user.name,
      userRole: item.user.role,
      action: item.action,
      category: item.category,
      previousHash: prevHash,
      entryHash,
      description: item.desc,
      timestamp: item.time,
    };
    logsList.push(log);
    prevHash = entryHash;
  }

  // Put all into DB
  await db.documents.bulkPut(docList);
  await db.fdrRecords.bulkPut(fdrList);
  await db.scrutinyRemarks.bulkPut(remarksList);
  await db.clarificationRequests.bulkPut(clarifList);
  await db.releaseRequests.bulkPut(releaseList);
  await db.approvalRecords.bulkPut(approvalList);
  await db.officerAssignments.bulkPut(assignmentList);
  await db.notifications.bulkPut(notifList);
  await db.auditLogs.bulkPut(logsList);
}
