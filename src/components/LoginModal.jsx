import React, { useState, useEffect, useRef } from 'react';
import { IonModal, IonContent, IonIcon, IonCheckbox, IonLabel } from '@ionic/react';
import { lockClosed, mailOutline, keyOutline } from 'ionicons/icons';
import { getUsers } from '../services/UserService';
import { t } from '../services/i18n';
import { supabase } from '../services/supabase';

// ── Constants ─────────────────────────────────────────────────────
const OWNER_EMAIL    = 'invoker89719@gmail.com';
const OWNER_PASSWORD = 'ALEXmoh12!@';

const _enc = (s) => btoa(unescape(encodeURIComponent(s)));
const _dec = (s) => { try { return decodeURIComponent(escape(atob(s))); } catch { return ''; } };

// ── Plan limits ────────────────────────────────────────────────────
const PLAN_LIMITS = {
  free:  { maxBuildings: 1,        maxUsers: 1,        android: false, cloud: false, cheques: false, dyrai: false },
  light: { maxBuildings: 5,        maxUsers: 2,        android: false, cloud: false, cheques: false, dyrai: false },
  pro:   { maxBuildings: 20,       maxUsers: 4,        android: false, cloud: false, cheques: true,  dyrai: true  },
  elite: { maxBuildings: Infinity, maxUsers: Infinity, android: true,  cloud: true,  cheques: true,  dyrai: true  },
};

const PLAN_COLORS = {
  free:  { bg: 'rgba(16,185,129,0.1)',  text: '#10B981', label: '🆓 Free Trial' },
  light: { bg: 'rgba(37,99,235,0.1)',   text: '#2563EB', label: '🏠 Light' },
  pro:   { bg: 'rgba(240,147,43,0.1)',  text: '#F59E0B', label: '🏢 Pro' },
  elite: { bg: 'rgba(139,92,246,0.1)', text: '#8B5CF6', label: '🌆 Elite' },
};

// ── Styles ─────────────────────────────────────────────────────────
const S = {
  wrap: {
    height: '100%', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center',
    padding: '24px', background: 'var(--app-bg)'
  },
  logo: {
    width: 72, height: 72, borderRadius: 20,
    background: 'linear-gradient(135deg,rgba(37,99,235,0.15),rgba(37,99,235,0.05))',
    border: '1px solid rgba(37,99,235,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20
  },
  card: {
    width: '100%', maxWidth: 400,
    background: 'var(--app-bg-card, #fff)',
    borderRadius: 20, padding: 28,
    border: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.1)'
  },
  field: { marginBottom: 14 },
  labelRow: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 700, color: '#64748b',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6
  },
  input: {
    width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0',
    borderRadius: 12, fontSize: 14, fontFamily: 'inherit', outline: 'none',
    transition: 'border-color .2s', background: '#f8fafc', color: '#1e293b',
    boxSizing: 'border-box'
  },
  inputFocus: { borderColor: '#2563EB', background: '#fff' },
  btn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg,#2563EB,#1d4ed8)',
    color: '#fff', border: 'none', borderRadius: 12,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    transition: 'opacity .2s, transform .1s', marginTop: 4
  },
  err: {
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
    color: '#dc2626', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 14
  },
  sub: { textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 16 },
};

const LoginModal = ({ isOpen, onLoginSuccess }) => {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [trustDevice,  setTrustDevice]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const emailRef    = useRef(null);
  const passwordRef = useRef(null);

  // ── Auto-login from trusted device cache ──────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const trusted   = localStorage.getItem('is_device_trusted') === 'true';
    const savedEmail = localStorage.getItem('trusted_user_name') || '';
    const savedPass  = localStorage.getItem('trusted_user_cred')
      ? _dec(localStorage.getItem('trusted_user_cred')) : '';
    if (trusted && savedEmail && savedPass) {
      setEmail(savedEmail);
      setPassword(savedPass);
      setTrustDevice(true);
      handleLogin(savedEmail, savedPass, true);
    }
  }, [isOpen]);

  const saveTrusted = (em, pw) => {
    localStorage.setItem('is_device_trusted', 'true');
    localStorage.setItem('trusted_user_name', em);
    localStorage.setItem('trusted_user_cred', _enc(pw));
  };
  const clearTrusted = () => {
    localStorage.removeItem('is_device_trusted');
    localStorage.removeItem('trusted_user_name');
    localStorage.removeItem('trusted_user_cred');
    localStorage.removeItem('trusted_user_password');
  };

  // ── Main login handler ─────────────────────────────────────────
  const handleLogin = async (overEmail, overPass, silent = false) => {
    const em = (overEmail || email).trim().toLowerCase();
    const pw = overPass || password;
    if (!em || !pw) { if (!silent) setError('Please enter your email and password.'); return; }

    setLoading(true);
    setError('');

    try {
      // ── 1. OWNER bypass (local username shortcut) ─────────────
      if (['dyr', 'chrono'].includes(em) && pw === OWNER_PASSWORD) {
        const users = await getUsers();
        const dbUser = (users || []).find(u => ['dyr', 'chrono'].includes((u.name || '').toLowerCase()));
        const ownerUser = {
          ...(dbUser || { id: 'owner', name: 'chrono', company: '' }),
          role: 'owner',
          portalEmail: OWNER_EMAIL,
          plan: 'elite',
          planLimits: PLAN_LIMITS.elite,
          subscriptionStatus: 'active',
        };
        if (trustDevice) saveTrusted(em, pw); else clearTrusted();
        onLoginSuccess(ownerUser);
        return;
      }

      // ── 2. Portal (Supabase) email login ──────────────────────
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });

      if (authErr || !authData?.user) {
        if (!silent) setError('Invalid email or password. Please try again.');
        clearTrusted();
        setLoading(false);
        return;
      }

      const uid       = authData.user.id;
      const userEmail = authData.user.email;

      // Load portal profile
      const { data: profile } = await supabase
        .from('dyr_accounts')
        .select('*')
        .eq('id', uid)
        .single();

      if (!profile) {
        if (!silent) setError('Account profile not found. Please contact support.');
        clearTrusted();
        setLoading(false);
        return;
      }

      const status         = profile.subscription_status;
      const rawPlan        = profile.plan || 'free';
      const isOwnerAccount = userEmail === OWNER_EMAIL || profile.role === 'owner';
      const isActive       = isOwnerAccount || status === 'active';
      const isExpired      = !isOwnerAccount && status === 'expired';
      // Portal rule: inactive = Free Trial (schema defaults plan='light' but unpaid = free limits)
      const plan   = isOwnerAccount ? 'elite' : isActive ? rawPlan : 'free';
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;


      // Block expired subscriptions at login
      if (isExpired) {
        const expDate = profile.subscription_end
          ? new Date(profile.subscription_end).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', year: 'numeric'
            })
          : 'unknown date';
        if (!silent) setError(
          `❌ Your subscription expired on ${expDate}.\nPlease renew at dyr-app.com/portal to continue using DYR.`
        );
        clearTrusted();
        setLoading(false);
        return;
      }

      const portalUser = {
        id:                 uid,
        name:               profile.username || profile.first_name || userEmail,
        firstName:          profile.first_name,
        lastName:           profile.last_name,
        company:            profile.company_name,
        email:              userEmail,
        role:               isOwnerAccount ? 'owner' : 'company_admin',
        rank:               isOwnerAccount ? 'owner' : 'admin',
        plan,               // already: owner='elite', active=rawPlan, inactive='free'
        planLimits:         limits,
        subscriptionStatus: isOwnerAccount ? 'active' : status,
        subscriptionEnd:    profile.subscription_end,
        portalEmail:        userEmail,
        permissions:        { allTabs: true },
      };


      if (trustDevice) saveTrusted(em, pw); else clearTrusted();
      onLoginSuccess(portalUser);

    } catch (e) {
      console.error('Login error:', e);
      if (!silent) setError('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    ...S.input,
    ...(focusedField === field ? S.inputFocus : {}),
  });

  return (
    <IonModal isOpen={isOpen} backdropDismiss={false} className="pro-glass-modal">
      <IonContent style={{ '--background': 'var(--app-bg)' }}>
        <div style={S.wrap}>
          <div style={S.logo}>
            <IonIcon icon={lockClosed} style={{ fontSize: 36, color: '#2563EB' }} />
          </div>

          <h2 style={{ color: 'var(--app-text)', fontSize: '1.7rem', fontWeight: 800,
                       marginBottom: 4, textAlign: 'center' }}>
            Welcome to DYR
          </h2>
          <p style={{ color: 'var(--app-text-muted)', marginBottom: 24, textAlign: 'center', fontSize: 14 }}>
            Sign in with your portal account
          </p>

          <div style={S.card}>
            {error && <div style={S.err}>{error}</div>}

            {/* Email */}
            <div style={S.field}>
              <div style={S.labelRow}>
                <IonIcon icon={mailOutline} style={{ fontSize: 13 }} />
                Email Address
              </div>
              <input
                ref={emailRef}
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onKeyDown={e => e.key === 'Enter' && passwordRef.current?.focus()}
                style={inputStyle('email')}
                autoComplete="email"
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div style={S.field}>
              <div style={S.labelRow}>
                <IonIcon icon={keyOutline} style={{ fontSize: 13 }} />
                Password
              </div>
              <input
                ref={passwordRef}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={inputStyle('password')}
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {/* Trust device */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <IonCheckbox
                checked={trustDevice}
                onIonChange={e => setTrustDevice(e.detail.checked)}
                style={{ '--background-checked': '#2563EB', '--border-color-checked': '#2563EB' }}
              />
              <IonLabel
                style={{ color: 'var(--app-text-muted)', fontSize: '0.88rem', cursor: 'pointer' }}
                onClick={() => setTrustDevice(t => !t)}
              >
                {t('login.trustDevice')}
              </IonLabel>
            </div>

            <button
              style={{ ...S.btn, ...(loading ? { opacity: 0.6, cursor: 'not-allowed' } : {}) }}
              onClick={() => handleLogin()}
              disabled={loading}
            >
              {loading ? '🔄 Signing in...' : '🔐 Sign In'}
            </button>
          </div>

          <div style={S.sub}>
            Don't have an account?{' '}
            <a href="https://dyr-app.com/portal" target="_blank" rel="noreferrer"
               style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
              Register at dyr-app.com/portal →
            </a>
          </div>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default LoginModal;
