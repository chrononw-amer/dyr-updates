import { getCompanyBranding } from './DataService';
import { AMIRI_FONT_BASE64 } from './AmiriFont';

// Constants for A4 page (in mm)
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const HEADER_HEIGHT = 40; // Adjust based on your image aspect ratio
const FOOTER_HEIGHT = 30; // Adjust based on your image aspect ratio

// Landscape dimensions (A4 rotated)
const LANDSCAPE_PAGE_WIDTH = 297;
const LANDSCAPE_PAGE_HEIGHT = 210;
const LANDSCAPE_HEADER_HEIGHT = 40;
const LANDSCAPE_FOOTER_HEIGHT = 30;

/**
 * Registers the Amiri font with a jsPDF instance for Arabic support.
 * @param {jsPDF} doc 
 */
export const setupArabicFont = (doc) => {
    try {
        // Only register if font isn't already there
        const fontList = doc.getFontList();
        if (!fontList['Amiri']) {
            doc.addFileToVFS('Amiri-Regular.ttf', AMIRI_FONT_BASE64);
            doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        }
    } catch (err) {
        console.error("Error setting up Arabic font in PDF:", err);
    }
};

/**
 * Applies header and footer to all pages of a jsPDF document.
 * Auto-detects page orientation and uses the appropriate branding images.
 * @param {jsPDF} doc 
 */
export const applyBranding = async (doc) => {
    const branding = getCompanyBranding();

    // Portrait branding
    const headerImg = branding.header; // Base64 string
    const footerImg = branding.footer; // Base64 string

    // Landscape branding (falls back to portrait if not set)
    const landscapeHeaderImg = branding.landscapeHeader || null;
    const landscapeFooterImg = branding.landscapeFooter || null;

    const pageCount = doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const isLandscape = pageW > pageH;

        try {
            if (isLandscape) {
                // Use landscape images if available, otherwise fall back to portrait
                const hImg = landscapeHeaderImg || headerImg;
                const fImg = landscapeFooterImg || footerImg;

                if (hImg) {
                    doc.addImage(hImg, 'PNG', 0, 0, LANDSCAPE_PAGE_WIDTH, LANDSCAPE_HEADER_HEIGHT);
                }
                if (fImg) {
                    doc.addImage(fImg, 'PNG', 0, LANDSCAPE_PAGE_HEIGHT - LANDSCAPE_FOOTER_HEIGHT, LANDSCAPE_PAGE_WIDTH, LANDSCAPE_FOOTER_HEIGHT);
                }
            } else {
                // Portrait
                if (headerImg) {
                    doc.addImage(headerImg, 'PNG', 0, 0, PAGE_WIDTH, HEADER_HEIGHT);
                }
                if (footerImg) {
                    doc.addImage(footerImg, 'PNG', 0, PAGE_HEIGHT - FOOTER_HEIGHT, PAGE_WIDTH, FOOTER_HEIGHT);
                }
            }
        } catch (e) {
            console.error("Error applying branding images to PDF:", e);
        }
    }
};

export const getPDFDimensions = () => ({
    PAGE_WIDTH,
    PAGE_HEIGHT,
    HEADER_HEIGHT,
    FOOTER_HEIGHT,
    CONTENT_START_Y: HEADER_HEIGHT + 10,
    CONTENT_HEIGHT: PAGE_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - 20 // 10mm padding top/bottom
});

export const getLandscapePDFDimensions = () => ({
    PAGE_WIDTH: LANDSCAPE_PAGE_WIDTH,
    PAGE_HEIGHT: LANDSCAPE_PAGE_HEIGHT,
    HEADER_HEIGHT: LANDSCAPE_HEADER_HEIGHT,
    FOOTER_HEIGHT: LANDSCAPE_FOOTER_HEIGHT,
    CONTENT_START_Y: LANDSCAPE_HEADER_HEIGHT + 10,
    CONTENT_HEIGHT: LANDSCAPE_PAGE_HEIGHT - LANDSCAPE_HEADER_HEIGHT - LANDSCAPE_FOOTER_HEIGHT - 20
});
