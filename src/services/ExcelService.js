import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { exportFileMobile } from './MobileExportService';

const isMobile = Capacitor.getPlatform() !== 'web' && Capacitor.getPlatform() !== 'electron';

const saveExcel = async (workbook, filename) => {
    if (isMobile) {
        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        await exportFileMobile(blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
        XLSX.writeFile(workbook, filename);
    }
};

export const exportFilteredInstallmentsToExcel = (installments) => {
    const data = installments.map(ins => ({
        'installmentdate': excelDateToJSDate(ins.dueDate),
        'customerName': ins.customerName || 'N/A',
        'ChequeNo': ins.chequeNumber || '',
        'Amount': Number(ins.amount),
        'ChequeBank': ins.bank || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Filtered Installments");

    // Adjust column widths
    const wscols = [
        { wch: 15 }, // installmentdate
        { wch: 30 }, // customerName
        { wch: 20 }, // ChequeNo
        { wch: 15 }, // Amount
        { wch: 25 }  // ChequeBank
    ];
    worksheet['!cols'] = wscols;

    saveExcel(workbook, `Installments_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
};

// Helper to match fuzzy headers (e.g. "Unit  ID" -> "unitid")
const getVal = (row, keys) => {
    const rowKeys = Object.keys(row);
    for (const key of keys) {
        // Normalize search key (lowercased, no spaces)
        const searchKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Find matching row key
        const found = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === searchKey);
        if (found) return row[found];
    }
    return '';
};

const excelDateToJSDate = (val) => {
    if (!val) return '';

    // Handle Excel numeric serials
    if (typeof val === 'number' || (typeof val === 'string' && !isNaN(val) && val.trim() !== '')) {
        const serial = Number(val);
        if (serial > 20000 && serial < 100000) {
            const utc_days = Math.floor(serial - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            return date_info.toISOString().split('T')[0];
        }
    }

    // Handle strings
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // Match D-M-YYYY or D/M/YYYY (1 or 2 digits for D and M)
    const dmyRegex = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/;
    const dmyMatch = str.match(dmyRegex);
    if (dmyMatch) {
        return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }

    // Try native Date parsing
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    return str;
};

// Helper: clean price values - strips currency symbols, commas, spaces, and extracts number
const cleanPrice = (val) => {
    if (!val && val !== 0) return '';
    if (typeof val === 'number') return val;
    // Remove currency symbols (EGP, $, €, £), commas, spaces, m², sqm etc.
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const num = Number(cleaned);
    return isNaN(num) ? '' : num;
};

// Helper: clean area value - extract just the number portion
const cleanArea = (val) => {
    if (!val && val !== 0) return '';
    if (typeof val === 'number') return String(val);
    // Remove m², sqm, sq, etc. and trim
    const cleaned = String(val).replace(/m²|m2|sqm|sq\.?m?\.?|متر/gi, '').trim();
    return cleaned;
};

// Helper: normalize status to lowercase valid values
const normalizeStatus = (val) => {
    const raw = String(val || '').toLowerCase().trim();
    // Map common variations to valid status values
    if (['contract', 'contracted', 'sold', 'تعاقد'].includes(raw)) return 'contract';
    if (['locked', 'reserved', 'hold', 'محجوز'].includes(raw)) return 'locked';
    if (['available', 'free', 'vacant', 'متاح'].includes(raw)) return 'available';
    return raw || 'available';
};

export const parseUnitsExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const units = json.map(row => {
                    const rawPrice = getVal(row, ['Base Price', 'Current Price', 'Price', 'Total Price', 'Asking Price', 'Sale Price', 'Unit Price', 'Amount', 'Cost', 'Value', 'SalePrice', 'UnitPrice', 'TotalPrice', 'CurrentPrice', 'BasePrice', 'سعر', 'السعر']);
                    const rawFinished = getVal(row, ['Finished', 'Finished Price', 'Finishing', 'Finished Cost', 'Finishing Price', 'With Finishing', 'FinishedPrice', 'Finish Price', 'Complete Price', 'تشطيب', 'سعر التشطيب']);
                    const rawArea = getVal(row, ['Area (sqm)', 'Area(sqm)', 'Area', 'Size', 'Sqm', 'Space']);

                    return {
                        unitId: String(getVal(row, ['UnitID', 'Unit ID', 'ID', 'Code', 'Unit Code', 'Unit_ID', 'Unit No', 'U_ID', 'Unit', 'No', 'Number']) || '').trim(),
                        floor: String(getVal(row, ['Floor', 'Level']) || '').trim(),
                        area: cleanArea(rawArea),
                        view: String(getVal(row, ['View', 'Orientation']) || '').trim(),
                        price: cleanPrice(rawPrice),
                        finishedPrice: cleanPrice(rawFinished),
                        share: String(getVal(row, ['Share']) || '').trim(),
                        plan: String(getVal(row, ['Plan', 'Payment Plan', 'PaymentPlan', 'Payment_Plan', 'Schedule', 'System', 'نظام', 'نظام السداد']) || '').trim(),
                        status: normalizeStatus(getVal(row, ['State', 'Status', 'Availability']))
                    };
                }).filter(u => u.unitId); // Filter out rows with no Unit ID

                // Extract headers from the first row for debugging
                const detectedHeaders = json.length > 0 ? Object.keys(json[0]) : [];

                resolve({ units, headers: detectedHeaders });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const exportInstallmentsToExcel = (installments) => {
    const data = installments.map(ins => ({
        'Unit ID': ins.unitId,
        'Customer': ins.customerName || 'N/A',
        'Type': ins.type,
        'Amount': Number(ins.amount),
        'Paid Amount': Number(ins.paidAmount || 0),
        'Rest': Number(ins.amount) - Number(ins.paidAmount || 0),
        'Due Date': ins.dueDate,
        'Method': ins.paymentMethod,
        'Cheque No': ins.chequeNumber || '',
        'Bank': ins.bank || '',
        'Status': ins.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Installments");

    // Fix column widths for better readability
    const wscols = [
        { wch: 15 }, // Unit ID
        { wch: 25 }, // Customer
        { wch: 20 }, // Type
        { wch: 12 }, // Amount
        { wch: 12 }, // Paid
        { wch: 12 }, // Rest
        { wch: 15 }, // Date
        { wch: 15 }, // Method
        { wch: 15 }, // Cheque No
        { wch: 20 }, // Bank
        { wch: 12 }  // Status
    ];
    worksheet['!cols'] = wscols;

    saveExcel(workbook, `Installments_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportContractsToExcel = (contracts, customers = [], sales = []) => {
    const data = contracts.map(con => {
        const customer = customers.find(c => c.id === con.customerId);
        const guarantorDetails = con.guarantor ? customers.find(c => c.id === con.guarantor.id) : null;
        const salesAgent = con.salesId ? sales.find(s => s.id === con.salesId) : null;

        const row = {
            'Contract ID': con.id,
            'Offer ID': con.offerId || '',
            'Unit ID': con.unitId,
            'Customer': customer ? customer.name : (con.customerName || con.customerId),
            'ID Number': con.idNumber,
            'Phone': customer ? customer.phone : (con.phone || ''),
            'Date': con.date,
            'Total Price': Number(con.totalPrice),
            'Down Payment %': Number(con.downPayment),
            'Years': Number(con.years),
            'Frequency': con.frequency,
            'Sales ID': con.salesId || '',
            'Sales Agent': salesAgent ? salesAgent.name : '',
            'Guarantor Name': guarantorDetails ? guarantorDetails.name : (con.guarantor ? con.guarantor.name : ''),
            'Guarantor ID': con.guarantor ? con.guarantor.id : '',
            'Guarantor Phone': guarantorDetails ? guarantorDetails.phone : (con.guarantor ? con.guarantor.phone : '')
        };

        // Add up to 5 Joint Purchasers
        const joint = con.jointPurchasers || [];
        for (let i = 1; i <= 5; i++) {
            const jp = joint[i - 1] || {};
            const jpDetails = jp.id ? customers.find(c => c.id === jp.id) : null;
            row[`Joint ${i} Name`] = jpDetails ? jpDetails.name : (jp.name || '');
            row[`Joint ${i} ID`] = jp.id || '';
            row[`Joint ${i} Phone`] = jpDetails ? jpDetails.phone : (jp.phone || '');
        }

        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Contracts");
    saveExcel(workbook, `Contracts_List_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportCustomersToExcel = (customers) => {
    const data = customers.map(cus => ({
        'Customer ID': String(cus.id || '').trim(),
        'Customer Name': String(cus.name || '').trim(),
        'Phone 1': String(cus.phone || '').trim(),
        'Phone 2': String(cus.phone2 || '').trim(),
        'Email': String(cus.email || '').trim(),
        'ID Number': String(cus.idNumber || '').trim(),
        'ID Type': String(cus.idType || '').trim(),
        'Blood Type': String(cus.bloodType || '').trim(),
        'Direct/Indirect': String(cus.directIndirect || '').trim()
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');

    const wscols = [
        { wch: 15 }, // Customer ID
        { wch: 28 }, // Customer Name
        { wch: 18 }, // Phone 1
        { wch: 18 }, // Phone 2
        { wch: 25 }, // Email
        { wch: 18 }, // ID Number
        { wch: 14 }, // ID Type
        { wch: 12 }, // Blood Type
        { wch: 16 }  // Direct/Indirect
    ];
    worksheet['!cols'] = wscols;

    saveExcel(workbook, `Customers_List_${new Date().toISOString().split('T')[0]}.xlsx`);
};

const parseNumber = (val) => {
    if (!val) return 0;
    // content might be number already
    if (typeof val === 'number') return val;
    // remove currenty symbols, commas, spaces
    const clean = String(val).replace(/[^0-9.-]/g, '');
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
};

export const parseInstallmentsExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const installments = json.map(row => ({
                    id: 'INS-' + Date.now() + Math.random().toString(36).substr(2, 5),
                    contractId: String(getVal(row, ['Contract ID', 'ContractID', 'Contract', 'Code']) || ''),
                    unitId: String(getVal(row, ['Unit ID', 'UnitID', 'Unit']) || ''),
                    customerName: String(getVal(row, ['Customer', 'Client', 'Buyer', 'Name']) || ''),
                    type: String(getVal(row, ['Type', 'Label']) || 'Installment'),
                    amount: parseNumber(getVal(row, ['Amount', 'Total', 'Value'])),
                    paidAmount: parseNumber(getVal(row, ['Paid Amount', 'Paid', 'Collected', 'Received'])),
                    dueDate: excelDateToJSDate(getVal(row, ['Due Date', 'Date', 'Due'])),
                    paymentMethod: String(getVal(row, ['Method', 'Payment Method', 'Pay Method']) || 'CASH'),
                    chequeNumber: String(getVal(row, ['Cheque No', 'Cheque Number', 'Check', 'Cheque']) || ''),
                    bank: String(getVal(row, ['Bank', 'Bank Name']) || ''),
                    chequeStatus: String(getVal(row, ['Cheque Status', 'Chq Status', 'ChqState']) || 'Received'),
                    salesId: String(getVal(row, ['Cell', '(Reason)', 'Reason', 'Sales Agent', 'Agent', 'Sales', 'Seller', 'Source']) || ''),
                    depositedBank: String(getVal(row, ['Deposited At', 'Deposited Bank', 'Dep Bank', 'Collected At']) || ''),
                    status: String(getVal(row, ['Status', 'State']) || 'Pending'),
                    notes: String(getVal(row, ['Notes', 'Note', 'Remarks', 'Comment']) || '')
                }));

                resolve(installments);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const parseContractsExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const contracts = json.map(row => {
                    const jointPurchasers = [];
                    const jpPatterns = ["Joint ID", "JointID", "JP ID", "JPID", "Joint Purchaser ID", "Joint Code", "Partner ID"];
                    for (let i = 1; i <= 5; i++) {
                        const searchKeys = jpPatterns.map(p => `${p} ${i}`).concat(jpPatterns.map(p => `${p}${i}`));
                        const id = String(getVal(row, searchKeys) || '').trim();
                        if (id) {
                            jointPurchasers.push({ id });
                        }
                    }

                    let rawDate = getVal(row, ['Contract Date', 'Date']);
                    let formattedDate = rawDate;
                    if (typeof rawDate === 'number') {
                        formattedDate = excelDateToJSDate(rawDate);
                    } else if (rawDate) {
                        formattedDate = String(rawDate).trim();
                    } else {
                        formattedDate = new Date().toISOString().split('T')[0];
                    }

                    return {
                        id: String(getVal(row, ['Contract ID', 'ContractID', 'ID']) || 'CON-' + Date.now() + Math.random().toString(36).substr(2, 5)).trim(),
                        offerId: String(getVal(row, ['Offer ID', 'OfferID']) || '').trim(),
                        unitId: String(getVal(row, ['Unit ID', 'UnitID', 'Unit']) || '').trim(),
                        customerId: String(getVal(row, ['Customer ID', 'CustomerID', 'ID', 'No', 'Code']) || '').trim(),
                        date: formattedDate,
                        totalPrice: Number(getVal(row, ['Unit Price', 'UnitPrice', 'Price', 'Amount', 'Total Price']) || 0),
                        jointPurchasers: jointPurchasers,
                        guarantor: {
                            id: String(getVal(row, ['Guarantor ID', 'Guarantor National ID', 'Guarantor ID Number']) || '').trim()
                        },
                        salesId: String(getVal(row, ['Sales ID', 'SalesID', 'Sales Code', 'Sold By ID', 'Agent ID', 'Broker ID', 'Sales', 'Seller']) || '').trim()
                    };
                });

                resolve(contracts);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const parseCustomersExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];

                // Use defval: '' to ensure all rows have all keys
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const customers = json.map(row => {
                    const name = String(getVal(row, ['Customer Name', 'Name', 'Client', 'الاسم', 'اسم العميل', 'Customer', 'Full Name', 'Buyer']) || '').trim();
                    const phone = String(getVal(row, ['Phone', 'Phone 1', 'Mobile', 'Mobile Number', 'Phone Number', 'الهاتف', 'الموبايل', 'رقم الهاتف', 'Mobile 1', 'Tel', 'Contact']) || '').trim();
                    const phone2 = String(getVal(row, ['Phone 2', 'Mobile 2', 'الهاتف 2', 'الموبايل 2', 'Second Phone', 'Other Phone', 'Alt Phone', 'Phone2']) || '').trim();
                    const email = String(getVal(row, ['Email', 'Mail', 'E-mail', 'E-Mail', 'البريد', 'Email Address']) || '').trim();
                    const idNumber = String(getVal(row, ['ID Number', 'National ID', 'SSN', 'رقم البطاقة', 'رقم الهوية', 'Passport', 'Card Number', 'NID']) || '').trim();
                    const idType = String(getVal(row, ['ID Type', 'Type of ID', 'نوع الهوية', 'Document Type', 'IDType']) || '').trim();
                    const bloodType = String(getVal(row, ['Blood Type', 'Blood', 'فصيلة الدم', 'BloodType']) || '').trim();
                    const directIndirect = String(getVal(row, ['Direct/Indirect', 'Direct', 'Direct / Indirect', 'Type', 'Source', 'DirectIndirect']) || '').trim();

                    // System ID: try multiple columns, auto-generate if missing
                    let systemId = String(getVal(row, ['Customer ID', 'No', 'Code', 'CustID', 'رقم العميل', 'كود', 'المسلسل', 'ID', 'System ID', 'Cust No', 'Number']) || '').trim();

                    // Auto-generate ID if missing
                    if (!systemId) {
                        systemId = 'CUS-' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
                    }

                    // Use name as fallback if available
                    const finalName = name || 'Customer ' + systemId;

                    return {
                        id: systemId,
                        name: finalName,
                        phone: phone,
                        phone2: phone2,
                        email: email,
                        idNumber: idNumber,
                        idType: idType,
                        bloodType: bloodType,
                        directIndirect: directIndirect
                    };
                }).filter(c => c.name && c.name.trim() !== '' && !c.name.startsWith('Customer CUS-')); // Filter rows with no meaningful data

                // Get detected headers for the UI to display
                const detectedHeaders = json.length > 0 ? Object.keys(json[0]) : [];

                resolve({ customers, headers: detectedHeaders });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const parseSalesExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const sales = json.map(row => {
                    const id = String(getVal(row, ['Sales ID', 'ID', 'Code', 'SalesID', 'SalesCode']) || '');
                    const name = String(getVal(row, ['Sales Name', 'Name', 'Sales Agent', 'Agent Name', 'SalesName']) || '');
                    const phone = String(getVal(row, ['Phone', 'Mobile', 'Mobile Number', 'Phone Number', 'Sales Phone']) || '');

                    return {
                        id: id,
                        name: name,
                        phone: phone
                    };
                });

                resolve(sales);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

// Helper: capitalize status for display in Excel
const formatStatusForExport = (status) => {
    const s = String(status || 'available').toLowerCase().trim();
    if (s === 'contract') return 'Contract';
    if (s === 'locked') return 'Locked';
    if (s === 'available') return 'Available';
    // Capitalize first letter for any other status
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export const exportBuildingUnitsToExcel = (building) => {
    if (!building || !building.units || building.units.length === 0) return;

    const data = building.units.map(u => ({
        'Unit ID': String(u.unitId || '').trim(),
        'Floor': String(u.floor || '').trim(),
        'Area (sqm)': String(u.area || '').replace(/m²|m2|sqm/gi, '').trim(),
        'View': String(u.view || '').trim(),
        'Base Price': Number(u.price) || 0,
        'Finished Price': Number(u.finishedPrice) || 0,
        'Share': String(u.share || '').trim(),
        'Payment Plan': String(u.plan || '').trim(),
        'Status': formatStatusForExport(u.status)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();

    // Ensure sheet name is valid (max 31 chars, no special chars)
    let sheetName = (building.name || 'Units').replace(/[\[\]\*?\/\\:]/g, '-');
    if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const wscols = [
        { wch: 15 }, // Unit ID
        { wch: 12 }, // Floor
        { wch: 12 }, // Area (sqm)
        { wch: 22 }, // View
        { wch: 18 }, // Base Price
        { wch: 18 }, // Finished Price
        { wch: 12 }, // Share
        { wch: 18 }, // Payment Plan
        { wch: 14 }  // Status
    ];
    worksheet['!cols'] = wscols;

    // Format price columns as numbers with comma separators
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
        // Base Price is column E (index 4), Finished Price is column F (index 5)
        for (const col of [4, 5]) {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            if (worksheet[cellRef] && typeof worksheet[cellRef].v === 'number') {
                worksheet[cellRef].t = 'n';
                worksheet[cellRef].z = '#,##0';
            }
        }
    }

    const safeName = (building.name || 'Building').replace(/[^a-zA-Z0-9_-]/g, '_');
    saveExcel(workbook, `${safeName}_Units_${new Date().toISOString().split('T')[0]}.xlsx`);
};

