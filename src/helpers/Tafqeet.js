/**
 * Tafqeet Helper - Converts numbers to Arabic words
 * Professional implementation for currency and cheques
 */

const units = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
const teens = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const tens = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const hundreds = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثماني مائة", "تسعمائة"];

const convert3Digits = (n) => {
    let result = "";
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) result += hundreds[h];

    if (t === 0 && u > 0) {
        if (h > 0) result += " و ";
        result += units[u];
    } else if (t === 1) {
        if (h > 0) result += " و ";
        result += teens[u];
    } else if (t > 1) {
        if (h > 0) result += " و ";
        if (u > 0) result += units[u] + " و ";
        result += tens[t];
    }

    return result;
};

export const tafqeet = (number) => {
    if (number === 0) return "صفر";
    if (!number || isNaN(number)) return "";

    const integerPart = Math.floor(number);
    const fractionPart = Math.round((number - integerPart) * 100);

    let result = "";

    const billions = Math.floor(integerPart / 1000000000);
    const millions = Math.floor((integerPart % 1000000000) / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const reminder = integerPart % 1000;

    if (billions > 0) {
        if (billions === 1) result += "مليار";
        else if (billions === 2) result += "ملياران";
        else result += convert3Digits(billions) + " مليار";
    }

    if (millions > 0) {
        if (result !== "") result += " و ";
        if (millions === 1) result += "مليون";
        else if (millions === 2) result += "مليونان";
        else if (millions <= 10) result += convert3Digits(millions) + " ملايين";
        else result += convert3Digits(millions) + " مليون";
    }

    if (thousands > 0) {
        if (result !== "") result += " و ";
        if (thousands === 1) result += "ألف";
        else if (thousands === 2) result += "ألفين";
        else if (thousands <= 10) result += convert3Digits(thousands) + " آلاف";
        else result += convert3Digits(thousands) + " ألف";
    }

    if (reminder > 0) {
        if (result !== "") result += " و ";
        result += convert3Digits(reminder);
    }

    result += " جنيهاً مصرياً";

    if (fractionPart > 0) {
        result += " و " + convert3Digits(fractionPart) + " قرشاً";
    }

    return result + " فقط لا غير";
};
