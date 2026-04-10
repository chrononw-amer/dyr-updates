import React, { useState, useEffect } from 'react';
import {
    IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon
} from '@ionic/react';
import { close, downloadOutline, printOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { exportFileMobile } from '../services/MobileExportService';

const PDFPreviewModal = ({ isOpen, onClose, pdfDoc, filename }) => {
    const [pdfUrl, setPdfUrl] = useState(null);
    const isMobile = Capacitor.getPlatform() !== 'web' && Capacitor.getPlatform() !== 'electron';

    useEffect(() => {
        if (isOpen && pdfDoc) {
            try {
                const blob = pdfDoc.output('blob');
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
                return () => URL.revokeObjectURL(url);
            } catch (err) {
                console.error("Error creating PDF preview URL:", err);
            }
        } else {
            setPdfUrl(null);
        }
    }, [isOpen, pdfDoc]);

    const handleSave = async () => {
        if (!pdfDoc) return;

        const fname = filename || 'document.pdf';

        if (isMobile) {
            try {
                const blob = pdfDoc.output('blob');
                await exportFileMobile(blob, fname, 'application/pdf');
            } catch (err) {
                console.error("Mobile save error:", err);
                alert("Failed to export PDF on mobile");
            }
        } else {
            pdfDoc.save(fname);
        }
    };

    const handlePrint = () => {
        if (!pdfUrl && !pdfDoc) return;

        if (window.electronAPI && window.electronAPI.printPDF && pdfDoc) {
            const buffer = pdfDoc.output('arraybuffer');
            window.electronAPI.printPDF(buffer, 'A4');
            return;
        }

        // Create a hidden iframe, wait for PDF to load, then print
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.top = '-10000px';
        printFrame.style.left = '-10000px';
        printFrame.style.width = '1px';
        printFrame.style.height = '1px';
        printFrame.style.border = 'none';
        document.body.appendChild(printFrame);

        printFrame.onload = () => {
            setTimeout(() => {
                try {
                    printFrame.contentWindow.focus();
                    printFrame.contentWindow.print();
                } catch (e) {
                    // Fallback: open in new tab
                    window.open(pdfUrl);
                }
                // Clean up after printing
                setTimeout(() => {
                    document.body.removeChild(printFrame);
                }, 2000);
            }, 500);
        };

        printFrame.src = pdfUrl;
    };

    return (
        <IonModal
            isOpen={isOpen}
            onDidDismiss={onClose}
            style={{ '--width': '90%', '--height': '90%' }}
        >
            <IonHeader>
                <IonToolbar style={{ '--background': '#1e1e1e', '--color': '#fff' }}>
                    <IonTitle>Print Preview</IonTitle>
                    <IonButtons slot="end">
                        <IonButton color="primary" onClick={handlePrint} style={{ fontWeight: 'bold' }}>
                            <IonIcon icon={printOutline} slot="start" />
                            Print
                        </IonButton>
                        <IonButton color="success" onClick={handleSave} style={{ fontWeight: 'bold' }}>
                            <IonIcon icon={downloadOutline} slot="start" />
                            Save PDF
                        </IonButton>
                        <IonButton onClick={onClose}>
                            <IonIcon icon={close} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent style={{ '--background': '#333' }}>
                {pdfUrl ? (
                    <iframe
                        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        style={{ width: '100%', height: '100%', border: 'none', background: '#333' }}
                        title="PDF Preview"
                    />
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#fff' }}>
                        Preparing preview...
                    </div>
                )}
            </IonContent>
        </IonModal>
    );
};

export default PDFPreviewModal;
