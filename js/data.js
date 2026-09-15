/* ==========================================================================
   MOCK DATA LAYER
   All data below simulates what will eventually come from the Laravel/MySQL
   API. Everything is namespaced under window.DB so it can later be swapped
   for real fetch() calls without touching page logic.
   Persisted to localStorage on first load so edits made in the UI survive
   a refresh (simulating persistence without a real backend).
   ========================================================================== */

const DB_STORAGE_KEY = "crm_mock_db_v7";

const SEED_USERS = [
  { id: "U-001", name: "Admin", email: "admin@example.com", password: "admin123", role: "admin", phone: "+91 98765 43210", status: "active", joined: "2024-01-10", lastLogin: "2026-09-10 09:12", avatarColor: "#4f46e5" },
  { id: "U-002", name: "Rahul Verma", email: "sales@example.com", password: "sales123", role: "sales", phone: "+91 98220 11223", status: "active", joined: "2024-02-14", lastLogin: "2026-09-10 08:40", avatarColor: "#0891b2" },
  { id: "U-003", name: "Priya Sharma", email: "priya.sharma@example.com", password: "sales123", role: "sales", phone: "+91 99887 66554", status: "active", joined: "2024-03-02", lastLogin: "2026-09-09 18:22", avatarColor: "#d97706" },
  { id: "U-004", name: "Amit Kulkarni", email: "amit.kulkarni@example.com", password: "sales123", role: "sales", phone: "+91 90123 45678", status: "active", joined: "2024-05-19", lastLogin: "2026-09-09 17:05", avatarColor: "#16a34a" },
  { id: "U-005", name: "Sneha Iyer", email: "sneha.iyer@example.com", password: "sales123", role: "sales", phone: "+91 91234 56780", status: "inactive", joined: "2024-07-08", lastLogin: "2026-08-28 11:00", avatarColor: "#dc2626" },
  { id: "U-006", name: "Karan Mehta", email: "karan.mehta@example.com", password: "sales123", role: "sales", phone: "+91 93456 12780", status: "active", joined: "2024-09-23", lastLogin: "2026-09-10 07:55", avatarColor: "#7c3aed" },
];

const LEAD_TYPES = ["Old Customer Reorder", "Cold Call / Website / Other", "Referral Lead"];
const LEAD_STATUSES = ["New", "Contacted", "Follow-up", "Qualified", "Converted", "Lost"];
const PRIORITIES = ["High", "Medium", "Low"];
const MEETING_TYPES = ["Virtual Meeting", "Client Site Visit", "Dealer Visit"];

const CONVERSION_CHANCES = [
  { value: "high", label: "High — likely to convert", color: "#166534" },
  { value: "medium", label: "Medium — some chance of converting", color: "#4ade80" },
  { value: "low", label: "Low — unlikely to convert", color: "#dc2626" },
];
function conversionChanceColor(value) {
  const match = CONVERSION_CHANCES.find(c => c.value === value);
  return match ? match.color : "#c7cad6";
}

const SEED_LEADS = [
  { id: "LD-1001", name: "Rohit Agarwal", company: "Agarwal Textiles Pvt Ltd", phone: "+91 98111 22334", altPhone: "", email: "rohit@agarwaltextiles.in", leadType: "Cold Call / Website / Other", requirement: "Bulk fabric ERP + billing solution", status: "Qualified", priority: "High", assignedTo: "U-002", expectedValue: 285000, expectedClosing: "2026-09-25", lastContact: "2026-09-08", nextFollowup: "2026-09-11", created: "2026-08-20", notes: "Interested in annual contract with onboarding support.", conversionChance: "high" },
  { id: "LD-1002", name: "Sanjana Deshpande", company: "Deshpande Interiors", phone: "+91 90222 33445", altPhone: "+91 90222 99881", email: "sanjana@deshpandeinteriors.com", leadType: "Referral Lead", requirement: "Design project CRM for client tracking", status: "New", priority: "Medium", assignedTo: "U-003", expectedValue: 120000, expectedClosing: "2026-10-05", lastContact: "", nextFollowup: "2026-09-11", created: "2026-09-05", notes: "", conversionChance: "medium" },
  { id: "LD-1003", name: "Vikram Nair", company: "Nair Logistics", phone: "+91 98333 44556", altPhone: "", email: "vikram.nair@nairlogistics.co.in", leadType: "Cold Call / Website / Other", requirement: "Fleet + invoicing management", status: "Contacted", priority: "Medium", assignedTo: "U-004", expectedValue: 450000, expectedClosing: "2026-10-15", lastContact: "2026-09-07", nextFollowup: "2026-09-12", created: "2026-08-15", notes: "Wants a live demo next week.", conversionChance: "medium" },
  { id: "LD-1004", name: "Ananya Reddy", company: "Reddy Healthcare Systems", phone: "+91 97444 55667", altPhone: "", email: "ananya@reddyhealthcare.in", leadType: "Cold Call / Website / Other", requirement: "Patient billing and CRM integration", status: "Follow-up", priority: "High", assignedTo: "U-002", expectedValue: 620000, expectedClosing: "2026-09-30", lastContact: "2026-09-09", nextFollowup: "2026-09-10", created: "2026-08-10", notes: "Budget approved, awaiting final quotation.", conversionChance: "high" },
  { id: "LD-1005", name: "Manoj Tiwari", company: "Tiwari Automobiles", phone: "+91 96555 66778", altPhone: "", email: "manoj@tiwariauto.com", leadType: "Cold Call / Website / Other", requirement: "Showroom lead + service CRM", status: "New", priority: "Low", assignedTo: "U-005", expectedValue: 95000, expectedClosing: "2026-10-20", lastContact: "", nextFollowup: "2026-09-13", created: "2026-09-06", notes: "", conversionChance: "low" },
  { id: "LD-1006", name: "Kavita Joshi", company: "Joshi Educational Trust", phone: "+91 95666 77889", altPhone: "", email: "kavita.joshi@joshitrust.org", leadType: "Referral Lead", requirement: "Admissions and fee management CRM", status: "Qualified", priority: "High", assignedTo: "U-006", expectedValue: 340000, expectedClosing: "2026-09-22", lastContact: "2026-09-06", nextFollowup: "2026-09-14", created: "2026-08-01", notes: "Comparing with two other vendors.", conversionChance: "high" },
  { id: "LD-1007", name: "Arjun Malhotra", company: "Malhotra Realty", phone: "+91 94777 88990", altPhone: "+91 94777 00112", email: "arjun@malhotrarealty.in", leadType: "Cold Call / Website / Other", requirement: "Property lead tracking system", status: "Converted", priority: "Medium", assignedTo: "U-003", expectedValue: 275000, expectedClosing: "2026-08-28", lastContact: "2026-08-27", nextFollowup: "", created: "2026-07-18", notes: "Deal closed, onboarding in progress.", conversionChance: "high" },
  { id: "LD-1008", name: "Deepika Rao", company: "Rao Fashion House", phone: "+91 93888 99001", altPhone: "", email: "deepika@raofashion.in", leadType: "Cold Call / Website / Other", requirement: "E-commerce order and CRM sync", status: "Lost", priority: "Low", assignedTo: "U-004", expectedValue: 80000, expectedClosing: "2026-08-15", lastContact: "2026-08-12", nextFollowup: "", created: "2026-07-25", notes: "Chose a competitor with lower pricing.", conversionChance: "low" },
  { id: "LD-1009", name: "Suresh Pillai", company: "Pillai Constructions", phone: "+91 92999 00112", altPhone: "", email: "suresh@pillaiconstructions.com", leadType: "Cold Call / Website / Other", requirement: "Project + vendor payment tracking", status: "Contacted", priority: "High", assignedTo: "U-002", expectedValue: 510000, expectedClosing: "2026-10-01", lastContact: "2026-09-08", nextFollowup: "2026-09-10", created: "2026-08-22", notes: "Needs multi-site support.", conversionChance: "medium" },
  { id: "LD-1010", name: "Neha Kapoor", company: "Kapoor Jewellers", phone: "+91 91000 11223", altPhone: "", email: "neha@kapoorjewellers.in", leadType: "Referral Lead", requirement: "Customer loyalty + billing CRM", status: "Follow-up", priority: "Medium", assignedTo: "U-006", expectedValue: 190000, expectedClosing: "2026-09-28", lastContact: "2026-09-05", nextFollowup: "2026-09-12", created: "2026-08-18", notes: "", conversionChance: "medium" },
  { id: "LD-1011", name: "Ramesh Chandran", company: "Chandran Exports", phone: "+91 90111 22335", altPhone: "", email: "ramesh@chandranexports.com", leadType: "Cold Call / Website / Other", requirement: "Export order + shipment CRM", status: "New", priority: "Medium", assignedTo: "U-003", expectedValue: 375000, expectedClosing: "2026-10-10", lastContact: "", nextFollowup: "2026-09-15", created: "2026-09-07", notes: "", conversionChance: "medium" },
  { id: "LD-1012", name: "Pooja Bhatt", company: "Bhatt Wellness Clinic", phone: "+91 89222 33446", altPhone: "", email: "pooja@bhattwellness.in", leadType: "Cold Call / Website / Other", requirement: "Appointment + billing CRM", status: "Qualified", priority: "High", assignedTo: "U-004", expectedValue: 225000, expectedClosing: "2026-09-24", lastContact: "2026-09-07", nextFollowup: "2026-09-11", created: "2026-08-12", notes: "Ready to sign after quotation revision.", conversionChance: "high" },
  { id: "LD-1013", name: "Gaurav Sethi", company: "Sethi Electronics", phone: "+91 88333 44557", altPhone: "", email: "gaurav@sethielectronics.com", leadType: "Cold Call / Website / Other", requirement: "Dealer network CRM", status: "Contacted", priority: "Low", assignedTo: "U-005", expectedValue: 145000, expectedClosing: "2026-10-18", lastContact: "2026-09-04", nextFollowup: "2026-09-16", created: "2026-08-28", notes: "", conversionChance: "low" },
];

const FOLLOWUP_TYPES = ["Phone Call", "Email", "Meeting", "WhatsApp", "Other"];

const SEED_FOLLOWUPS = [
  { id: "FU-2001", leadId: "LD-1004", salesperson: "U-002", type: "Phone Call", date: "2026-09-10", time: "10:30", notes: "Discuss final quotation revisions.", status: "Pending" },
  { id: "FU-2002", leadId: "LD-1009", salesperson: "U-002", type: "Meeting", date: "2026-09-10", time: "14:00", notes: "Site visit follow-up.", status: "Pending" },
  { id: "FU-2003", leadId: "LD-1001", salesperson: "U-002", type: "WhatsApp", date: "2026-09-11", time: "11:00", notes: "Send onboarding brochure.", status: "Pending" },
  { id: "FU-2004", leadId: "LD-1002", salesperson: "U-003", type: "Phone Call", date: "2026-09-11", time: "12:00", notes: "Introductory call.", status: "Pending" },
  { id: "FU-2005", leadId: "LD-1012", salesperson: "U-004", type: "Email", date: "2026-09-11", time: "09:30", notes: "Send revised pricing.", status: "Pending" },
  { id: "FU-2006", leadId: "LD-1003", salesperson: "U-004", type: "Meeting", date: "2026-09-12", time: "15:30", notes: "Live product demo.", status: "Pending" },
  { id: "FU-2007", leadId: "LD-1010", salesperson: "U-006", type: "Phone Call", date: "2026-09-12", time: "11:30", notes: "Check on decision timeline.", status: "Pending" },
  { id: "FU-2008", leadId: "LD-1006", salesperson: "U-006", type: "Meeting", date: "2026-09-14", time: "16:00", notes: "Final proposal meeting.", status: "Pending" },
  { id: "FU-2009", leadId: "LD-1005", salesperson: "U-005", type: "WhatsApp", date: "2026-09-13", time: "10:00", notes: "Share showroom demo video.", status: "Pending" },
  { id: "FU-2010", leadId: "LD-1013", salesperson: "U-005", type: "Other", date: "2026-09-16", time: "13:00", notes: "Dealer network discussion.", status: "Pending" },
  { id: "FU-2011", leadId: "LD-1007", salesperson: "U-003", type: "Phone Call", date: "2026-08-27", time: "11:00", notes: "Confirm onboarding schedule.", status: "Completed" },
  { id: "FU-2012", leadId: "LD-1008", salesperson: "U-004", type: "Email", date: "2026-08-12", time: "17:00", notes: "Final pricing follow-up.", status: "Completed" },
  { id: "FU-2013", leadId: "LD-1011", salesperson: "U-003", type: "Phone Call", date: "2026-09-08", time: "10:00", notes: "Introductory call — no response.", status: "Overdue" },
];

const SEED_MEETINGS = [
  { id: "MT-4001", leadId: "LD-1004", salesperson: "U-002", type: "Virtual Meeting", date: "2026-09-11", time: "11:00", notes: "", attachment: null, status: "Scheduled" },
  { id: "MT-4002", leadId: "LD-1009", salesperson: "U-002", type: "Client Site Visit", date: "2026-09-12", time: "15:00", notes: "", attachment: null, status: "Scheduled" },
  { id: "MT-4003", leadId: "LD-1013", salesperson: "U-005", type: "Dealer Visit", date: "2026-09-16", time: "13:30", notes: "", attachment: null, status: "Scheduled" },
  { id: "MT-4004", leadId: "LD-1001", salesperson: "U-002", type: "Virtual Meeting", date: "2026-09-05", time: "10:00", notes: "Walked through the ERP requirements and confirmed the module list before final quotation.", attachment: "Meeting_Notes_MT-4004.pdf", status: "Completed" },
  { id: "MT-4005", leadId: "LD-1007", salesperson: "U-003", type: "Client Site Visit", date: "2026-08-26", time: "12:00", notes: "Reviewed onboarding plan on-site with the operations team.", attachment: "Meeting_Notes_MT-4005.pdf", status: "Completed" },
];

const QUOTATION_FORMATS = [
  { key: "techno_simple", label: "Techno Commercial Offer (Simple)", hint: "Single work item + GST inline, bullet terms, scope of work — for a focused study/audit style offer." },
  { key: "techno_detailed", label: "Techno Commercial Offer (Detailed)", hint: "Company profile, approvals, project references, item table, numbered terms with bank details — for a full proposal to a new client." },
  { key: "standard", label: "Quotation (Standard)", hint: "Classic itemised quotation with UOM/Qty/Rate, numbered terms, and an optional second item group (e.g. Installation)." },
];
const DEFAULT_QUOTE_TERMS_SIMPLE = [
  "50% advance payment along with PO and balance 50% within 7 days from the date of invoice submittal.",
  "An electrical technician from the industry must be assigned during the audit process on-site.",
  "Boarding, lodging and Ticketing at customer scope.",
];
const DEFAULT_QUOTE_TERMS_DETAILED = [
  "Price: Ex-our Works, Unloading of Material will be at Customer Scope",
  "Packing: 3% Extra, Freight Charges: ES Scope",
  "Warranty: 1 Year from the date of manufacturing",
  "Delivery: 3-4 Weeks from the date of receipt of Approved GA Drawing with BOM and Signed Purchase Order",
  "Payment Terms: 50% advance and balance 50% before dispatch",
  "Installation: Exclusive — Installation Materials such as lux, cables, glands etc. at Customer scope",
  "Civil Work: Customer Scope",
];
const DEFAULT_QUOTE_TERMS_STANDARD = [
  "Price: Ex-Your Works, Unloading of Material will be at Customer Scope",
  "Packing & Forwarding: NIL",
  "GST: 18% at actuals",
  "Warranty: 1 Year from the date of manufacturing",
  "Delivery: 3-4 Weeks from the date of receipt of Approved GA Drawing with BOM and Signed Purchase Order",
  "Payment Terms: 100% within 15 days from the invoice",
  "Installation & Commissioning: Inclusive",
  "Civil Work: ES Scope",
];

/* ---------- Default example content per quotation format ----------
   Every new quotation starts pre-filled with its reference document's real
   content (recipient, items, terms, profile, signature) so the format is
   immediately recognizable — the user edits/deletes from there rather than
   starting from a blank row. */
const DEFAULT_QUOTE_SIMPLE = {
  refNo: "ESEI/QUOT/034/2026-27", date: "2026-06-19",
  recipientName: "Mr. TN Das", recipientDesignation: "Head Purchase", recipientCompany: "SUNVIK STEELS, TUMAKURU", recipientEmail: "tndas@sunvik.in", recipientMobile: "+91 9379563735",
  subject: "Offer for Harmonics Analysis–Reg.",
  items: [{ desc: "Harmonics study for Steel Plant as per the scope of work\nNo of days- 3 with 3 members Total Man days including report preparation is 12", uom: "", qty: 1, rate: 204000 }],
  gstPercent: 18, gstMode: "ADD",
  scopeOfWork: "1. Field Measurements & Data Collection\nInstallation of power quality analyzer at PCC (Point of Common Coupling) and selected downstream panels.\n\nMeasurement of:\n- Voltage and current harmonics (up to 50th order or higher as required)\n- Total Harmonic Distortion (THD-V and THD-I)\n- Power factor (true and displacement)\n- Voltage unbalance, flicker (if applicable)\n- Load profile during different operating conditions\n- Monitoring period: 2 hours (or as per plant operation cycle).\n\n2. Harmonic Analysis & Evaluation\n- Analysis of measured data to identify dominant harmonic orders\n- Assessment of harmonic contribution of individual loads\n- Evaluation of resonance conditions with capacitor banks\n- Comparison of measured values with:\n  IEEE-519 limits at PCC\n  Utility / DISCOM requirements",
  authorizedName: "Dr. R. Sivakumar", authorizedDesignation: "ME, PhD, BEE Certified Energy Auditor, Chief Executive", authorizedMobile: "+91 9844136209",
};

const DEFAULT_QUOTE_DETAILED = {
  refNo: "ESEIPL/SP/026/2026-27/Rev_0", date: "2026-05-26",
  recipientName: "Mr. Kishore Kumar", recipientCompany: "Biocon limited", recipientEmail: "kishorekumar.devendran@biocon.com", recipientMobile: "+91 99611222933",
  subject: "Supply of ES-25 360 KVA Energy Savers",
  introText: "This has reference to discussion had regarding the subject.  We are pleased to give below our offer for your kind consideration.",
  highlights: [
    "Presence in the field of Energy Conservation over three decades",
    "ISO 9001:2015 certified Company",
    "Having own infrastructure for design, development and manufacturing",
    "Having more than 800 satisfied customers globally",
    "Enough space at factory to expand manufacturing facility to meet customer requirements",
    "Strong presence in GCC / South East Asian countries and also European countries",
  ],
  approvals: [
    "The Energy Research Institute (TERI)",
    "Project & Development India Limited (PDIL)",
    "Confederation of Indian Industry (CII)",
    "Kirloskar Consultants Limited (KCL)",
    "Southern Regional Electricity Board (SREB)",
  ],
  projects: [
    "Infosys Limited (all over India)", "ABB Limited (all Grasim and other projects)",
    "L&T Infrastructure Development Projects Limited (L&T IDPL)", "Robert Bosch Engineering and Business Solutions",
    "UTCL", "TATA Group of Companies", "TVS Group", "Hindustan Petroleum Corporation Limited",
    "Hindustan Aeronautics Limited", "Municipal Corporations",
  ],
  itemsNote: "Supply of Energy Saver with all necessities as per requirement - HSN Code 85371000",
  items: [
    { desc: "Design, Manufacture and Supply of Voltage optimization, low loss impedance matching with Highly efficient 4 Voltage tapping in the Energy Coil 360 (120*3) KVA ES25 Energy Saver (CPRI, CE and ETDC tested)", uom: "NOS", qty: 1, rate: 1080000 },
    { desc: "Energy Meter (Make Schinder: EM64000NG)", uom: "NOS", qty: 1, rate: 15000 },
  ],
  gstPercent: 18, gstMode: "EXCLUDE",
  showBankDetails: true,
  bankAccountHolder: "ES Electronics (India) Pvt Ltd", bankName: "M/s Kotak Mahindra Bank", bankBranch: "Srinivasanagar, Bangalore - 560050", bankAccountType: "Current", bankAccountNo: "5345263066", bankIFSC: "KKBK0008063",
  authorizedName: "Ravi Kumar R", authorizedDesignation: "Managing Director", authorizedMobile: "+91 9844136209",
};

const DEFAULT_QUOTE_STANDARD = {
  refNo: "ESEI/QUOT/029/2026-27/Rev_0", date: "2026-06-01",
  recipientName: "Mr. Umasankar S", recipientCompany: "For Dynamatic Technologies", recipientEmail: "umasankar.s@dynamatics.net", recipientMobile: "+91 9886592519",
  greeting: "Dear Sir / Madam.",
  subject: "Supply and Installation of Lighting Arrestor",
  introText: "This has reference to discussion had regarding the subject.  We are pleased to give below our offer for your kind consideration.",
  items: [
    { desc: "Earthing : Copper Plate Earthing Electrode – 600 mm x 600 mm x 3.15 mm thick, high conductivity electrolytic copper, Excavation of Earth Pit – up to 1.5 m depth and 450mm x 450mm width, including disposal of excavated earth, Backfilling with Alternate Layers of Salt and Charcoal, Construction of Inspection Chamber – Brick masonry with plastering, 450 mm x 450 mm x 600 mm with RCC slab and cover", uom: "NOS", qty: 3, rate: 20000 },
    { desc: "Copper Strip – 25 mm x 06 mm from earth electrode to test link With Insulators", uom: "MTRS", qty: 150, rate: 2550 },
    { desc: "Supply and Laying of 4c x 35 Sq mm cu flexible cable - Make: Poly Cab", uom: "MTRS", qty: 150, rate: 2680 },
    { desc: "Supply of IC X10 Sq mm cu cable for earthing", uom: "MTRS", qty: 150, rate: 185 },
    { desc: "Supply and Installation of of 4c x 35 Sq mm cu cable for earthing end termination-make: Dowell", uom: "SET", qty: 2, rate: 1400 },
  ],
  secondGroupItems: [
    { desc: "Installation of Earthing : Copper Plate Earthing Electrode – 600 mm x 600 mm x 3.15 mm thick, high conductivity electrolytic copper, Excavation of Earth Pit – up to 1.5 m depth and 450mm x 450mm width, including disposal of excavated earth, Backfilling with Alternate Layers of Salt and Charcoal, Construction of Inspection Chamber – Brick masonry with plastering, 450 mm x 450 mm x 600 mm with RCC slab and cover", uom: "NOS", qty: 3, rate: 6200 },
    { desc: "Installation of Copper Strip – 25 mm x 06 mm from earth electrode to test link With Insulators", uom: "MTRS", qty: 150, rate: 175 },
    { desc: "Installation of 4c x 35 Sq mm cu flexible cable - Make: Poly Cab", uom: "MTRS", qty: 150, rate: 70 },
    { desc: "Installation of IC X10 Sq mm cu cable for earthing", uom: "MTRS", qty: 150, rate: 30 },
    { desc: "Installation of 4c x 35 Sq mm cu cable for earthing end termination - make: Dowell", uom: "SET", qty: 2, rate: 120 },
  ],
  gstPercent: 18, gstMode: "EXCLUDE",
  highlightNote: "Goods once sold shall not be taken back.",
  closingText: "We look forward to receive your valued Purchase Order at the earliest.\n\nThanking You,\n\nYours faithfully,",
  authorizedName: "R. Ravi Kumar", authorizedDesignation: "Director", authorizedMobile: "+91 9844136209",
};

const SEED_QUOTATIONS = [
  { id: "QT-1021", leadId: "LD-1004", docFormat: "standard", customer: "Reddy Healthcare Systems", amount: 703280, date: "2026-09-01", validUntil: "2026-09-20", status: "Sent", createdBy: "U-002",
    refNo: "ESEI/QUOT/021/2026-27", subject: "Offer for CRM Implementation",
    recipientName: "Ananya Reddy", recipientDesignation: "", recipientCompany: "Reddy Healthcare Systems", recipientEmail: "", recipientMobile: "",
    greeting: "Dear Sir / Madam.", introText: "This has reference to discussion had regarding the subject. We are pleased to give below our offer for your kind consideration.",
    items: [
      { desc: "CRM Annual License (50 users)", uom: "Set", qty: 1, rate: 456000 },
      { desc: "Onboarding & Training", uom: "Set", qty: 1, rate: 80000 },
      { desc: "Custom Integration Module", uom: "Set", qty: 1, rate: 60000 },
    ],
    gstPercent: 18, gstMode: "ADD",
    termsAndConditions: DEFAULT_QUOTE_TERMS_STANDARD.slice(),
    secondGroup: { enabled: false, title: "Installation", items: [] },
    closingText: "We look forward to receive your valued Purchase Order at the earliest.",
    authorizedName: "Rahul Verma", authorizedDesignation: "Sales Manager", authorizedMobile: "", remarks: "Awaiting response after final follow-up call." },

  { id: "QT-1022", leadId: "LD-1001", docFormat: "standard", customer: "Agarwal Textiles Pvt Ltd", amount: 323320, date: "2026-08-25", validUntil: "2026-09-15", status: "Accepted", createdBy: "U-002",
    refNo: "ESEI/QUOT/022/2026-27", subject: "Offer for Bulk Fabric ERP + Billing Solution",
    recipientName: "Rohit Agarwal", recipientDesignation: "", recipientCompany: "Agarwal Textiles Pvt Ltd", recipientEmail: "rohit@agarwaltextiles.in", recipientMobile: "+91 98111 22334",
    greeting: "Dear Sir / Madam.", introText: "This has reference to discussion had regarding the subject. We are pleased to give below our offer for your kind consideration.",
    items: [
      { desc: "CRM Annual License (20 users)", uom: "Set", qty: 1, rate: 209000 },
      { desc: "Billing Module Setup", uom: "Set", qty: 1, rate: 65000 },
    ],
    gstPercent: 18, gstMode: "ADD",
    termsAndConditions: DEFAULT_QUOTE_TERMS_STANDARD.slice(),
    secondGroup: { enabled: false, title: "Installation", items: [] },
    closingText: "We look forward to receive your valued Purchase Order at the earliest.",
    authorizedName: "Rahul Verma", authorizedDesignation: "Sales Manager", authorizedMobile: "", remarks: "Client accepted — proceed to invoicing." },

  { id: "QT-1023", leadId: "LD-1006", docFormat: "standard", customer: "Joshi Educational Trust", amount: 401200, date: "2026-09-02", validUntil: "2026-09-21", status: "Sent", createdBy: "U-006",
    refNo: "ESEI/QUOT/023/2026-27", subject: "Offer for Admissions and Fee Management CRM",
    recipientName: "Kavita Joshi", recipientDesignation: "", recipientCompany: "Joshi Educational Trust", recipientEmail: "kavita.joshi@joshitrust.org", recipientMobile: "+91 95666 77889",
    greeting: "Dear Sir / Madam.", introText: "This has reference to discussion had regarding the subject. We are pleased to give below our offer for your kind consideration.",
    items: [
      { desc: "Admissions CRM License", uom: "Set", qty: 1, rate: 260000 },
      { desc: "Fee Management Module", uom: "Set", qty: 1, rate: 80000 },
    ],
    gstPercent: 18, gstMode: "ADD",
    termsAndConditions: DEFAULT_QUOTE_TERMS_STANDARD.slice(),
    secondGroup: { enabled: false, title: "Installation", items: [] },
    closingText: "We look forward to receive your valued Purchase Order at the earliest.",
    authorizedName: "Karan Mehta", authorizedDesignation: "Sales Manager", authorizedMobile: "", remarks: "Comparing with two other vendors — follow up next week." },

  { id: "QT-1024", leadId: "LD-1012", docFormat: "standard", customer: "Bhatt Wellness Clinic", amount: 265500, date: "2026-09-04", validUntil: "2026-09-18", status: "Draft", createdBy: "U-004",
    refNo: "ESEI/QUOT/024/2026-27", subject: "Offer for Appointment + Billing CRM",
    recipientName: "Pooja Bhatt", recipientDesignation: "", recipientCompany: "Bhatt Wellness Clinic", recipientEmail: "pooja@bhattwellness.in", recipientMobile: "+91 89222 33446",
    greeting: "Dear Sir / Madam.", introText: "This has reference to discussion had regarding the subject. We are pleased to give below our offer for your kind consideration.",
    items: [
      { desc: "Clinic CRM License", uom: "Set", qty: 1, rate: 180000 },
      { desc: "Appointment Module", uom: "Set", qty: 1, rate: 45000 },
    ],
    gstPercent: 18, gstMode: "ADD",
    termsAndConditions: DEFAULT_QUOTE_TERMS_STANDARD.slice(),
    secondGroup: { enabled: false, title: "Installation", items: [] },
    closingText: "We look forward to receive your valued Purchase Order at the earliest.",
    authorizedName: "Amit Kulkarni", authorizedDesignation: "Sales Manager", authorizedMobile: "", remarks: "Draft pending internal review before sending." },

  { id: "QT-1025", leadId: "LD-1008", docFormat: "standard", customer: "Rao Fashion House", amount: 94400, date: "2026-08-01", validUntil: "2026-08-15", status: "Rejected", createdBy: "U-004",
    refNo: "ESEI/QUOT/025/2026-27", subject: "Offer for E-commerce Order and CRM Sync",
    recipientName: "Deepika Rao", recipientDesignation: "", recipientCompany: "Rao Fashion House", recipientEmail: "deepika@raofashion.in", recipientMobile: "+91 93888 99001",
    greeting: "Dear Sir / Madam.", introText: "This has reference to discussion had regarding the subject. We are pleased to give below our offer for your kind consideration.",
    items: [{ desc: "E-commerce Sync Module", uom: "Set", qty: 1, rate: 80000 }],
    gstPercent: 18, gstMode: "ADD",
    termsAndConditions: DEFAULT_QUOTE_TERMS_STANDARD.slice(),
    secondGroup: { enabled: false, title: "Installation", items: [] },
    closingText: "We look forward to receive your valued Purchase Order at the earliest.",
    authorizedName: "Amit Kulkarni", authorizedDesignation: "Sales Manager", authorizedMobile: "", remarks: "Rejected — chose a competitor with lower pricing." },

  { id: "QT-1026", leadId: "LD-1003", docFormat: "standard", customer: "Nair Logistics", amount: 531000, date: "2026-08-20", validUntil: "2026-09-05", status: "Expired", createdBy: "U-004",
    refNo: "ESEI/QUOT/026/2026-27", subject: "Offer for Fleet + Invoicing Management",
    recipientName: "Vikram Nair", recipientDesignation: "", recipientCompany: "Nair Logistics", recipientEmail: "vikram.nair@nairlogistics.co.in", recipientMobile: "+91 98333 44556",
    greeting: "Dear Sir / Madam.", introText: "This has reference to discussion had regarding the subject. We are pleased to give below our offer for your kind consideration.",
    items: [
      { desc: "Fleet Management CRM", uom: "Set", qty: 1, rate: 350000 },
      { desc: "Invoicing Module", uom: "Set", qty: 1, rate: 100000 },
    ],
    gstPercent: 18, gstMode: "ADD",
    termsAndConditions: DEFAULT_QUOTE_TERMS_STANDARD.slice(),
    secondGroup: { enabled: false, title: "Installation", items: [] },
    closingText: "We look forward to receive your valued Purchase Order at the earliest.",
    authorizedName: "Amit Kulkarni", authorizedDesignation: "Sales Manager", authorizedMobile: "", remarks: "Expired — re-quote if the customer re-engages." },
];

const SEED_ESTIMATIONS = [
  { id: "EST-5001", leadId: "LD-1004", title: "Reddy Healthcare Systems — Internal Cost Estimate", date: "2026-08-28", status: "Final", createdBy: "U-001", amount: 273000,
    items: [
      { desc: "CRM Annual License (dev + support cost)", qty: 1, rate: 210000, tax: 0 },
      { desc: "Onboarding & Training (internal effort)", qty: 1, rate: 35000, tax: 0 },
      { desc: "Custom Integration Module (dev cost)", qty: 1, rate: 28000, tax: 0 },
    ] },
  { id: "EST-5002", leadId: "LD-1009", title: "Pillai Constructions — Rough Estimate", date: "2026-09-06", status: "Draft", createdBy: "U-001", amount: 240000,
    items: [
      { desc: "Project Tracking CRM (base build)", qty: 1, rate: 180000, tax: 0 },
      { desc: "Vendor Payment Module", qty: 1, rate: 60000, tax: 0 },
    ] },
];

const INVOICE_STATUSES = ["Draft", "Sent", "Partially Paid", "Paid", "Overdue"];
const INVOICE_COPY_TYPES = ["Original for Buyer", "Duplicate for Transporter", "Triplicate for Assessee", "Extra Copy not for Sale"];
const DEFAULT_INVOICE_TERMS = "100% Advance / As per agreed payment terms.";
const DEFAULT_INVOICE_CERTIFICATION = "Certified that the particulars given above are true and correct and the amount indicated represents the price actually charged and that there is no flow of additional consideration directly or indirectly from the buyer.";
const DEFAULT_INVOICE_INTEREST_NOTE = "If our payment is not cleared within the due date, interest @ 24% per annum shall be charged for the period of delay.";
const DEFAULT_INVOICE_JURISDICTION = "SUBJECT TO BANGALORE JURISDICTION";

const SEED_INVOICES = [
  { id: "INV-1021", quotationId: "QT-1022", copyType: "Original for Buyer",
    invoiceDate: "2026-09-02", dueDate: "2026-09-16", woRef: "", ewayBillNo: "", customerPoNo: "", customerPoDate: "", stateCode: "KA-29",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    customer: "Agarwal Textiles Pvt Ltd", billToAddress: "Ring Road Industrial Area, Agarwal Textiles Pvt Ltd, Ahmedabad, Gujarat - 380009", billToContact: "Rohit Agarwal +91 98111 22334", billToStateCode: "24", customerGstNo: "24AAACT1234B1Z5",
    shipToSameAsBillTo: true, shipToName: "", shipToAddress: "", shipToContact: "", shipToStateCode: "",
    termsOfDelivery: "As per agreement", modeOfDespatch: "", transporterDetails: "",
    items: [
      { desc: "CRM Annual License (20 users)", hsn: "998314", unit: "Set", qty: 1, rate: 220000, discount: 0 },
      { desc: "Billing Module Setup", hsn: "998314", unit: "Set", qty: 1, rate: 65000, discount: 0 },
    ],
    taxMode: "CGST_SGST", cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
    amount: 336300, paidAmount: 336300, status: "Paid",
    termsAndConditions: DEFAULT_INVOICE_TERMS, certificationText: DEFAULT_INVOICE_CERTIFICATION, interestNote: DEFAULT_INVOICE_INTEREST_NOTE, jurisdictionText: DEFAULT_INVOICE_JURISDICTION,
    bankAccountHolder: "ES Electronics (India) Pvt Ltd", bankName: "Karnataka Bank Ltd", bankAccountType: "CA", bankAccountNo: "0992000100228301", bankIFSC: "KARB000099", bankBranch: "Srinagar, Bengaluru - 560050",
    authorizedName: "Admin", authorizedDesignation: "Administrator", notes: "" },

  { id: "INV-1022", quotationId: "", copyType: "Original for Buyer",
    invoiceDate: "2026-08-29", dueDate: "2026-09-12", woRef: "", ewayBillNo: "", customerPoNo: "", customerPoDate: "", stateCode: "KA-29",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    customer: "Malhotra Realty", billToAddress: "MG Road, Malhotra Realty, Pune, Maharashtra - 411001", billToContact: "Arjun Malhotra +91 94777 88990", billToStateCode: "27", customerGstNo: "27AABCM5678C1Z2",
    shipToSameAsBillTo: true, shipToName: "", shipToAddress: "", shipToContact: "", shipToStateCode: "",
    termsOfDelivery: "As per agreement", modeOfDespatch: "", transporterDetails: "",
    items: [{ desc: "Property Lead Tracking CRM License", hsn: "998314", unit: "Set", qty: 1, rate: 275000, discount: 0 }],
    taxMode: "CGST_SGST", cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
    amount: 324500, paidAmount: 150000, status: "Partially Paid",
    termsAndConditions: DEFAULT_INVOICE_TERMS, certificationText: DEFAULT_INVOICE_CERTIFICATION, interestNote: DEFAULT_INVOICE_INTEREST_NOTE, jurisdictionText: DEFAULT_INVOICE_JURISDICTION,
    bankAccountHolder: "ES Electronics (India) Pvt Ltd", bankName: "Karnataka Bank Ltd", bankAccountType: "CA", bankAccountNo: "0992000100228301", bankIFSC: "KARB000099", bankBranch: "Srinagar, Bengaluru - 560050",
    authorizedName: "Admin", authorizedDesignation: "Administrator", notes: "" },

  { id: "INV-1023", quotationId: "QT-1023", copyType: "Original for Buyer",
    invoiceDate: "2026-09-05", dueDate: "2026-09-19", woRef: "", ewayBillNo: "", customerPoNo: "", customerPoDate: "", stateCode: "KA-29",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    customer: "Joshi Educational Trust", billToAddress: "Station Road, Joshi Educational Trust, Pune, Maharashtra - 411005", billToContact: "Kavita Joshi +91 95666 77889", billToStateCode: "27", customerGstNo: "27AAAJT4321D1Z8",
    shipToSameAsBillTo: true, shipToName: "", shipToAddress: "", shipToContact: "", shipToStateCode: "",
    termsOfDelivery: "As per agreement", modeOfDespatch: "", transporterDetails: "",
    items: [
      { desc: "Admissions CRM License", hsn: "998314", unit: "Set", qty: 1, rate: 260000, discount: 0 },
      { desc: "Fee Management Module", hsn: "998314", unit: "Set", qty: 1, rate: 80000, discount: 0 },
    ],
    taxMode: "CGST_SGST", cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
    amount: 401200, paidAmount: 0, status: "Sent",
    termsAndConditions: DEFAULT_INVOICE_TERMS, certificationText: DEFAULT_INVOICE_CERTIFICATION, interestNote: DEFAULT_INVOICE_INTEREST_NOTE, jurisdictionText: DEFAULT_INVOICE_JURISDICTION,
    bankAccountHolder: "ES Electronics (India) Pvt Ltd", bankName: "Karnataka Bank Ltd", bankAccountType: "CA", bankAccountNo: "0992000100228301", bankIFSC: "KARB000099", bankBranch: "Srinagar, Bengaluru - 560050",
    authorizedName: "Admin", authorizedDesignation: "Administrator", notes: "" },

  { id: "INV-1024", quotationId: "", copyType: "Original for Buyer",
    invoiceDate: "2026-08-10", dueDate: "2026-08-24", woRef: "", ewayBillNo: "", customerPoNo: "", customerPoDate: "", stateCode: "KA-29",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    customer: "Kapoor Jewellers", billToAddress: "Zaveri Bazaar, Kapoor Jewellers, Mumbai, Maharashtra - 400002", billToContact: "Neha Kapoor +91 91000 11223", billToStateCode: "27", customerGstNo: "27AABCK8765E1Z4",
    shipToSameAsBillTo: true, shipToName: "", shipToAddress: "", shipToContact: "", shipToStateCode: "",
    termsOfDelivery: "As per agreement", modeOfDespatch: "", transporterDetails: "",
    items: [{ desc: "Customer Loyalty + Billing CRM License", hsn: "998314", unit: "Set", qty: 1, rate: 190000, discount: 0 }],
    taxMode: "CGST_SGST", cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
    amount: 224200, paidAmount: 0, status: "Overdue",
    termsAndConditions: DEFAULT_INVOICE_TERMS, certificationText: DEFAULT_INVOICE_CERTIFICATION, interestNote: DEFAULT_INVOICE_INTEREST_NOTE, jurisdictionText: DEFAULT_INVOICE_JURISDICTION,
    bankAccountHolder: "ES Electronics (India) Pvt Ltd", bankName: "Karnataka Bank Ltd", bankAccountType: "CA", bankAccountNo: "0992000100228301", bankIFSC: "KARB000099", bankBranch: "Srinagar, Bengaluru - 550050",
    authorizedName: "Admin", authorizedDesignation: "Administrator", notes: "" },

  { id: "INV-1025", quotationId: "QT-1024", copyType: "Original for Buyer",
    invoiceDate: "2026-09-08", dueDate: "2026-09-22", woRef: "", ewayBillNo: "", customerPoNo: "", customerPoDate: "", stateCode: "KA-29",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    customer: "Bhatt Wellness Clinic", billToAddress: "Satellite Road, Bhatt Wellness Clinic, Ahmedabad, Gujarat - 380015", billToContact: "Pooja Bhatt +91 89222 33446", billToStateCode: "24", customerGstNo: "24AABCB2109F1Z6",
    shipToSameAsBillTo: true, shipToName: "", shipToAddress: "", shipToContact: "", shipToStateCode: "",
    termsOfDelivery: "As per agreement", modeOfDespatch: "", transporterDetails: "",
    items: [
      { desc: "Clinic CRM License", hsn: "998314", unit: "Set", qty: 1, rate: 180000, discount: 0 },
      { desc: "Appointment Module", hsn: "998314", unit: "Set", qty: 1, rate: 45000, discount: 0 },
    ],
    taxMode: "CGST_SGST", cgstPercent: 9, sgstPercent: 9, igstPercent: 0,
    amount: 265500, paidAmount: 0, status: "Draft",
    termsAndConditions: DEFAULT_INVOICE_TERMS, certificationText: DEFAULT_INVOICE_CERTIFICATION, interestNote: DEFAULT_INVOICE_INTEREST_NOTE, jurisdictionText: DEFAULT_INVOICE_JURISDICTION,
    bankAccountHolder: "ES Electronics (India) Pvt Ltd", bankName: "Karnataka Bank Ltd", bankAccountType: "CA", bankAccountNo: "0992000100228301", bankIFSC: "KARB000099", bankBranch: "Srinagar, Bengaluru - 560050",
    authorizedName: "", authorizedDesignation: "", notes: "" },
];

const DEFAULT_PO_TERMS = [
  { label: "Price", value: "EX-Our Works" },
  { label: "Taxes", value: "GST as Indicated" },
  { label: "Delivery", value: "10 Days from PO" },
  { label: "Payment Terms", value: "50% Advance, balance 50% against delivery" },
  { label: "Warranty", value: "1 Year from the date of manufacturing" },
  { label: "Guarantee", value: "2 Years from the date of manufacturing" },
];

const SEED_PURCHASE_ORDERS = [
  { id: "PO-3001", poTitle: "PURCHASE ORDER",
    date: "2026-09-01", expectedDate: "2026-09-15", woNumber: "", woDate: "", miNumber: "", miDate: "",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    vendor: "CloudServe Data Centers", supplierAddress: "Plot 14, MIDC Industrial Area, Mumbai, MH 400093", supplierGST: "27BBBBB1111B2Z6", supplierContact: "Rakesh Nair", supplierMobile: "+91 98200 11223", supplierEmail: "sales@cloudserve.in",
    greeting: "Dear Sir,", introMessage: "We are placing our Order for the following materials/services as discussed and confirmed.",
    items: [{ desc: "Annual Server Hosting Renewal (Dedicated Plan)", unit: "Nos", qty: 1, rate: 145000 }],
    taxMode: "NONE", cgstPercent: 0, sgstPercent: 0, igstPercent: 0, otherCharges: 0, discount: 0, amount: 145000,
    terms: DEFAULT_PO_TERMS.map(t => ({ ...t })),
    authorizedName: "Admin", authorizedDesignation: "Administrator",
    status: "Approved", notes: "Annual server hosting renewal." },
  { id: "PO-3002", poTitle: "PURCHASE ORDER",
    date: "2026-09-03", expectedDate: "2026-09-10", woNumber: "", woDate: "", miNumber: "", miDate: "",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    vendor: "OfficeMart Supplies", supplierAddress: "22 Commercial Complex, Andheri West, Mumbai, MH 400058", supplierGST: "27CCCCC2222C3Z7", supplierContact: "Meena Shah", supplierMobile: "+91 90210 33445", supplierEmail: "orders@officemart.in",
    greeting: "Dear Sir,", introMessage: "We are placing our Order for the following materials/services as discussed and confirmed.",
    items: [
      { desc: "Office Desk (5ft, laminate finish)", unit: "Nos", qty: 4, rate: 6500 },
      { desc: "Ergonomic Office Chair", unit: "Nos", qty: 4, rate: 1500 },
    ],
    taxMode: "NONE", cgstPercent: 0, sgstPercent: 0, igstPercent: 0, otherCharges: 0, discount: 0, amount: 32000,
    terms: DEFAULT_PO_TERMS.map(t => ({ ...t })),
    authorizedName: "Admin", authorizedDesignation: "Administrator",
    status: "Pending", notes: "Office furniture for new hires." },
  { id: "PO-3003", poTitle: "PURCHASE ORDER",
    date: "2026-08-20", expectedDate: "2026-08-30", woNumber: "", woDate: "", miNumber: "", miDate: "",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    vendor: "TechGear Distributors", supplierAddress: "8th Floor, Tech Park, Powai, Mumbai, MH 400076", supplierGST: "27DDDDD3333D4Z8", supplierContact: "Suresh Iyer", supplierMobile: "+91 98330 55667", supplierEmail: "b2b@techgear.in",
    greeting: "Dear Sir,", introMessage: "We are placing our Order for the following materials/services as discussed and confirmed.",
    items: [{ desc: "Business Laptop (i5, 16GB RAM, 512GB SSD)", unit: "Nos", qty: 6, rate: 13000 }],
    taxMode: "NONE", cgstPercent: 0, sgstPercent: 0, igstPercent: 0, otherCharges: 0, discount: 0, amount: 78000,
    terms: DEFAULT_PO_TERMS.map(t => ({ ...t })),
    authorizedName: "Admin", authorizedDesignation: "Administrator",
    status: "Completed", notes: "Laptops for sales team." },
  { id: "PO-3004", poTitle: "PURCHASE ORDER",
    date: "2026-08-15", expectedDate: "2026-08-25", woNumber: "", woDate: "", miNumber: "", miDate: "",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    vendor: "PrintPro Solutions", supplierAddress: "12 Print House Lane, Lower Parel, Mumbai, MH 400013", supplierGST: "27EEEEE4444E5Z9", supplierContact: "Kavita Rao", supplierMobile: "+91 90112 77889", supplierEmail: "info@printpro.in",
    greeting: "Dear Sir,", introMessage: "We are placing our Order for the following materials/services as discussed and confirmed.",
    items: [{ desc: "Marketing Brochures — A4 Tri-fold, 4-colour print", unit: "Box", qty: 5, rate: 2500 }],
    taxMode: "NONE", cgstPercent: 0, sgstPercent: 0, igstPercent: 0, otherCharges: 0, discount: 0, amount: 12500,
    terms: DEFAULT_PO_TERMS.map(t => ({ ...t })),
    authorizedName: "Admin", authorizedDesignation: "Administrator",
    status: "Cancelled", notes: "Marketing brochure printing — cancelled by vendor." },
  { id: "PO-3005", poTitle: "PURCHASE ORDER",
    date: "2026-09-06", expectedDate: "2026-09-20", woNumber: "", woDate: "", miNumber: "", miDate: "",
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyAddress: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India", companyGST: "29AAACE8102C1Z3", companyEmail: "eleindia@energysaversindia.com", companyContact: "Commercial Department",
    vendor: "SecureNet Systems", supplierAddress: "45 Cyber Towers, BKC, Mumbai, MH 400051", supplierGST: "27FFFFF5555F6Z1", supplierContact: "Arjun Desai", supplierMobile: "+91 91234 99001", supplierEmail: "sales@securenet.in",
    greeting: "Dear Sir,", introMessage: "We are placing our Order for the following materials/services as discussed and confirmed.",
    items: [{ desc: "Firewall License Renewal — Annual Subscription", unit: "Nos", qty: 1, rate: 56000 }],
    taxMode: "NONE", cgstPercent: 0, sgstPercent: 0, igstPercent: 0, otherCharges: 0, discount: 0, amount: 56000,
    terms: DEFAULT_PO_TERMS.map(t => ({ ...t })),
    authorizedName: "Admin", authorizedDesignation: "Administrator",
    status: "Draft", notes: "Firewall license renewal." },
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Cheque", "Other"];

const SEED_PAYMENTS = [
  { id: "PAY-4001", customer: "Agarwal Textiles Pvt Ltd", invoiceId: "INV-1021", amount: 336300, date: "2026-09-03", method: "Bank Transfer", reference: "NEFT9938221", status: "Completed", notes: "" },
  { id: "PAY-4002", customer: "Malhotra Realty", invoiceId: "INV-1022", amount: 150000, date: "2026-08-30", method: "UPI", reference: "UPI882910", status: "Completed", notes: "Partial payment received." },
  { id: "PAY-4003", customer: "Kapoor Jewellers", invoiceId: "INV-1024", amount: 0, date: "", method: "Cheque", reference: "", status: "Pending", notes: "Awaiting cheque clearance." },
  { id: "PAY-4004", customer: "Reddy Healthcare Systems", invoiceId: "", amount: 100000, date: "2026-08-05", method: "Bank Transfer", reference: "NEFT7723918", status: "Completed", notes: "Advance payment." },
  { id: "PAY-4005", customer: "Pillai Constructions", invoiceId: "", amount: 50000, date: "2026-08-25", method: "Cash", reference: "", status: "Completed", notes: "Token advance." },
];

const EXPENSE_CATEGORIES = ["Salaries", "Office Rent", "Software & Tools", "Marketing", "Travel", "Utilities", "Miscellaneous"];

const SEED_EXPENSES = [
  { id: "EXP-5001", title: "September Office Rent", category: "Office Rent", amount: 65000, date: "2026-09-01", method: "Bank Transfer", description: "Monthly office rent payment." },
  { id: "EXP-5002", title: "Sales Team Salaries", category: "Salaries", amount: 420000, date: "2026-09-01", method: "Bank Transfer", description: "Monthly payroll for sales staff." },
  { id: "EXP-5003", title: "CRM Server Hosting", category: "Software & Tools", amount: 45000, date: "2026-09-02", method: "UPI", description: "Cloud hosting renewal." },
  { id: "EXP-5004", title: "Google Ads Campaign", category: "Marketing", amount: 28000, date: "2026-09-04", method: "Bank Transfer", description: "Lead generation ad spend." },
  { id: "EXP-5005", title: "Client Site Visit Travel", category: "Travel", amount: 9500, date: "2026-09-06", method: "Cash", description: "Travel to Pillai Constructions site." },
  { id: "EXP-5006", title: "Electricity Bill", category: "Utilities", amount: 12800, date: "2026-09-05", method: "UPI", description: "Office electricity bill." },
  { id: "EXP-5007", title: "Printer Cartridges", category: "Miscellaneous", amount: 3200, date: "2026-09-07", method: "Cash", description: "Office supplies." },
];

const SEED_INCOME = [
  { id: "INC-6001", title: "Agarwal Textiles Payment", source: "Client Payment", amount: 336300, date: "2026-09-03", reference: "INV-1021", description: "Full invoice settlement." },
  { id: "INC-6002", title: "Malhotra Realty Partial Payment", source: "Client Payment", amount: 150000, date: "2026-08-30", reference: "INV-1022", description: "Partial payment received." },
  { id: "INC-6003", title: "Reddy Healthcare Advance", source: "Advance Payment", amount: 100000, date: "2026-08-05", reference: "QT-1021", description: "Advance before invoicing." },
  { id: "INC-6004", title: "Pillai Constructions Advance", source: "Advance Payment", amount: 50000, date: "2026-08-25", reference: "LD-1009", description: "Token advance received." },
  { id: "INC-6005", title: "Consulting Service Income", source: "Consulting", amount: 35000, date: "2026-08-18", reference: "MISC-01", description: "One-time CRM consulting engagement." },
];

const SEED_NOTIFICATIONS = [
  { id: "NT-01", category: "Follow-ups", type: "warning", message: "Follow-up with Reddy Healthcare Systems is due in 30 minutes.", time: "2026-09-10 10:00", read: false, link: "followups.html" },
  { id: "NT-02", category: "Invoices", type: "danger", message: "Payment for Invoice #INV-1024 is overdue.", time: "2026-09-10 09:15", read: false, link: "invoices.html" },
  { id: "NT-03", category: "Quotations", type: "info", message: "Quotation #QT-1023 is awaiting response.", time: "2026-09-09 17:30", read: false, link: "quotations.html" },
  { id: "NT-04", category: "Leads", type: "info", message: "New lead 'Ramesh Chandran' was added from Cold Call.", time: "2026-09-09 15:10", read: true, link: "leads.html" },
  { id: "NT-05", category: "Payments", type: "success", message: "Payment of ₹1,50,000 received from Malhotra Realty.", time: "2026-09-08 12:45", read: true, link: "payments.html" },
  { id: "NT-06", category: "Leads", type: "info", message: "Lead 'Kavita Joshi' was assigned to Karan Mehta.", time: "2026-09-08 11:20", read: true, link: "leads.html" },
  { id: "NT-07", category: "Follow-ups", type: "warning", message: "Follow-up with Chandran Exports is overdue.", time: "2026-09-08 09:00", read: true, link: "followups.html" },
  { id: "NT-08", category: "Invoices", type: "info", message: "Invoice #INV-1023 was sent to Joshi Educational Trust.", time: "2026-09-05 16:00", read: true, link: "invoices.html" },
  { id: "NT-09", category: "System", type: "info", message: "Monthly financial report for August is ready to view.", time: "2026-09-01 09:00", read: true, link: "reports.html" },
  { id: "NT-10", category: "Quotations", type: "success", message: "Quotation #QT-1022 was accepted by Agarwal Textiles.", time: "2026-08-27 14:30", read: true, link: "quotations.html" },
  { id: "NT-11", category: "Payments", type: "danger", message: "Payment for Kapoor Jewellers invoice is pending clearance.", time: "2026-08-26 10:00", read: true, link: "payments.html" },
];

const SEED_CALENDAR_EVENTS = [
  { id: "EV-01", title: "Follow-up: Reddy Healthcare Systems", type: "Follow-up", date: "2026-09-10", time: "10:30", assignedTo: "U-002", relatedId: "LD-1004" },
  { id: "EV-02", title: "Site Visit: Pillai Constructions", type: "Meeting", date: "2026-09-10", time: "14:00", assignedTo: "U-002", relatedId: "LD-1009" },
  { id: "EV-03", title: "WhatsApp: Send brochure to Agarwal Textiles", type: "Follow-up", date: "2026-09-11", time: "11:00", assignedTo: "U-002", relatedId: "LD-1001" },
  { id: "EV-04", title: "Call: Deshpande Interiors", type: "Follow-up", date: "2026-09-11", time: "12:00", assignedTo: "U-003", relatedId: "LD-1002" },
  { id: "EV-05", title: "Product Demo: Nair Logistics", type: "Meeting", date: "2026-09-12", time: "15:30", assignedTo: "U-004", relatedId: "LD-1003" },
  { id: "EV-06", title: "Payment Reminder: Invoice INV-1024", type: "Payment Reminder", date: "2026-09-12", time: "09:00", assignedTo: "U-001", relatedId: "INV-1024" },
  { id: "EV-07", title: "Proposal Meeting: Joshi Educational Trust", type: "Meeting", date: "2026-09-14", time: "16:00", assignedTo: "U-006", relatedId: "LD-1006" },
  { id: "EV-08", title: "Dealer Discussion: Sethi Electronics", type: "Other", date: "2026-09-16", time: "13:00", assignedTo: "U-005", relatedId: "LD-1013" },
  { id: "EV-09", title: "Quotation Validity Ends: QT-1024", type: "Payment Reminder", date: "2026-09-18", time: "18:00", assignedTo: "U-004", relatedId: "QT-1024" },
  { id: "EV-10", title: "Team Review Meeting", type: "Meeting", date: "2026-09-15", time: "11:00", assignedTo: "U-001", relatedId: "" },
];

const SEED_ACTIVITIES = [
  { id: "AC-01", type: "lead", message: "New lead <b>Ramesh Chandran</b> added via Cold Call", time: "2026-09-09 15:10" },
  { id: "AC-02", type: "followup", message: "<b>Karan Mehta</b> completed follow-up with Kapoor Jewellers", time: "2026-09-09 12:30" },
  { id: "AC-03", type: "quote", message: "Quotation <b>#QT-1023</b> created for Joshi Educational Trust", time: "2026-09-08 16:45" },
  { id: "AC-04", type: "invoice", message: "Invoice <b>#INV-1023</b> generated for Joshi Educational Trust", time: "2026-09-05 16:00" },
  { id: "AC-05", type: "payment", message: "Payment of <b>₹1,50,000</b> received from Malhotra Realty", time: "2026-08-30 11:15" },
  { id: "AC-06", type: "expense", message: "Expense <b>Google Ads Campaign</b> of ₹28,000 recorded", time: "2026-09-04 10:00" },
  { id: "AC-07", type: "lead", message: "Lead <b>Kavita Joshi</b> assigned to Karan Mehta", time: "2026-08-08 09:30" },
];

const ROLE_PERMISSIONS = {
  // NOTE: These are UI-only restrictions for this frontend prototype.
  // Real authorization will be enforced later via Laravel middleware & policies.
  admin: ["dashboard", "leads", "meetings", "followups", "calendar", "estimations", "quotations", "invoices", "purchase-orders", "payments", "expenses", "income", "reports", "users", "roles", "notifications", "settings", "profile"],
  sales: ["dashboard", "leads", "meetings", "followups", "calendar", "quotations", "invoices", "payments", "notifications", "profile"],
};

const SEED_SETTINGS = {
  general: {
    companyName: "ES Electronics(India)Pvt. Ltd.,", companyEmail: "eleindia@energysaversindia.com", phone: "+91 80 4212 5678",
    address: "# 119, Bheemana Kuppe, Big Banyan Tree Road, Kengeri Hobli, Bangalore - 560074, Karnataka, India",
    logoInitial: "ES", gst: "29AAACE8102C1Z3", contactPerson: "Commercial Department", stateCode: "KA-29", website: "www.energysaversindia.com",
    bankAccountHolder: "ES Electronics (India) Pvt Ltd", bankName: "Karnataka Bank Ltd", bankAccountType: "CA", bankAccountNo: "0992000100228301", bankIFSC: "KARB000099", bankBranch: "Srinagar, Bengaluru - 560050",
  },
  leadStatuses: LEAD_STATUSES.slice(),
  leadTypes: LEAD_TYPES.slice(),
  followupTypes: FOLLOWUP_TYPES.slice(),
  meetingTypes: MEETING_TYPES.slice(),
  expenseCategories: EXPENSE_CATEGORIES.slice(),
  notifications: { email: true, followupReminders: true, paymentReminders: true },
  appearance: { theme: "light", sidebarBehavior: "expanded" },
  rolePermissions: JSON.parse(JSON.stringify(ROLE_PERMISSIONS)),
};

const MONTHLY_FINANCE = [
  { month: "Apr", income: 410000, expense: 320000 },
  { month: "May", income: 465000, expense: 340000 },
  { month: "Jun", income: 398000, expense: 355000 },
  { month: "Jul", income: 520000, expense: 372000 },
  { month: "Aug", income: 612000, expense: 401000 },
  { month: "Sep", income: 636300, expense: 566000 },
];

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to seed */ }
  const fresh = {
    users: SEED_USERS,
    leads: SEED_LEADS,
    followups: SEED_FOLLOWUPS,
    meetings: SEED_MEETINGS,
    quotations: SEED_QUOTATIONS,
    estimations: SEED_ESTIMATIONS,
    invoices: SEED_INVOICES,
    purchaseOrders: SEED_PURCHASE_ORDERS,
    payments: SEED_PAYMENTS,
    expenses: SEED_EXPENSES,
    income: SEED_INCOME,
    notifications: SEED_NOTIFICATIONS,
    calendarEvents: SEED_CALENDAR_EVENTS,
    activities: SEED_ACTIVITIES,
    settings: SEED_SETTINGS,
  };
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

function saveDB() {
  localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(DB));
}

function resetDB() {
  localStorage.removeItem(DB_STORAGE_KEY);
  window.location.reload();
}

const DB = loadDB();

/* ---------- Lookup helpers ---------- */
function getUserById(id) { return DB.users.find(u => u.id === id); }
function userName(id) { const u = getUserById(id); return u ? u.name : "Unassigned"; }
function getLeadById(id) { return DB.leads.find(l => l.id === id); }
function nextId(prefix, list) {
  const nums = list.map(x => parseInt(String(x.id).split("-").pop(), 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `${prefix}-${max + 1}`;
}
