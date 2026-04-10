import React, { useState, useEffect, useRef } from 'react';
import {
    IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons,
    IonButton, IonIcon, IonItem, IonLabel, IonInput, IonList, IonToggle,
    IonRange, IonCard, IonCardContent, IonSelect, IonSelectOption, IonAlert
} from '@ionic/react';
import { close, printOutline, moveOutline, settingsOutline, saveOutline, refreshOutline, imageOutline, businessOutline, chevronBack, trashOutline, scanOutline, cropOutline, checkmarkOutline } from 'ionicons/icons';
import { printCheque } from '../services/ChequeService';
import { tafqeet } from '../helpers/Tafqeet';
import { getChequeTemplates, addChequeTemplate, deleteChequeTemplate } from '../services/DataService';
import { INITIAL_CHEQUE_TEMPLATES } from '../constants/InitialChequeTemplates';

const ChequePreview = ({ isOpen, onClose, data }) => {
    const isBatch = Array.isArray(data);
    const [batchIndex, setBatchIndex] = useState(0);
    const currentData = isBatch ? data[batchIndex] : data;

    const [selectedBank, setSelectedBank] = useState(localStorage.getItem('last_selected_bank') || 'Default Bank');
    const [bankTemplates, setBankTemplates] = useState({
        'Default Bank': {
            dimensions: { width: 175, height: 85 },
            offsets: {
                payee: { x: 40, y: 30, fontSize: 13 },
                amount: { x: 145, y: 30, fontSize: 14 },
                tafqeet: { x: 35, y: 45, fontSize: 11 },
                date: { x: 140, y: 15, fontSize: 12 },
                crossing: { x: 15, y: 20, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 }
            }
        }
    });

    const refreshTemplates = async (shouldSwitchBank = true) => {
        try {
            let dbTemplates = await getChequeTemplates();

            // Seed if empty
            if (!dbTemplates || dbTemplates.length === 0) {
                console.log("Seeding initial cheque templates...");
                for (const tpl of INITIAL_CHEQUE_TEMPLATES) {
                    await addChequeTemplate(tpl);
                }
                dbTemplates = await getChequeTemplates();
            }

            if (dbTemplates && dbTemplates.length > 0) {
                const templatesObj = {};
                dbTemplates.forEach(t => {
                    templatesObj[t.name || t.id] = t;
                });
                setBankTemplates(templatesObj);

                if (shouldSwitchBank) {
                    const lastBank = localStorage.getItem('last_selected_bank');
                    if (lastBank && templatesObj[lastBank]) {
                        handleBankChange(lastBank, templatesObj);
                    } else {
                        handleBankChange(Object.keys(templatesObj)[0], templatesObj);
                    }
                }
                return templatesObj;
            }
        } catch (err) {
            console.error("Error refreshing templates:", err);
        }
        return bankTemplates;
    };

    const [dimensions, setDimensions] = useState(bankTemplates[selectedBank]?.dimensions || { width: 175, height: 85 });
    const [offsets, setOffsets] = useState(bankTemplates[selectedBank]?.offsets || {
        payee: { x: 40, y: 30, fontSize: 13 },
        amount: { x: 145, y: 30, fontSize: 14 },
        tafqeet: { x: 35, y: 45, fontSize: 11 },
        date: { x: 140, y: 15, fontSize: 12 },
        crossing: { x: 15, y: 20, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 },
        customer: { x: 35, y: 65, show: false, fontSize: 10 }
    });

    const [bgImage, setBgImage] = useState(null);
    const [activeField, setActiveField] = useState(null); // Field being dragged
    const [selectedField, setSelectedField] = useState(null); // Field being edited in sidebar
    const containerRef = useRef(null);
    const [scale, setScale] = useState(4); // 1mm = 4px for screen rendering
    const [printers, setPrinters] = useState([]);
    const [selectedPrinter, setSelectedPrinter] = useState(localStorage.getItem('selected_printer') || '');
    const [showAddBankAlert, setShowAddBankAlert] = useState(false);

    // A4 Calibration State
    const [showCalibrator, setShowCalibrator] = useState(false);
    const [a4Image, setA4Image] = useState(null);
    const [selection, setSelection] = useState(null); // {startX, startY, endX, endY}
    const [isDrawing, setIsDrawing] = useState(false);
    const calibratorImgRef = useRef(null);

    useEffect(() => {
        refreshTemplates();

        if (window.electronAPI && window.electronAPI.getPrinters) {
            window.electronAPI.getPrinters().then(list => {
                setPrinters(list);
                // If no printer saved, or saved printer not in list, pick default
                if (!selectedPrinter && list.length > 0) {
                    const def = list.find(p => p.isDefault) || list[0];
                    setSelectedPrinter(def.name);
                }
            });
        }
    }, [isOpen]);

    // Handle dragging
    const handleMouseDown = (field, e) => {
        e.preventDefault();
        setActiveField(field);
        setSelectedField(field);
    };

    const handleMouseMove = (e) => {
        if (!activeField || !containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Convert px to mm
        const newX = Math.round(mouseX / scale);
        const newY = Math.round(mouseY / scale);

        setOffsets(prev => ({
            ...prev,
            [activeField]: { ...prev[activeField], x: newX, y: newY }
        }));
    };

    const handleMouseUp = () => {
        setActiveField(null);
    };

    // A4 Calibration Logic
    const handleA4Upload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setA4Image(ev.target.result);
                setShowCalibrator(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const startDrawing = (e) => {
        if (!calibratorImgRef.current) return;
        const rect = calibratorImgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setSelection({ startX: x, startY: y, endX: x, endY: y });
        setIsDrawing(true);
    };

    const draw = (e) => {
        if (!isDrawing || !calibratorImgRef.current) return;
        const rect = calibratorImgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setSelection(prev => ({ ...prev, endX: x, endY: y }));
    };

    const endDrawing = () => {
        setIsDrawing(false);
    };

    const processCalibration = () => {
        if (!selection || !a4Image || !calibratorImgRef.current) return;

        const img = calibratorImgRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const displayWidth = img.width;
        const displayHeight = img.height;
        const naturalWidth = img.naturalWidth;
        const naturalHeight = img.naturalHeight;

        const scaleX = naturalWidth / displayWidth;
        const scaleY = naturalHeight / displayHeight;

        const rectX = Math.min(selection.startX, selection.endX);
        const rectY = Math.min(selection.startY, selection.endY);
        const rectW = Math.abs(selection.startX - selection.endX);
        const rectH = Math.abs(selection.startY - selection.endY);

        if (rectH < 10 || rectW < 10) {
            alert("Selection too small. Please select the check area.");
            return;
        }

        const sourceX = rectX * scaleX;
        const sourceY = rectY * scaleY;
        const sourceW = rectW * scaleX;
        const sourceH = rectH * scaleY;

        canvas.width = sourceW;
        canvas.height = sourceH;

        ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
        const croppedData = canvas.toDataURL('image/png');

        // A4 Paper: 210mm x 297mm
        const isPortrait = naturalHeight > naturalWidth;
        const paperWidthMm = isPortrait ? 210 : 297;
        const paperHeightMm = isPortrait ? 297 : 210;

        const mmPerPixelX = paperWidthMm / naturalWidth;
        const mmPerPixelY = paperHeightMm / naturalHeight;

        const widthMm = Math.round(sourceW * mmPerPixelX);
        const heightMm = Math.round(sourceH * mmPerPixelY);

        setDimensions({ width: widthMm, height: heightMm });
        setBgImage(croppedData);
        setShowCalibrator(false);
        setA4Image(null);
        setSelection(null);
    };

    const handleBankChange = (name, alternateTemplates = null) => {
        const templates = alternateTemplates || bankTemplates;
        console.log("Switching to bank:", name);

        if (!name || !templates[name]) {
            console.warn("Bank template not found:", name);
            return;
        }

        setSelectedBank(name);
        localStorage.setItem('last_selected_bank', name);

        const tpl = templates[name];
        setDimensions(tpl.dimensions || { width: 175, height: 85 });
        setOffsets(tpl.offsets || {
            payee: { x: 40, y: 30, fontSize: 13 },
            amount: { x: 145, y: 30, fontSize: 14 },
            tafqeet: { x: 35, y: 45, fontSize: 11 },
            date: { x: 140, y: 15, fontSize: 12 },
            crossing: { x: 15, y: 20, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 },
            customer: { x: 35, y: 65, show: false, fontSize: 10 }
        });
        setBgImage(tpl.bgImage || null);
    };

    const handleAddNewBank = async (name) => {
        if (!name) return;

        try {
            if (bankTemplates[name]) {
                alert('A template with this name already exists.');
                return;
            }

            const newTemplate = {
                id: 'TPL-' + Date.now(),
                name,
                dimensions: { width: 175, height: 85 },
                offsets: {
                    payee: { x: 40, y: 30, fontSize: 13 },
                    amount: { x: 145, y: 30, fontSize: 14 },
                    tafqeet: { x: 35, y: 45, fontSize: 11 },
                    date: { x: 140, y: 15, fontSize: 12 },
                    crossing: { x: 15, y: 20, show: true, text: 'A/C PAYEE ONLY', fontSize: 9 },
                    customer: { x: 35, y: 65, show: false, fontSize: 10 }
                },
                bgImage: null
            };

            console.log("Creating new template:", newTemplate);

            // Optimistic update
            const updated = { ...bankTemplates, [name]: newTemplate };
            setBankTemplates(updated);

            // Explicitly sync dimensions and offsets
            setDimensions(newTemplate.dimensions);
            setOffsets(newTemplate.offsets);
            setBgImage(null);
            setSelectedBank(name);
            localStorage.setItem('last_selected_bank', name);

            // Save to DB
            console.log("Saving to database...");
            await addChequeTemplate(newTemplate);
            console.log("Saved successfully.");

            // Re-sync to get official data/IDs
            await refreshTemplates(false);
        } catch (err) {
            console.error("Error in addNewBank:", err);
            alert("Error adding bank: " + err.message);
        }
    };

    const deleteBank = async () => {
        if (Object.keys(bankTemplates).length <= 1) {
            alert('Cannot delete the last template.');
            return;
        }
        if (confirm(`Are you sure you want to delete "${selectedBank}"?`)) {
            const templateId = bankTemplates[selectedBank].id;
            if (templateId) {
                await deleteChequeTemplate(templateId);
                await refreshTemplates();
            }
        }
    };

    const saveSettings = async () => {
        const currentTpl = bankTemplates[selectedBank];
        const updatedTemplate = {
            ...currentTpl,
            name: selectedBank,
            dimensions,
            offsets,
            bgImage
        };
        await addChequeTemplate(updatedTemplate);
        await refreshTemplates(false);
        alert('Settings Saved to Database Successfully');
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const imgData = ev.target.result;
                setBgImage(imgData);
                // Update local state to prevent loss on bank switch
                setBankTemplates(prev => ({
                    ...prev,
                    [selectedBank]: { ...prev[selectedBank], bgImage: imgData }
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePrint = async () => {
        if (!selectedPrinter && printers.length > 0) {
            alert('Please select a printer first.');
            return;
        }
        await printCheque(currentData, {
            width: dimensions.width,
            height: dimensions.height,
            offsets,
            printerName: selectedPrinter
        });
    };

    const handleBatchPrint = async () => {
        if (!selectedPrinter && printers.length > 0) {
            alert('Please select a printer first.');
            return;
        }

        for (let i = 0; i < data.length; i++) {
            setBatchIndex(i);
            const cheque = data[i];

            // Show print dialog/process for each
            await printCheque(cheque, {
                width: dimensions.width,
                height: dimensions.height,
                offsets,
                printerName: selectedPrinter
            });

            // Small breather for the printer spooler
            if (i < data.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        alert('Batch printing completed.');
    };

    const amountWords = tafqeet(Number(currentData.amount));

    return (
        <IonModal isOpen={isOpen} onDidDismiss={onClose} className="chrono-modal" style={{ '--width': '95%', '--height': '95%' }}>
            <IonHeader>
                <IonToolbar style={{ '--background': '#121214', '--border-color': '#333', padding: '8px 16px' }}>
                    <IonTitle style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>
                        {isBatch ? `BATCH PRINT • ${batchIndex + 1}/${data.length}` : 'DYNAMIC CHEQUE DESIGNER'}
                    </IonTitle>
                    <IonButtons slot="start">
                        {isBatch && (
                            <div style={{ display: 'flex', gap: '8px', background: '#222', padding: '4px', borderRadius: '10px' }}>
                                <IonButton disabled={batchIndex === 0} onClick={() => setBatchIndex(batchIndex - 1)} style={{ '--color': '#fff' }}>
                                    <IonIcon icon={chevronBack} slot="icon-only" />
                                </IonButton>
                                <div style={{ borderLeft: '1px solid #444', height: '20px', margin: 'auto' }} />
                                <IonButton disabled={batchIndex === data.length - 1} onClick={() => setBatchIndex(batchIndex + 1)} style={{ '--color': '#fff' }}>
                                    <IonIcon icon={chevronBack} slot="icon-only" style={{ transform: 'rotate(180deg)' }} />
                                </IonButton>
                            </div>
                        )}
                    </IonButtons>
                    <IonButtons slot="end">
                        <IonButton
                            onClick={saveSettings}
                            style={{
                                '--background': '#2d3436',
                                '--color': '#00d2d3',
                                '--border-radius': '10px',
                                '--padding-start': '16px',
                                '--padding-end': '16px',
                                fontWeight: 'bold'
                            }}
                            fill="solid"
                        >
                            <IonIcon icon={saveOutline} slot="start" /> SAVE DESIGN
                        </IonButton>
                        <div style={{ width: '12px' }} />
                        {isBatch ? (
                            <IonButton
                                onClick={handleBatchPrint}
                                style={{
                                    '--background': 'linear-gradient(45deg, #f0932b, #ffbe76)',
                                    '--color': '#000',
                                    '--border-radius': '10px',
                                    '--padding-start': '16px',
                                    '--padding-end': '16px',
                                    fontWeight: '900'
                                }}
                                fill="solid"
                            >
                                <IonIcon icon={printOutline} slot="start" /> PRINT BATCH
                            </IonButton>
                        ) : (
                            <IonButton
                                onClick={handlePrint}
                                style={{
                                    '--background': 'linear-gradient(45deg, #4834d4, #686de0)',
                                    '--color': '#fff',
                                    '--border-radius': '10px',
                                    '--padding-start': '16px',
                                    '--padding-end': '16px',
                                    fontWeight: '900'
                                }}
                                fill="solid"
                            >
                                <IonIcon icon={printOutline} slot="start" /> PRINT NOW
                            </IonButton>
                        )}
                        <IonButton onClick={onClose} style={{ '--color': '#ff7675' }}><IonIcon icon={close} style={{ fontSize: '1.8rem' }} /></IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding" style={{ '--background': '#1a1a1a' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px', height: '100%' }}>

                    {/* --- DESIGN AREA --- */}
                    <div
                        style={{
                            background: '#333',
                            padding: '40px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            overflow: 'auto',
                            borderRadius: '12px'
                        }}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                        <div
                            ref={containerRef}
                            className="cheque-paper"
                            style={{
                                width: `${dimensions.width * scale}px`,
                                height: `${dimensions.height * scale}px`,
                                backgroundColor: '#fff',
                                backgroundImage: bgImage ? `url(${bgImage})` : 'radial-gradient(#ddd 1px, transparent 1px)',
                                backgroundSize: '100% 100%',
                                backgroundRepeat: 'no-repeat',
                                position: 'relative',
                                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                color: '#000',
                                border: '1px solid #ccc'
                            }}
                        >
                            {/* Rulers */}
                            <div style={{ position: 'absolute', top: -20, left: 0, right: 0, fontSize: '10px', color: '#888', borderBottom: '1px solid #888', height: '20px' }}>
                                {dimensions.width} mm
                            </div>
                            <div style={{ position: 'absolute', top: 0, left: -25, bottom: 0, fontSize: '10px', color: '#888', borderRight: '1px solid #888', width: '20px', writingMode: 'vertical-rl' }}>
                                {dimensions.height} mm
                            </div>

                            {/* Date */}
                            <div
                                onMouseDown={(e) => handleMouseDown('date', e)}
                                style={{
                                    position: 'absolute',
                                    left: `${offsets.date.x * scale}px`,
                                    top: `${offsets.date.y * scale}px`,
                                    fontSize: `${offsets.date.fontSize * (scale / 3.7)}px`,
                                    cursor: 'move',
                                    fontWeight: 'bold',
                                    padding: '2px 5px',
                                    border: selectedField === 'date' ? '1px dashed blue' : '1px transparent solid',
                                    userSelect: 'none'
                                }}
                            >
                                {(() => {
                                    const d = currentData.date || '';
                                    if (d.length === 10 && d.includes('-')) {
                                        return d.split('-').join(' - ');
                                    }
                                    return d;
                                })()}
                            </div>

                            {/* Payee */}
                            <div
                                onMouseDown={(e) => handleMouseDown('payee', e)}
                                style={{
                                    position: 'absolute',
                                    right: `${(dimensions.width - offsets.payee.x) * scale}px`,
                                    top: `${offsets.payee.y * scale}px`,
                                    fontSize: `${offsets.payee.fontSize * (scale / 3.7)}px`,
                                    cursor: 'move',
                                    fontWeight: 'bold',
                                    padding: '2px 5px',
                                    border: selectedField === 'payee' ? '1px dashed blue' : '1px transparent solid',
                                    userSelect: 'none',
                                    textAlign: 'right',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {currentData.payeeName || 'Enter Payee Name'}
                            </div>

                            {/* Amount */}
                            <div
                                onMouseDown={(e) => handleMouseDown('amount', e)}
                                style={{
                                    position: 'absolute',
                                    left: `${offsets.amount.x * scale}px`,
                                    top: `${offsets.amount.y * scale}px`,
                                    fontSize: `${offsets.amount.fontSize * (scale / 3.7)}px`,
                                    cursor: 'move',
                                    fontWeight: 'bold',
                                    padding: '2px 5px',
                                    border: selectedField === 'amount' ? '1px dashed blue' : '1px transparent solid',
                                    userSelect: 'none'
                                }}
                            >
                                # {Number(currentData.amount || 0).toLocaleString()} #
                            </div>

                            {/* Tafqeet */}
                            <div
                                onMouseDown={(e) => handleMouseDown('tafqeet', e)}
                                style={{
                                    position: 'absolute',
                                    right: `${(dimensions.width - offsets.tafqeet.x) * scale}px`,
                                    top: `${offsets.tafqeet.y * scale}px`,
                                    fontSize: `${offsets.tafqeet.fontSize * (scale / 3.7)}px`,
                                    cursor: 'move',
                                    padding: '2px 5px',
                                    border: selectedField === 'tafqeet' ? '1px dashed blue' : '1px transparent solid',
                                    userSelect: 'none',
                                    direction: 'rtl',
                                    textAlign: 'right',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {amountWords}
                            </div>

                            {/* Crossing */}
                            {offsets.crossing.show && (
                                <div
                                    onMouseDown={(e) => handleMouseDown('crossing', e)}
                                    style={{
                                        position: 'absolute',
                                        left: `${offsets.crossing.x * scale}px`,
                                        top: `${offsets.crossing.y * scale}px`,
                                        cursor: 'move',
                                        borderLeft: selectedField === 'crossing' ? '1px dashed blue' : 'none',
                                        borderRight: selectedField === 'crossing' ? '1px dashed blue' : 'none',
                                        userSelect: 'none',
                                        transform: 'rotate(-55deg)',
                                        borderTop: '2.5px solid black',
                                        borderBottom: '2.5px solid black',
                                        width: `${15 * (scale / 3.7)}mm`,
                                        height: `${4.5 * (scale / 3.7)}mm`
                                    }}
                                >
                                </div>
                            )}

                            {/* Customer Name (Optional) */}
                            {offsets.customer?.show && (
                                <div
                                    onMouseDown={(e) => handleMouseDown('customer', e)}
                                    style={{
                                        position: 'absolute',
                                        right: `${(dimensions.width - (offsets.customer?.x || 0)) * scale}px`,
                                        top: `${(offsets.customer?.y || 0) * scale}px`,
                                        fontSize: `${(offsets.customer?.fontSize || 10) * (scale / 3.7)}px`,
                                        cursor: 'move',
                                        padding: '2px 5px',
                                        border: selectedField === 'customer' ? '1px dashed blue' : '1px transparent solid',
                                        userSelect: 'none',
                                        color: '#333',
                                        fontStyle: 'italic',
                                        textAlign: 'right',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {currentData.customerName || 'Customer Name'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- PRO SIDEBAR SETTINGS --- */}
                    <div style={{
                        background: '#1e1e21',
                        borderRadius: '16px',
                        padding: '24px',
                        color: '#eee',
                        overflowY: 'auto',
                        border: '1px solid #333',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #333', paddingBottom: '16px' }}>
                            <div style={{ background: '#4834d4', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                                <IonIcon icon={settingsOutline} style={{ fontSize: '1.2rem', color: '#fff' }} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>Template Config</h3>
                        </div>

                        {/* Bank Template Section */}
                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <IonLabel style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#aaa', fontWeight: '900', letterSpacing: '0.5px' }}>Bank Template</IonLabel>
                                <IonButton fill="clear" size="small" onClick={() => setShowAddBankAlert(true)} style={{ '--padding-start': '4px', '--padding-end': '4px', height: '24px', fontSize: '0.7rem' }}>
                                    + ADD NEW
                                </IonButton>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', background: '#2a2a2e', padding: '10px', borderRadius: '12px', border: '1px solid #444' }}>
                                <IonSelect
                                    value={selectedBank}
                                    onIonChange={e => handleBankChange(e.detail.value)}
                                    interface="popover"
                                    style={{ flex: 1, minHeight: '32px', '--padding-start': '8px', fontSize: '0.9rem' }}
                                >
                                    {Object.keys(bankTemplates).map(name => (
                                        <IonSelectOption key={name} value={name}>{name}</IonSelectOption>
                                    ))}
                                </IonSelect>
                                <div style={{ borderLeft: '1px solid #444', height: '24px', margin: 'auto' }} />
                                <IonButton fill="clear" color="danger" size="small" onClick={deleteBank} style={{ margin: 0 }}>
                                    <IonIcon icon={trashOutline} />
                                </IonButton>
                            </div>
                        </section>

                        {/* Hardware & Reference Section */}
                        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <IonLabel style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#aaa', fontWeight: '900', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Active Printer</IonLabel>
                                <IonSelect
                                    value={selectedPrinter}
                                    placeholder="Select Hardware..."
                                    onIonChange={e => {
                                        setSelectedPrinter(e.detail.value);
                                        localStorage.setItem('selected_printer', e.detail.value);
                                    }}
                                    style={{ background: '#2a2a2e', borderRadius: '12px', border: '1px solid #444', '--padding-start': '12px', fontSize: '0.85rem' }}
                                >
                                    {printers.map(printer => (
                                        <IonSelectOption key={printer.name} value={printer.name}>
                                            {printer.name} {printer.isDefault ? '(Default)' : ''}
                                        </IonSelectOption>
                                    ))}
                                </IonSelect>
                            </div>

                            <div>
                                <IonLabel style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#aaa', fontWeight: '900', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>Background Reference</IonLabel>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input type="file" id="cheque-bg-input" style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />
                                    <IonButton
                                        expand="block"
                                        fill="solid"
                                        color="dark"
                                        onClick={() => document.getElementById('cheque-bg-input').click()}
                                        style={{ flex: 1, '--border-radius': '10px', height: '36px', fontSize: '0.8rem' }}
                                    >
                                        <IonIcon icon={imageOutline} slot="start" /> UPLOAD IMAGE
                                    </IonButton>
                                    {bgImage && (
                                        <IonButton color="danger" onClick={() => setBgImage(null)} style={{ '--border-radius': '10px', height: '36px' }}>
                                            <IonIcon icon={close} />
                                        </IonButton>
                                    )}
                                </div>
                            </div>
                        </section>

                        <div style={{ height: '1px', background: '#333' }} />

                        {/* Smart Calibration Section */}
                        <section>
                            <IonLabel style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#aaa', fontWeight: '900', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>Smart Calibration</IonLabel>
                            <input type="file" id="a4-scan-input" style={{ display: 'none' }} accept="image/*" onChange={handleA4Upload} />
                            <IonButton
                                expand="block"
                                fill="outline"
                                color="warning"
                                onClick={() => document.getElementById('a4-scan-input').click()}
                                style={{ '--border-radius': '12px', fontSize: '0.8rem', fontWeight: 'bold' }}
                            >
                                <IonIcon icon={scanOutline} slot="start" /> CALIBRATE FROM A4
                            </IonButton>
                            <p style={{ fontSize: '0.65rem', color: '#888', marginTop: '8px', fontStyle: 'italic', textAlign: 'center' }}>
                                Upload an A4 scan to auto-calculate physical check dimensions.
                            </p>
                        </section>

                        <div style={{ height: '1px', background: '#333' }} />

                        {/* Designer Controls Section */}
                        <section>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <IonLabel style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#aaa', fontWeight: '900', letterSpacing: '0.5px' }}>Designer Controls</IonLabel>
                                <div style={{ background: '#4834d4', color: '#fff', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '20px' }}>{scale}x Zoom</div>
                            </div>

                            <div style={{ background: '#2a2a2e', padding: '16px', borderRadius: '16px', border: '1px solid #444', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <IonLabel style={{ fontSize: '0.75rem', marginBottom: '8px', display: 'block' }}>Canvas Dimensions (mm)</IonLabel>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <IonInput
                                                type="number"
                                                value={dimensions.width}
                                                onIonChange={e => setDimensions({ ...dimensions, width: Number(e.detail.value) })}
                                                style={{ background: '#1e1e21', borderRadius: '10px', '--padding-start': '12px', fontSize: '0.9rem', border: '1px solid #444' }}
                                            />
                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: '#888' }}>W</span>
                                        </div>
                                        <div style={{ position: 'relative' }}>
                                            <IonInput
                                                type="number"
                                                value={dimensions.height}
                                                onIonChange={e => setDimensions({ ...dimensions, height: Number(e.detail.value) })}
                                                style={{ background: '#1e1e21', borderRadius: '10px', '--padding-start': '12px', fontSize: '0.9rem', border: '1px solid #444' }}
                                            />
                                            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.6rem', color: '#888' }}>H</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <IonRange min={1} max={10} value={scale} onIonChange={e => setScale(Number(e.detail.value))} style={{ '--padding-start': '0', '--padding-end': '0' }} />
                                </div>
                            </div>
                        </section>

                        {/* Field Picker Section */}
                        <section>
                            <IonLabel style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#aaa', fontWeight: '900', letterSpacing: '0.5px', display: 'block', marginBottom: '12px' }}>Select Object to Edit</IonLabel>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                {[
                                    { id: 'date', label: 'التاريخ' },
                                    { id: 'payee', label: 'المستفيد' },
                                    { id: 'amount', label: 'المبلغ' },
                                    { id: 'tafqeet', label: 'التفقيط' },
                                    { id: 'crossing', label: 'التسطير' },
                                    { id: 'customer', label: 'اسم العميل' }
                                ].map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setSelectedField(f.id)}
                                        style={{
                                            background: selectedField === f.id ? '#4834d4' : '#2a2a2e',
                                            color: selectedField === f.id ? '#fff' : '#aaa',
                                            border: selectedField === f.id ? '1px solid #4834d4' : '1px solid #444',
                                            padding: '10px 4px',
                                            borderRadius: '10px',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            fontWeight: selectedField === f.id ? 'bold' : 'normal'
                                        }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        {/* Visibility Toggles */}
                        <section style={{ background: '#2a2a2e', padding: '8px', borderRadius: '12px', border: '1px solid #444' }}>
                            <IonItem lines="none" style={{ '--background': 'transparent', '--padding-start': '8px', '--min-height': '36px' }}>
                                <IonLabel style={{ fontSize: '0.75rem', color: '#aaa' }}>AC Payee Line</IonLabel>
                                <IonToggle checked={offsets.crossing.show} onIonChange={e => setOffsets({ ...offsets, crossing: { ...offsets.crossing, show: e.detail.checked } })} />
                            </IonItem>
                            <IonItem lines="none" style={{ '--background': 'transparent', '--padding-start': '8px', '--min-height': '36px' }}>
                                <IonLabel style={{ fontSize: '0.75rem', color: '#aaa' }}>Customer Label</IonLabel>
                                <IonToggle checked={offsets.customer?.show} onIonChange={e => setOffsets({ ...offsets, customer: { ...offsets.customer, show: e.detail.checked } })} />
                            </IonItem>
                        </section>

                        {/* Active Editor Panel */}
                        {selectedField && (
                            <section style={{
                                background: 'linear-gradient(135deg, #2d3436 0%, #000 100%)',
                                padding: '20px',
                                borderRadius: '16px',
                                border: '1px solid #4834d4',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                                position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.6rem', color: '#4834d4', fontWeight: 'bold', textTransform: 'uppercase' }}>Editing Object</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                                            {selectedField.charAt(0).toUpperCase() + selectedField.slice(1)}
                                        </div>
                                    </div>
                                    <IonButton fill="clear" size="small" onClick={() => setSelectedField(null)} color="light" style={{ '--padding-start': '0', '--padding-end': '0', margin: 0 }}>
                                        <IonIcon icon={close} />
                                    </IonButton>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ background: '#1e1e21', padding: '12px', borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#888' }}>Font Size</span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fee333' }}>{offsets[selectedField].fontSize || 12}pt</span>
                                        </div>
                                        <IonRange
                                            min={6}
                                            max={40}
                                            value={offsets[selectedField].fontSize || 12}
                                            onIonChange={e => {
                                                const val = Number(e.detail.value);
                                                setOffsets(prev => ({ ...prev, [selectedField]: { ...prev[selectedField], fontSize: val } }));
                                            }}
                                            style={{ '--padding-top': '0', '--padding-bottom': '0' }}
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div style={{ background: '#1e1e21', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: '900' }}>COORD X (mm)</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{offsets[selectedField].x}</div>
                                        </div>
                                        <div style={{ background: '#1e1e21', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '0.6rem', color: '#888', fontWeight: '900' }}>COORD Y (mm)</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{offsets[selectedField].y}</div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}

                        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
                            <IonButton
                                expand="block"
                                fill="clear"
                                color="medium"
                                style={{ fontSize: '0.7rem' }}
                                onClick={() => {
                                    if (confirm('Reset specific layout to default values?')) {
                                        window.location.reload();
                                    }
                                }}
                            >
                                <IonIcon icon={refreshOutline} slot="start" /> FACTORY RESET LAYOUT
                            </IonButton>
                        </div>
                    </div>
                </div>
            </IonContent>

            <IonAlert
                isOpen={showAddBankAlert}
                onDidDismiss={() => setShowAddBankAlert(false)}
                header={'New Bank Template'}
                message={'Enter the name of the new bank.'}
                inputs={[
                    {
                        name: 'bankName',
                        type: 'text',
                        placeholder: 'e.g., CIB, QNB...'
                    }
                ]}
                buttons={[
                    {
                        text: 'Cancel',
                        role: 'cancel',
                        cssClass: 'secondary'
                    },
                    {
                        text: 'Add',
                        handler: (data) => {
                            handleAddNewBank(data.bankName);
                        }
                    }
                ]}
            />
            {/* A4 Calibrator Modal */}
            <IonModal isOpen={showCalibrator} onDidDismiss={() => setShowCalibrator(false)} className="chrono-modal" style={{ '--width': '90%', '--height': '90%' }}>
                <IonHeader>
                    <IonToolbar style={{ '--background': '#000' }}>
                        <IonTitle style={{ color: '#fff' }}>Select Cheque from A4 Page</IonTitle>
                        <IonButtons slot="end">
                            <IonButton onClick={() => setShowCalibrator(false)} color="light">Cancel</IonButton>
                            <IonButton onClick={processCalibration} color="warning" fill="solid" style={{ fontWeight: 'bold' }}>
                                <IonIcon icon={checkmarkOutline} slot="start" /> CONFIRM SELECTION
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>
                <IonContent style={{ '--background': '#111' }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '100%',
                        padding: '20px'
                    }}>
                        <div style={{
                            position: 'relative',
                            userSelect: 'none',
                            maxHeight: '80vh',
                            background: '#fff',
                            boxShadow: '0 0 40px rgba(0,0,0,1)'
                        }}>
                            <img
                                ref={calibratorImgRef}
                                src={a4Image}
                                alt="A4 Scan"
                                draggable={false}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={endDrawing}
                                style={{
                                    maxHeight: '80vh',
                                    display: 'block',
                                    cursor: 'crosshair'
                                }}
                            />
                            {selection && (
                                <div style={{
                                    position: 'absolute',
                                    left: `${Math.min(selection.startX, selection.endX)}px`,
                                    top: `${Math.min(selection.startY, selection.endY)}px`,
                                    width: `${Math.abs(selection.startX - selection.endX)}px`,
                                    height: `${Math.abs(selection.startY - selection.endY)}px`,
                                    border: '2px solid #fdcb6e',
                                    background: 'rgba(253, 203, 110, 0.2)',
                                    pointerEvents: 'none',
                                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
                                    zIndex: 100
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        top: '-25px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: '#fdcb6e',
                                        color: '#000',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Cheque Area
                                    </div>
                                </div>
                            )}
                        </div>
                        <div style={{ color: '#888', marginTop: '20px', textAlign: 'center' }}>
                            <p style={{ margin: 0 }}>Click and drag to select the check on the A4 sheet.</p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '0.8rem' }}>The system will automatically calculate the physical width and height.</p>
                        </div>
                    </div>
                </IonContent>
            </IonModal>
        </IonModal>
    );
};

export default ChequePreview;
