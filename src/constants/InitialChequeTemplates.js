export const INITIAL_CHEQUE_TEMPLATES = [
    {
        id: 'cib',
        name: 'CIB (Commercial International Bank)',
        dimensions: { width: 175, height: 85 },
        offsets: {
            payee: { x: 40, y: 28, fontSize: 13 },
            amount: { x: 145, y: 28, fontSize: 14 },
            tafqeet: { x: 35, y: 42, fontSize: 11 },
            date: { x: 142, y: 12, fontSize: 12 },
            crossing: { x: 15, y: 15, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 },
            customer: { x: 35, y: 70, show: true, fontSize: 10 }
        }
    },
    {
        id: 'qnb',
        name: 'QNB ALAHLI',
        dimensions: { width: 175, height: 85 },
        offsets: {
            payee: { x: 38, y: 30, fontSize: 13 },
            amount: { x: 148, y: 30, fontSize: 14 },
            tafqeet: { x: 38, y: 45, fontSize: 11 },
            date: { x: 145, y: 14, fontSize: 12 },
            crossing: { x: 12, y: 12, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 },
            customer: { x: 38, y: 72, show: true, fontSize: 10 }
        }
    },
    {
        id: 'nbe',
        name: 'National Bank of Egypt (NBE)',
        dimensions: { width: 175, height: 85 },
        offsets: {
            payee: { x: 42, y: 32, fontSize: 13 },
            amount: { x: 150, y: 32, fontSize: 14 },
            tafqeet: { x: 42, y: 48, fontSize: 11 },
            date: { x: 148, y: 16, fontSize: 12 },
            crossing: { x: 18, y: 18, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 },
            customer: { x: 42, y: 75, show: true, fontSize: 10 }
        }
    },
    {
        id: 'misr',
        name: 'Banque Misr',
        dimensions: { width: 175, height: 85 },
        offsets: {
            payee: { x: 40, y: 30, fontSize: 13 },
            amount: { x: 145, y: 30, fontSize: 14 },
            tafqeet: { x: 40, y: 45, fontSize: 11 },
            date: { x: 140, y: 15, fontSize: 12 },
            crossing: { x: 15, y: 20, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 },
            customer: { x: 40, y: 70, show: true, fontSize: 10 }
        }
    },
    {
        id: 'hsbc',
        name: 'HSBC Egypt',
        dimensions: { width: 175, height: 85 },
        offsets: {
            payee: { x: 35, y: 25, fontSize: 13 },
            amount: { x: 155, y: 25, fontSize: 14 },
            tafqeet: { x: 35, y: 38, fontSize: 11 },
            date: { x: 150, y: 10, fontSize: 12 },
            crossing: { x: 10, y: 10, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 },
            customer: { x: 35, y: 65, show: true, fontSize: 10 }
        }
    },
    {
        id: 'alex',
        name: 'Alex Bank',
        dimensions: { width: 175, height: 85 },
        offsets: {
            payee: { x: 45, y: 35, fontSize: 13 },
            amount: { x: 140, y: 35, fontSize: 14 },
            tafqeet: { x: 45, y: 50, fontSize: 11 },
            date: { x: 135, y: 20, fontSize: 12 },
            crossing: { x: 20, y: 25, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 },
            customer: { x: 45, y: 78, show: true, fontSize: 10 }
        }
    }
];
