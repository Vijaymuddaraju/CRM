/* ==========================================================================
   MOCK DATA LAYER
   All data below simulates what will eventually come from the Laravel/MySQL
   API. Everything is namespaced under window.DB so it can later be swapped
   for real fetch() calls without touching page logic.
   Persisted to localStorage on first load so edits made in the UI survive
   a refresh (simulating persistence without a real backend).
   ========================================================================== */

const DB_STORAGE_KEY = "crm_mock_db_v2";

const SEED_USERS = [
  { id: "U-001", name: "Admin", email: "admin@example.com", password: "admin123", role: "admin", phone: "+91 98765 43210", status: "active", joined: "2024-01-10", lastLogin: "2026-09-10 09:12", avatarColor: "#4f46e5" },
  { id: "U-002", name: "Rahul Verma", email: "sales@example.com", password: "sales123", role: "sales", phone: "+91 98220 11223", status: "active", joined: "2024-02-14", lastLogin: "2026-09-10 08:40", avatarColor: "#0891b2" },
  { id: "U-003", name: "Priya Sharma", email: "priya.sharma@example.com", password: "sales123", role: "sales", phone: "+91 99887 66554", status: "active", joined: "2024-03-02", lastLogin: "2026-09-09 18:22", avatarColor: "#d97706" },
  { id: "U-004", name: "Amit Kulkarni", email: "amit.kulkarni@example.com", password: "sales123", role: "sales", phone: "+91 90123 45678", status: "active", joined: "2024-05-19", lastLogin: "2026-09-09 17:05", avatarColor: "#16a34a" },
  { id: "U-005", name: "Sneha Iyer", email: "sneha.iyer@example.com", password: "sales123", role: "sales", phone: "+91 91234 56780", status: "inactive", joined: "2024-07-08", lastLogin: "2026-08-28 11:00", avatarColor: "#dc2626" },
  { id: "U-006", name: "Karan Mehta", email: "karan.mehta@example.com", password: "sales123", role: "sales", phone: "+91 93456 12780", status: "active", joined: "2024-09-23", lastLogin: "2026-09-10 07:55", avatarColor: "#7c3aed" },
];

const LEAD_SOURCES = ["Website", "Referral", "Cold Call", "Social Media", "Trade Show", "Google Ads", "Email Campaign", "Walk-in"];
const LEAD_STATUSES = ["New", "Contacted", "Follow-up", "Qualified", "Converted", "Lost"];
const PRIORITIES = ["High", "Medium", "Low"];

const SEED_LEADS = [
  { id: "LD-1001", name: "Rohit Agarwal", company: "Agarwal Textiles Pvt Ltd", phone: "+91 98111 22334", altPhone: "", email: "rohit@agarwaltextiles.in", source: "Website", requirement: "Bulk fabric ERP + billing solution", status: "Qualified", priority: "High", assignedTo: "U-002", expectedValue: 285000, expectedClosing: "2026-09-25", lastContact: "2026-09-08", nextFollowup: "2026-09-11", created: "2026-08-20", notes: "Interested in annual contract with onboarding support." },
  { id: "LD-1002", name: "Sanjana Deshpande", company: "Deshpande Interiors", phone: "+91 90222 33445", altPhone: "+91 90222 99881", email: "sanjana@deshpandeinteriors.com", source: "Referral", requirement: "Design project CRM for client tracking", status: "New", priority: "Medium", assignedTo: "U-003", expectedValue: 120000, expectedClosing: "2026-10-05", lastContact: "", nextFollowup: "2026-09-11", created: "2026-09-05", notes: "" },
  { id: "LD-1003", name: "Vikram Nair", company: "Nair Logistics", phone: "+91 98333 44556", altPhone: "", email: "vikram.nair@nairlogistics.co.in", source: "Cold Call", requirement: "Fleet + invoicing management", status: "Contacted", priority: "Medium", assignedTo: "U-004", expectedValue: 450000, expectedClosing: "2026-10-15", lastContact: "2026-09-07", nextFollowup: "2026-09-12", created: "2026-08-15", notes: "Wants a live demo next week." },
  { id: "LD-1004", name: "Ananya Reddy", company: "Reddy Healthcare Systems", phone: "+91 97444 55667", altPhone: "", email: "ananya@reddyhealthcare.in", source: "Trade Show", requirement: "Patient billing and CRM integration", status: "Follow-up", priority: "High", assignedTo: "U-002", expectedValue: 620000, expectedClosing: "2026-09-30", lastContact: "2026-09-09", nextFollowup: "2026-09-10", created: "2026-08-10", notes: "Budget approved, awaiting final quotation." },
  { id: "LD-1005", name: "Manoj Tiwari", company: "Tiwari Automobiles", phone: "+91 96555 66778", altPhone: "", email: "manoj@tiwariauto.com", source: "Google Ads", requirement: "Showroom lead + service CRM", status: "New", priority: "Low", assignedTo: "U-005", expectedValue: 95000, expectedClosing: "2026-10-20", lastContact: "", nextFollowup: "2026-09-13", created: "2026-09-06", notes: "" },
  { id: "LD-1006", name: "Kavita Joshi", company: "Joshi Educational Trust", phone: "+91 95666 77889", altPhone: "", email: "kavita.joshi@joshitrust.org", source: "Referral", requirement: "Admissions and fee management CRM", status: "Qualified", priority: "High", assignedTo: "U-006", expectedValue: 340000, expectedClosing: "2026-09-22", lastContact: "2026-09-06", nextFollowup: "2026-09-14", created: "2026-08-01", notes: "Comparing with two other vendors." },
  { id: "LD-1007", name: "Arjun Malhotra", company: "Malhotra Realty", phone: "+91 94777 88990", altPhone: "+91 94777 00112", email: "arjun@malhotrarealty.in", source: "Social Media", requirement: "Property lead tracking system", status: "Converted", priority: "Medium", assignedTo: "U-003", expectedValue: 275000, expectedClosing: "2026-08-28", lastContact: "2026-08-27", nextFollowup: "", created: "2026-07-18", notes: "Deal closed, onboarding in progress." },
  { id: "LD-1008", name: "Deepika Rao", company: "Rao Fashion House", phone: "+91 93888 99001", altPhone: "", email: "deepika@raofashion.in", source: "Email Campaign", requirement: "E-commerce order and CRM sync", status: "Lost", priority: "Low", assignedTo: "U-004", expectedValue: 80000, expectedClosing: "2026-08-15", lastContact: "2026-08-12", nextFollowup: "", created: "2026-07-25", notes: "Chose a competitor with lower pricing." },
  { id: "LD-1009", name: "Suresh Pillai", company: "Pillai Constructions", phone: "+91 92999 00112", altPhone: "", email: "suresh@pillaiconstructions.com", source: "Walk-in", requirement: "Project + vendor payment tracking", status: "Contacted", priority: "High", assignedTo: "U-002", expectedValue: 510000, expectedClosing: "2026-10-01", lastContact: "2026-09-08", nextFollowup: "2026-09-10", created: "2026-08-22", notes: "Needs multi-site support." },
  { id: "LD-1010", name: "Neha Kapoor", company: "Kapoor Jewellers", phone: "+91 91000 11223", altPhone: "", email: "neha@kapoorjewellers.in", source: "Referral", requirement: "Customer loyalty + billing CRM", status: "Follow-up", priority: "Medium", assignedTo: "U-006", expectedValue: 190000, expectedClosing: "2026-09-28", lastContact: "2026-09-05", nextFollowup: "2026-09-12", created: "2026-08-18", notes: "" },
  { id: "LD-1011", name: "Ramesh Chandran", company: "Chandran Exports", phone: "+91 90111 22335", altPhone: "", email: "ramesh@chandranexports.com", source: "Cold Call", requirement: "Export order + shipment CRM", status: "New", priority: "Medium", assignedTo: "U-003", expectedValue: 375000, expectedClosing: "2026-10-10", lastContact: "", nextFollowup: "2026-09-15", created: "2026-09-07", notes: "" },
  { id: "LD-1012", name: "Pooja Bhatt", company: "Bhatt Wellness Clinic", phone: "+91 89222 33446", altPhone: "", email: "pooja@bhattwellness.in", source: "Google Ads", requirement: "Appointment + billing CRM", status: "Qualified", priority: "High", assignedTo: "U-004", expectedValue: 225000, expectedClosing: "2026-09-24", lastContact: "2026-09-07", nextFollowup: "2026-09-11", created: "2026-08-12", notes: "Ready to sign after quotation revision." },
  { id: "LD-1013", name: "Gaurav Sethi", company: "Sethi Electronics", phone: "+91 88333 44557", altPhone: "", email: "gaurav@sethielectronics.com", source: "Trade Show", requirement: "Dealer network CRM", status: "Contacted", priority: "Low", assignedTo: "U-005", expectedValue: 145000, expectedClosing: "2026-10-18", lastContact: "2026-09-04", nextFollowup: "2026-09-16", created: "2026-08-28", notes: "" },
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

const SEED_QUOTATIONS = [
  { id: "QT-1021", leadId: "LD-1004", customer: "Reddy Healthcare Systems", amount: 620000, date: "2026-09-01", validUntil: "2026-09-20", status: "Sent", createdBy: "U-002",
    items: [
      { desc: "CRM Annual License (50 users)", qty: 1, rate: 480000, discount: 5, tax: 18 },
      { desc: "Onboarding & Training", qty: 1, rate: 80000, discount: 0, tax: 18 },
      { desc: "Custom Integration Module", qty: 1, rate: 60000, discount: 0, tax: 18 },
    ] },
  { id: "QT-1022", leadId: "LD-1001", customer: "Agarwal Textiles Pvt Ltd", amount: 285000, date: "2026-08-25", validUntil: "2026-09-15", status: "Accepted", createdBy: "U-002",
    items: [
      { desc: "CRM Annual License (20 users)", qty: 1, rate: 220000, discount: 5, tax: 18 },
      { desc: "Billing Module Setup", qty: 1, rate: 65000, discount: 0, tax: 18 },
    ] },
  { id: "QT-1023", leadId: "LD-1006", customer: "Joshi Educational Trust", amount: 340000, date: "2026-09-02", validUntil: "2026-09-21", status: "Sent", createdBy: "U-006",
    items: [
      { desc: "Admissions CRM License", qty: 1, rate: 260000, discount: 0, tax: 18 },
      { desc: "Fee Management Module", qty: 1, rate: 80000, discount: 0, tax: 18 },
    ] },
  { id: "QT-1024", leadId: "LD-1012", customer: "Bhatt Wellness Clinic", amount: 225000, date: "2026-09-04", validUntil: "2026-09-18", status: "Draft", createdBy: "U-004",
    items: [
      { desc: "Clinic CRM License", qty: 1, rate: 180000, discount: 0, tax: 18 },
      { desc: "Appointment Module", qty: 1, rate: 45000, discount: 0, tax: 18 },
    ] },
  { id: "QT-1025", leadId: "LD-1008", customer: "Rao Fashion House", amount: 80000, date: "2026-08-01", validUntil: "2026-08-15", status: "Rejected", createdBy: "U-004",
    items: [
      { desc: "E-commerce Sync Module", qty: 1, rate: 80000, discount: 0, tax: 18 },
    ] },
  { id: "QT-1026", leadId: "LD-1003", customer: "Nair Logistics", amount: 450000, date: "2026-08-20", validUntil: "2026-09-05", status: "Expired", createdBy: "U-004",
    items: [
      { desc: "Fleet Management CRM", qty: 1, rate: 350000, discount: 0, tax: 18 },
      { desc: "Invoicing Module", qty: 1, rate: 100000, discount: 0, tax: 18 },
    ] },
];

const SEED_INVOICES = [
  { id: "INV-1021", quotationId: "QT-1022", customer: "Agarwal Textiles Pvt Ltd", invoiceDate: "2026-09-02", dueDate: "2026-09-16", amount: 336300, paidAmount: 336300, status: "Paid" },
  { id: "INV-1022", quotationId: "QT-1007", customer: "Malhotra Realty", invoiceDate: "2026-08-29", dueDate: "2026-09-12", amount: 324500, paidAmount: 150000, status: "Partially Paid" },
  { id: "INV-1023", quotationId: "QT-1023", customer: "Joshi Educational Trust", invoiceDate: "2026-09-05", dueDate: "2026-09-19", amount: 401200, paidAmount: 0, status: "Sent" },
  { id: "INV-1024", quotationId: "QT-1010", customer: "Kapoor Jewellers", invoiceDate: "2026-08-10", dueDate: "2026-08-24", amount: 224200, paidAmount: 0, status: "Overdue" },
  { id: "INV-1025", quotationId: "QT-1024", customer: "Bhatt Wellness Clinic", invoiceDate: "2026-09-08", dueDate: "2026-09-22", amount: 265500, paidAmount: 0, status: "Draft" },
];

const SEED_PURCHASE_ORDERS = [
  { id: "PO-3001", vendor: "CloudServe Data Centers", date: "2026-09-01", expectedDate: "2026-09-15", amount: 145000, status: "Approved", notes: "Annual server hosting renewal." },
  { id: "PO-3002", vendor: "OfficeMart Supplies", date: "2026-09-03", expectedDate: "2026-09-10", amount: 32000, status: "Pending", notes: "Office furniture for new hires." },
  { id: "PO-3003", vendor: "TechGear Distributors", date: "2026-08-20", expectedDate: "2026-08-30", amount: 78000, status: "Completed", notes: "Laptops for sales team." },
  { id: "PO-3004", vendor: "PrintPro Solutions", date: "2026-08-15", expectedDate: "2026-08-25", amount: 12500, status: "Cancelled", notes: "Marketing brochure printing — cancelled by vendor." },
  { id: "PO-3005", vendor: "SecureNet Systems", date: "2026-09-06", expectedDate: "2026-09-20", amount: 56000, status: "Draft", notes: "Firewall license renewal." },
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
  admin: ["dashboard", "leads", "followups", "calendar", "quotations", "invoices", "purchase-orders", "payments", "expenses", "income", "reports", "users", "roles", "notifications", "settings", "profile"],
  sales: ["dashboard", "leads", "followups", "calendar", "quotations", "invoices", "payments", "notifications", "profile"],
};

const SEED_SETTINGS = {
  general: { companyName: "CRM", companyEmail: "info@crm.com", phone: "+91 22 4000 1234", address: "501, Business Bay, Andheri East, Mumbai, MH 400069", logoInitial: "CR" },
  leadStatuses: LEAD_STATUSES.slice(),
  leadSources: LEAD_SOURCES.slice(),
  followupTypes: FOLLOWUP_TYPES.slice(),
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
    quotations: SEED_QUOTATIONS,
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
