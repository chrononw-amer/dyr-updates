import React, { useState, useEffect, useRef } from 'react';
import { IonIcon, IonButton, IonFab, IonFabButton, IonBadge } from '@ionic/react';
import { chatbubbleEllipses, close, send, paperPlane, person, timeOutline, shieldCheckmark, removeOutline, logoWhatsapp } from 'ionicons/icons';
import { sendMessage, getMessagesBetween, subscribeToMessages, markAsRead, getSessionByMac } from '../services/ChatService';

const ChatOverlay = ({ currentUserMac, receiverId: initialReceiverId = 'DYR', title = 'DYR SUPPORT', isOwner = false, forceOpen = false, onClose = null, renderTrigger }) => {
    const [isOpen, setIsOpen] = useState(forceOpen);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeReceiverId, setActiveReceiverId] = useState(initialReceiverId);
    const [participantName, setParticipantName] = useState(null);
    const scrollRef = useRef(null);
    const messagesEndRef = useRef(null);

    // Fetch participant name if needed
    useEffect(() => {
        const fetchParticipantInfo = async () => {
            const activeId = String(activeReceiverId || '').toLowerCase();
            if (activeId && activeId !== 'dyr') {
                const session = await getSessionByMac(activeReceiverId);
                if (session) {
                    setParticipantName(session.display_name || session.user_name || session.pc_name || activeReceiverId);
                } else {
                    setParticipantName(`User: ${activeReceiverId.substring(0, 8)}`);
                }
            } else {
                setParticipantName('DYR SUPPORT');
            }
        };
        fetchParticipantInfo();
    }, [activeReceiverId]);

    // Update active receiver if prop changes (unless we're in owner mode and already chatting)
    useEffect(() => {
        if (!isOwner || !activeReceiverId || activeReceiverId === 'DYR') {
            setActiveReceiverId(initialReceiverId);
        }
    }, [initialReceiverId, isOwner]);

    useEffect(() => {
        if (currentUserMac) {
            loadMessages();
            const sub = subscribeToMessages((newMsg) => {
                const sId = String(newMsg.sender_id || '').toLowerCase();
                const rId = String(newMsg.receiver_id || '').toLowerCase();
                const myId = String(currentUserMac || '').toLowerCase();
                const activeId = String(activeReceiverId || '').toLowerCase();

                // Determine if this message is relevant to the active conversation
                const isRelevant =
                    (sId === activeId && rId === myId) ||
                    (sId === myId && rId === activeId);

                // For owner: also relevant if it's sent TO 'DYR' from anyone
                const isNewCustomerMessage = isOwner && rId === 'dyr' && sId !== 'dyr';

                if (isRelevant || isNewCustomerMessage) {
                    if (isNewCustomerMessage && sId !== activeId && !forceOpen) {
                        // Switch chat context to the new sender for the owner (floating overlay only)
                        setActiveReceiverId(newMsg.sender_id);
                        loadMessagesFor(newMsg.sender_id);
                    } else if (isRelevant) {
                        setMessages(prev => {
                            if (prev.some(m => m.id === newMsg.id)) return prev;
                            return [...prev, newMsg];
                        });
                    }

                    if (sId !== myId) {
                        if (!isOpen && !forceOpen) {
                            setUnreadCount(c => c + 1);
                        }
                        // Always open on new message if it's for DYR (Owner needs to see it)
                        if (isOwner && rId === 'dyr') {
                            setIsOpen(true);
                        }
                    }
                }
            }, `chat_${String(currentUserMac).toLowerCase()}`);
            return () => sub?.unsubscribe();
        }
    }, [currentUserMac, activeReceiverId, isOpen, forceOpen, isOwner]);

    useEffect(() => {
        if (isOpen || forceOpen) {
            setUnreadCount(0);
            if (activeReceiverId) markAsRead(activeReceiverId, currentUserMac);
            scrollToBottom();
        }
    }, [isOpen, forceOpen, messages.length, activeReceiverId]);

    const loadMessages = async () => {
        if (!activeReceiverId) return;
        const msgs = await getMessagesBetween(currentUserMac, activeReceiverId);
        setMessages(msgs);
    };

    const loadMessagesFor = async (rid) => {
        const msgs = await getMessagesBetween(currentUserMac, rid);
        setMessages(msgs);
    };

    const scrollToBottom = () => {
        setTimeout(() => {
            scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handleSend = async () => {
        if (!input.trim() || !activeReceiverId) return;

        const content = input.trim();
        setInput('');

        // Optimistic Update
        const tempMsg = {
            id: 'temp-' + Date.now(),
            sender_id: currentUserMac,
            receiver_id: activeReceiverId,
            content: content,
            created_at: new Date().toISOString(),
            is_read: false
        };
        setMessages(prev => [...prev, tempMsg]);
        scrollToBottom();

        // Background Send
        sendMessage(currentUserMac, activeReceiverId, content).then(msg => {
            if (msg) {
                setMessages(prev => prev.map(m => m.id === tempMsg.id ? msg : m));
            }
        });
    };

    if (!currentUserMac) return null;

    return (
        <>
            {/* Custom Trigger (Mobile/Desktop custom placement) */}
            {typeof renderTrigger === 'function' ? renderTrigger({ open: () => setIsOpen(true), unreadCount }) : (
                /* Default Floating Toggle Button */
                !isOpen && !forceOpen && (
                    <IonFab vertical="bottom" horizontal="start" slot="fixed" style={{ margin: '20px', zIndex: 1000 }}>
                        <IonFabButton color="warning" onClick={() => setIsOpen(true)} style={{ '--box-shadow': '0 8px 32px rgba(197, 160, 89, 0.4)' }}>
                            <IonIcon icon={chatbubbleEllipses} />
                            {unreadCount > 0 && (
                                <div style={{
                                    position: 'absolute', top: '-5px', right: '-5px',
                                    background: '#eb445a', color: '#fff', borderRadius: '50%',
                                    minWidth: '22px', height: '22px', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center', fontSize: '12px',
                                    fontWeight: 'bold', border: '2px solid #000'
                                }}>
                                    {unreadCount}
                                </div>
                            )}
                        </IonFabButton>
                        <div style={{
                            position: 'absolute', left: '70px', bottom: '15px',
                            background: 'rgba(0,0,0,0.8)', color: '#c5a059', padding: '6px 15px',
                            borderRadius: '10px 10px 10px 0', fontSize: '0.75rem', fontWeight: 'bold',
                            whiteSpace: 'nowrap', border: '1px solid rgba(197, 160, 89, 0.3)',
                            pointerEvents: 'none', animation: 'fadeIn 0.5s ease-out'
                        }}>
                            CHAT WITH DYR
                        </div>
                    </IonFab>
                )
            )}

            {/* Chat Window */}
            {(isOpen || forceOpen) && (
                <div style={{
                    position: forceOpen ? 'relative' : 'fixed',
                    bottom: forceOpen ? '0' : '30px',
                    left: forceOpen ? '0' : '30px',
                    width: forceOpen ? '100%' : '380px',
                    height: forceOpen ? '500px' : '550px',
                    background: 'linear-gradient(180deg, rgba(25, 25, 25, 0.98), rgba(15, 15, 15, 1))',
                    backdropFilter: 'blur(20px)',
                    borderRadius: forceOpen ? '0 0 24px 24px' : '24px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                    zIndex: 9999,
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    animation: forceOpen ? 'none' : 'slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '18px 25px',
                        background: 'rgba(255,255,255,0.02)',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '12px',
                                    background: 'rgba(197, 160, 89, 0.1)', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid rgba(197, 160, 89, 0.2)'
                                }}>
                                    <IonIcon icon={shieldCheckmark} style={{ fontSize: '24px', color: '#c5a059' }} />
                                </div>
                                <div style={{
                                    width: '12px', height: '12px', background: '#2dd36f',
                                    borderRadius: '50%', border: '2px solid #000',
                                    position: 'absolute', bottom: '-2px', right: '-2px'
                                }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>{participantName || title}</div>
                                <div style={{ fontSize: '0.7rem', color: '#2dd36f', fontWeight: 'bold', textTransform: 'uppercase' }}>Available Online</div>
                            </div>
                        </div>
                        {!forceOpen && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <IonButton
                                    fill="clear"
                                    size="small"
                                    style={{ '--color': '#25D366', '--padding-start': '8px', '--padding-end': '8px', height: '32px', fontSize: '0.7rem', fontWeight: 'bold' }}
                                    onClick={() => window.open('https://wa.me/201008515995', '_system')}
                                >
                                    <IonIcon icon={logoWhatsapp} slot="start" style={{ fontSize: '18px' }} />
                                    Direct WhatsApp
                                </IonButton>
                                <IonIcon
                                    icon={removeOutline}
                                    title="Minimize"
                                    style={{ fontSize: '22px', color: '#888', cursor: 'pointer', transition: 'color 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#c5a059'}
                                    onMouseOut={e => e.currentTarget.style.color = '#888'}
                                    onClick={() => setIsOpen(false)}
                                />
                                <IonIcon
                                    icon={close}
                                    title="Close"
                                    style={{ fontSize: '24px', color: '#888', cursor: 'pointer', transition: 'color 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#eb445a'}
                                    onMouseOut={e => e.currentTarget.style.color = '#888'}
                                    onClick={() => {
                                        setIsOpen(false);
                                        if (onClose) onClose();
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Messages Area */}
                    <div style={{
                        flex: 1, padding: '20px', overflowY: 'auto',
                        display: 'flex', flexDirection: 'column', gap: '15px',
                        backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(197, 160, 89, 0.03) 0%, transparent 80%)'
                    }}>
                        {messages.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#888', marginTop: '80px' }}>
                                <IonIcon icon={chatbubbleEllipses} style={{ fontSize: '50px', marginBottom: '15px', opacity: 0.2, color: '#c5a059' }} />
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>Terminal initialized. Ready for communication.</div>
                            </div>
                        )}
                        {messages.map((msg, i) => {
                            const isMe = msg.sender_id === currentUserMac;
                            return (
                                <div key={i} style={{
                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: isMe ? 'flex-end' : 'flex-start'
                                }}>
                                    <div style={{
                                        background: isMe ? 'linear-gradient(135deg, #c5a059, #8e6d2c)' : 'rgba(255,255,255,0.05)',
                                        color: isMe ? '#000' : '#fff',
                                        padding: '12px 18px',
                                        borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.4',
                                        fontWeight: isMe ? '600' : '400',
                                        boxShadow: isMe ? '0 10px 20px rgba(197, 160, 89, 0.2)' : 'none',
                                        border: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        {msg.content}
                                    </div>
                                    <div style={{
                                        fontSize: '0.65rem', color: '#888', marginTop: '6px',
                                        textTransform: 'uppercase', fontWeight: '900', letterSpacing: '1px'
                                    }}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {isMe && ' • SENT'}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{
                        padding: '20px 25px', background: 'rgba(0,0,0,0.4)',
                        borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '15px',
                        alignItems: 'center'
                    }}>
                        <input
                            type="text"
                            placeholder="Terminal command..."
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            style={{
                                flex: 1, background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '14px', padding: '14px 20px',
                                color: '#fff', outline: 'none', fontSize: '0.95rem',
                                transition: 'all 0.3s'
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = '#c5a059'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            style={{
                                background: input.trim() ? '#c5a059' : '#333',
                                color: '#000', border: 'none',
                                borderRadius: '14px', width: '50px', height: '50px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: input.trim() ? 'pointer' : 'default',
                                boxShadow: input.trim() ? '0 8px 20px rgba(197, 160, 89, 0.3)' : 'none',
                                transition: 'all 0.3s'
                            }}
                        >
                            <IonIcon icon={paperPlane} style={{ fontSize: '20px' }} />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(40px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </>
    );
};

export default ChatOverlay;
