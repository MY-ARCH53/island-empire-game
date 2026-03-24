import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../services/api';

function ChatPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  if (!token || !userData) { navigate('/'); return null; }
  const me = JSON.parse(userData);

  const [activeTab, setActiveTab] = useState<'global' | 'dm'>('global');

  // Global sohbet
  const [globalMessages, setGlobalMessages] = useState<any[]>([]);
  const [globalInput, setGlobalInput] = useState('');
  const [globalSending, setGlobalSending] = useState(false);
  const globalBottomRef = useRef<HTMLDivElement>(null);
  const lastGlobalTs = useRef<number>(0);

  // Özel mesajlar
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [dmSending, setDmSending] = useState(false);
  const dmBottomRef = useRef<HTMLDivElement>(null);

  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // İlk yükleme: global mesajlar
  useEffect(() => {
    loadGlobal();
    const interval = setInterval(pollGlobal, 5000);
    return () => clearInterval(interval);
  }, []);

  // Konuşma listesi
  useEffect(() => {
    if (activeTab === 'dm') loadConversations();
  }, [activeTab]);

  // DM seçilince mesajları yükle
  useEffect(() => {
    if (selectedConv) {
      loadDmMessages();
      const interval = setInterval(loadDmMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConv]);

  // Scroll to bottom
  useEffect(() => {
    globalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages]);

  useEffect(() => {
    dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  const loadGlobal = async () => {
    try {
      const r = await chatAPI.getGlobal();
      setGlobalMessages(r.data.data.messages);
      if (r.data.data.messages.length > 0) {
        lastGlobalTs.current = new Date(r.data.data.messages[r.data.data.messages.length - 1].created_at).getTime();
      }
    } catch { /* ignore */ }
  };

  const pollGlobal = async () => {
    try {
      const r = await chatAPI.getGlobal(lastGlobalTs.current || undefined);
      const newMsgs = r.data.data.messages;
      if (newMsgs.length > 0) {
        setGlobalMessages(prev => [...prev, ...newMsgs]);
        lastGlobalTs.current = new Date(newMsgs[newMsgs.length - 1].created_at).getTime();
      }
    } catch { /* ignore */ }
  };

  const sendGlobal = async () => {
    if (!globalInput.trim() || globalSending) return;
    setGlobalSending(true);
    try {
      const r = await chatAPI.sendGlobal(globalInput.trim());
      setGlobalMessages(prev => [...prev, r.data.data.message]);
      lastGlobalTs.current = new Date(r.data.data.message.created_at).getTime();
      setGlobalInput('');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Mesaj gönderilemedi');
    }
    setGlobalSending(false);
  };

  const loadConversations = async () => {
    try {
      const r = await chatAPI.getConversations();
      setConversations(r.data.data.conversations);
    } catch { /* ignore */ }
  };

  const loadDmMessages = async () => {
    if (!selectedConv) return;
    try {
      const r = await chatAPI.getConversation(selectedConv.other_id);
      setDmMessages(r.data.data.messages);
      // Okunmamış sıfırla
      setConversations(prev => prev.map((c: any) =>
        c.other_id === selectedConv.other_id ? { ...c, unread_count: 0 } : c
      ));
    } catch { /* ignore */ }
  };

  const sendDm = async () => {
    if (!dmInput.trim() || dmSending || !selectedConv) return;
    setDmSending(true);
    try {
      await chatAPI.sendDm(selectedConv.other_id, dmInput.trim());
      setDmInput('');
      await loadDmMessages();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Mesaj gönderilemedi');
    }
    setDmSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fn(); }
  };

  const leagueColor = (league: string) => {
    const colors: any = { bronze: '#cd7f32', silver: '#94a3b8', gold: '#f59e0b', platinum: '#06b6d4', diamond: '#818cf8' };
    return colors[league] || '#64748b';
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(ts);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const style = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      color: '#e2e8f0',
      fontFamily: "'Segoe UI', sans-serif",
      display: 'flex' as const,
      flexDirection: 'column' as const,
    },
    header: {
      background: 'rgba(15,23,42,0.9)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '12px 20px',
      display: 'flex' as const,
      alignItems: 'center' as const,
      gap: 12,
    },
    container: { flex: 1, display: 'flex' as const, flexDirection: 'column' as const, maxWidth: 800, margin: '0 auto', width: '100%', padding: '0 16px' },
    tabs: { display: 'flex' as const, gap: 8, padding: '16px 0 0' },
    tab: (active: boolean) => ({
      padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
      background: active ? 'linear-gradient(135deg,#3b82f6,#06b6d4)' : 'rgba(255,255,255,0.07)',
      color: active ? '#fff' : '#64748b',
    }),
    chatBox: {
      flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14, marginTop: 12, display: 'flex' as const, flexDirection: 'column' as const,
      height: 'calc(100vh - 220px)',
    },
    messages: { flex: 1, overflowY: 'auto' as const, padding: 16, display: 'flex' as const, flexDirection: 'column' as const, gap: 8 },
    inputRow: { padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex' as const, gap: 8 },
    input: {
      flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none',
    },
    sendBtn: (disabled: boolean) => ({
      background: disabled ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg,#3b82f6,#06b6d4)',
      border: 'none', borderRadius: 10, color: '#fff', padding: '10px 20px', cursor: disabled ? 'not-allowed' : 'pointer',
      fontWeight: 700, fontSize: 14,
    }),
  };

  return (
    <div style={style.page}>
      {/* Header */}
      <div style={style.header}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>←</button>
        <span style={{ fontSize: 20 }}>💬</span>
        <span style={{ fontWeight: 700, fontSize: 18 }}>Sohbet</span>
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#ef4444', color: '#fff', padding: '10px 20px', borderRadius: 10, zIndex: 9999, fontSize: 14 }}>
          {toast}
        </div>
      )}

      <div style={style.container}>
        {/* Tabs */}
        <div style={style.tabs}>
          <button style={style.tab(activeTab === 'global')} onClick={() => setActiveTab('global')}>
            🌍 Genel Sohbet
          </button>
          <button style={style.tab(activeTab === 'dm')} onClick={() => setActiveTab('dm')}>
            ✉️ Özel Mesajlar
            {conversations.some((c: any) => c.unread_count > 0) && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginLeft: 6 }}>
                {conversations.reduce((s: number, c: any) => s + parseInt(c.unread_count || 0), 0)}
              </span>
            )}
          </button>
        </div>

        {/* ── GENEL SOHBET ── */}
        {activeTab === 'global' && (
          <div style={style.chatBox}>
            <div style={style.messages}>
              {globalMessages.length === 0 && (
                <p style={{ color: '#475569', textAlign: 'center', marginTop: 40 }}>Henüz mesaj yok. İlk mesajı sen gönder!</p>
              )}
              {globalMessages.map((msg: any) => {
                const isMe = msg.user_id === me.id || msg.username === me.username;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {msg.username?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ maxWidth: '70%' }}>
                      {!isMe && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: leagueColor(msg.league) }}>{msg.username}</span>
                          <span style={{ fontSize: 10, color: '#475569' }}>Lv{msg.level}</span>
                        </div>
                      )}
                      <div style={{
                        background: isMe ? 'linear-gradient(135deg,#3b82f6,#06b6d4)' : 'rgba(255,255,255,0.08)',
                        borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        padding: '8px 14px', fontSize: 14,
                      }}>
                        {msg.message}
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={globalBottomRef} />
            </div>
            <div style={style.inputRow}>
              <input
                style={style.input}
                placeholder="Mesaj yaz... (Enter ile gönder)"
                value={globalInput}
                onChange={e => setGlobalInput(e.target.value)}
                onKeyDown={e => handleKeyDown(e, sendGlobal)}
                maxLength={200}
              />
              <button style={style.sendBtn(globalSending || !globalInput.trim())} onClick={sendGlobal} disabled={globalSending || !globalInput.trim()}>
                Gönder
              </button>
            </div>
          </div>
        )}

        {/* ── ÖZEL MESAJLAR ── */}
        {activeTab === 'dm' && (
          <div style={{ ...style.chatBox, flexDirection: 'row' }}>
            {/* Konuşma listesi */}
            <div style={{ width: 220, borderRight: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', flexShrink: 0 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                Konuşmalar
              </div>
              {conversations.length === 0 && (
                <p style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 }}>Henüz konuşma yok</p>
              )}
              {conversations.map((conv: any) => (
                <div
                  key={conv.other_id}
                  onClick={() => setSelectedConv(conv)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: selectedConv?.other_id === conv.other_id ? 'rgba(59,130,246,0.15)' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {conv.other_username?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.other_username}</span>
                      {parseInt(conv.unread_count) > 0 && (
                        <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', minWidth: 18, height: 18, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.last_message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mesaj alanı */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {!selectedConv ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14 }}>
                  Bir konuşma seç veya oyuncu profilinden mesaj gönder
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700, fontSize: 14 }}>
                    {selectedConv.other_username}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dmMessages.map((msg: any) => {
                      const isMe = msg.sender_id === me.id;
                      return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                          <div style={{
                            background: isMe ? 'linear-gradient(135deg,#3b82f6,#06b6d4)' : 'rgba(255,255,255,0.08)',
                            borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                            padding: '8px 14px', fontSize: 14, maxWidth: '75%',
                          }}>
                            {msg.message}
                          </div>
                          <div style={{ fontSize: 11, color: '#475569' }}>{formatDate(msg.created_at)}</div>
                        </div>
                      );
                    })}
                    <div ref={dmBottomRef} />
                  </div>
                  <div style={style.inputRow}>
                    <input
                      style={style.input}
                      placeholder="Mesaj yaz..."
                      value={dmInput}
                      onChange={e => setDmInput(e.target.value)}
                      onKeyDown={e => handleKeyDown(e, sendDm)}
                      maxLength={200}
                    />
                    <button style={style.sendBtn(dmSending || !dmInput.trim())} onClick={sendDm} disabled={dmSending || !dmInput.trim()}>
                      Gönder
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatPage;
