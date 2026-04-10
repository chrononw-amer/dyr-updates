import React, { useState, useEffect, useRef } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonCheckbox } from '@ionic/react';
import { lockClosed, person, business, key, shieldCheckmarkOutline } from 'ionicons/icons';
import { getUsers } from '../services/UserService';
import { t } from '../services/i18n';

// Encode/decode credentials for localStorage (prevents casual reading)
const _enc = (s) => btoa(unescape(encodeURIComponent(s)));
const _dec = (s) => { try { return decodeURIComponent(escape(atob(s))); } catch { return ''; } };

const LoginModal = ({ isOpen, onLoginSuccess }) => {
    const [name, setName] = useState(localStorage.getItem('trusted_user_name') || '');
    const [password, setPassword] = useState(() => {
        const stored = localStorage.getItem('trusted_user_cred');
        return stored ? _dec(stored) : '';
    });
    const [trustDevice, setTrustDevice] = useState(localStorage.getItem('is_device_trusted') === 'true');
    const [loading, setLoading] = useState(false);
    const passwordInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            const isTrusted = localStorage.getItem('is_device_trusted') === 'true';
            const savedName = localStorage.getItem('trusted_user_name') || '';
            const storedCred = localStorage.getItem('trusted_user_cred');
            const savedPass = storedCred ? _dec(storedCred) : '';

            setTrustDevice(isTrusted);
            setName(savedName);
            setPassword(savedPass);

            if (isTrusted && savedName && savedPass && !loading) {
                handleLogin(savedName, savedPass);
            }
        }
    }, [isOpen]);

    const handleLogin = async (overrideName, overridePass) => {
        const loginName = overrideName || name;
        const loginPass = overridePass || password;

        if (!loginName || !loginPass) return;
        setLoading(true);
        try {
            const users = await getUsers();

            if (!users || users.length === 0) {
                alert("No users found in database. The system might not be initialized properly. Please check your database connection or contact support.");
                setLoading(false);
                return;
            }

            const user = users.find(u =>
                (u.name || '').toLowerCase() === loginName.toLowerCase() &&
                u.password === loginPass
            );
            if (user) {
                if (trustDevice || (overrideName && overridePass)) {
                    localStorage.setItem('is_device_trusted', 'true');
                    localStorage.setItem('trusted_user_name', loginName);
                    localStorage.setItem('trusted_user_cred', _enc(loginPass));
                    // Remove legacy plain-text key if it exists
                    localStorage.removeItem('trusted_user_password');
                } else {
                    localStorage.removeItem('is_device_trusted');
                    localStorage.removeItem('trusted_user_name');
                    localStorage.removeItem('trusted_user_cred');
                    localStorage.removeItem('trusted_user_password');
                }
                onLoginSuccess(user);
            } else {
                if (!overrideName) {
                    alert("Invalid credentials. Please check your username and password.");
                    // Force re-focus on password input after alert dismissal (fixes Electron focus loss)
                    setTimeout(() => {
                        if (passwordInputRef.current) {
                            const native = passwordInputRef.current.shadowRoot?.querySelector('input');
                            if (native) native.focus({ preventScroll: true });
                            else if (typeof passwordInputRef.current.setFocus === 'function') passwordInputRef.current.setFocus();
                        }
                        window.focus();
                    }, 150);
                }
                setTrustDevice(false);
                localStorage.removeItem('is_device_trusted');
                localStorage.removeItem('trusted_user_name');
                localStorage.removeItem('trusted_user_cred');
                localStorage.removeItem('trusted_user_password');
            }
        } catch (e) {
            console.error("Login component error:", e);
            if (!overrideName) alert("Connection Error: Unable to reach the authentication server. Please check your internet connection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <IonModal isOpen={isOpen} backdropDismiss={false} className="pro-glass-modal">
            <IonContent className="ion-padding" style={{ '--background': 'var(--app-bg)' }}>
                <div style={{
                    height: '100%', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', maxWidth: '400px', margin: '0 auto',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '30px'
                    }}>
                        <IonIcon icon={lockClosed} style={{ fontSize: '48px', color: '#3b82f6' }} />
                    </div>
                    <h2 style={{ color: 'var(--app-text)', fontSize: '1.8rem', fontWeight: '800', marginBottom: '10px' }}>{t('login.systemAccess')}</h2>
                    <p style={{ color: 'var(--app-text-muted)', marginBottom: '30px' }}>{t('login.pleaseAuth')}</p>

                    <div style={{ width: '100%', background: '#ffffff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                        <IonItem style={{ '--background': 'rgba(0,0,0,0.02)', '--border-radius': '12px', marginBottom: '15px' }}>
                            <IonLabel position="stacked" style={{ color: '#3b82f6' }}>{t('login.username')}</IonLabel>
                            <IonInput
                                placeholder={t('login.enterName')}
                                value={name}
                                onIonInput={e => setName(e.detail.value)}
                            />
                        </IonItem>
                        <IonItem style={{ '--background': 'rgba(0,0,0,0.02)', '--border-radius': '12px', marginBottom: '20px' }}>
                            <IonLabel position="stacked" style={{ color: '#3b82f6' }}>{t('login.password')}</IonLabel>
                            <IonInput
                                ref={passwordInputRef}
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onIonInput={e => setPassword(e.detail.value)}
                                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                            />
                        </IonItem>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '0 5px' }}>
                            <IonCheckbox
                                checked={trustDevice}
                                onIonChange={e => setTrustDevice(e.detail.checked)}
                                style={{ '--background-checked': '#3b82f6', '--border-color-checked': '#3b82f6' }}
                            />
                            <IonLabel style={{ color: 'var(--app-text-muted)', fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => setTrustDevice(!trustDevice)}>{t('login.trustDevice')}</IonLabel>
                        </div>

                        <IonButton expand="block" shape="round" color="primary" onClick={() => handleLogin()} disabled={loading} style={{ fontWeight: 'bold' }}>
                            {loading ? t('login.authenticating') : t('login.accessTerminal')}
                        </IonButton>
                    </div>
                </div>
            </IonContent>
        </IonModal>
    );
};

export default LoginModal;
