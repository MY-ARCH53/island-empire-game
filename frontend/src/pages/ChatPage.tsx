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
  const seenGlobalIds = useRef<Set<number>>(new Set());

  // DM
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any>(null);
  const [dmMessages, setDmMessages] = useState<any[]>([]);
  const [dmInput, setDmInput] = useState('');
  const [dmSending, setDmSending] = useState(false);
  const dmBottomRef = useRef<HTMLDivElement>(null);

  // Kullanıcı arama (DM yeni konuşma)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  useEffect(() => {
    loadGlobal();
    const iv = setInterval(pollGlobal, 5000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (activeTab === 'dm') loadConversations();
  }, [activeTab]);

  useEffect(() => {
    if (!selectedConv) return;
    loadDmMessages();
    const iv = setInterval(loadDmMessages, 5000);
    return () => clearInterval(iv);
  }, [selectedConv]);

  useEffect(() => {
    globalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalMessages]);

  useEffect(() => {
    dmBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  // Kullanıcı arama debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await chatAPI.searchUsers(searchQuery.trim());
        setSearchResults(r.data.data.users);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadGlobal = async () => {
    try {
      const r = await chatAPI.getGlobal();
      const msgs = r.data.data.messages;
      msgs.forEach((m: any) => seenGlobalIds.current.add(m.id));
      setGlobalMessages(msgs);
      if (msgs.length > 0)
        lastGlobalTs.current = new Date(msgs[msgs.length - 1].created_at).getTime();
    } catch { /* ignore */ }
  };

  const pollGlobal = async () => {
    try {
      const r = await chatAPI.getGlobal(lastGlobalTs.current || undefined);
      const newMsgs = r.data.data.messages.filter((m: any) => !seenGlobalIds.current.has(m.id));
      if (newMsgs.length > 0) {
        newMsgs.forEach((m: any) => seenGlobalIds.current.add(m.id));
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
      const msg = r.data.data.message;
      seenGlobalIds.current.add(msg.id);
      setGlobalMessages(prev => [...prev, msg]);
      lastGlobalTs.current = new Date(msg.created_at).getTime();
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

  const startConversation = (user: any) => {
    setSelectedConv({ other_id: user.id, other_username: user.username, unread_count: 0 });
    setSearchQuery('');
    setSearchResults([]);
    // Konuşma listesine ekle (yoksa)
    setConversations(prev => {
      if (prev.find((c: any) => c.other_id === user.id)) return prev;
      return [{ other_id: user.id, other_username: user.username, unread_count: 0, last_message: '' }, ...prev];
    });
  };

  const handleKey = (e: React.KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fn(); }
  };

  const leagueColor = (league: string) => {
    const c: any = { bronze: '#cd7f32', silver: '#94a3b8', gold: '#f59e0b', platinum: '#06b6d4', diamond: '#818cf8' };
    return c[league] || '#64748b';
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    return d.toDateString() === new Date().toDateString()
      ? formatTime(ts)
      : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const totalUnread = conversations.reduce((s: number, c: any) => s + parseInt(c.unread_count || 0), 0);

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: 'linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)', color: '#e2e8f0', fontFamily: "'Segoe UI',sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => navigate('/home')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>←</button>
        <span style={{ fontSize: 20 }}>💬</span>
        <span style={{ fontWeight: 700, fontSize: 18 }}>Sohbet</span>
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#ef4444', color: '#fff', padding: '10px 20px', borderRadius: 10, zIndex: 9999, fontSize: 14 }}>
          {toast}
        </div>
      )}

      {/* İçerik */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxWidth: 860, margin: '0 auto', width: '100%', padding: '0 16px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 0 10px', flexShrink: 0 }}>
          {[
            { key: 'global', label: '🌍 Genel Sohbet' },
            { key: 'dm',     label: `✉️ Özel Mesajlar${totalUnread > 0 ? ` (${totalUnread})` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
              padding: '9px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              background: activeTab === t.key ? 'linear-gradient(135deg,#3b82f6,#06b6d4)' : 'rgba(255,255,255,0.07)',
              color: activeTab === t.key ? '#fff' : '#64748b',
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── GENEL SOHBET ── */}
        {activeTab === 'global' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 16 }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                      <div style={{ background: isMe ? 'linear-gradient(135deg,#3b82f6,#06b6d4)' : 'rgba(255,255,255,0.08)', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 14px', fontSize: 14 }}>
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
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, flexShrink: 0 }}>
              <input
                style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none' }}
                placeholder="Mesaj yaz... (Enter ile gönder)"
                value={globalInput}
                onChange={e => setGlobalInput(e.target.value)}
                onKeyDown={e => handleKey(e, sendGlobal)}
                maxLength={200}
              />
              <button
                onClick={sendGlobal}
                disabled={globalSending || !globalInput.trim()}
                style={{ background: globalSending || !globalInput.trim() ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg,#3b82f6,#06b6d4)', border: 'none', borderRadius: 10, color: '#fff', padding: '10px 20px', cursor: globalSending || !globalInput.trim() ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}
              >
                Gönder
              </button>
            </div>
          </div>
        )}

        {/* ── ÖZEL MESAJLAR ── */}
        {activeTab === 'dm' && (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, marginBottom: 16 }}>

            {/* Sol panel: arama + konuşma listesi */}
            <div style={{ width: 230, borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              {/* Kullanıcı arama */}
              <div style={{ padding: '12px 12px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                <input
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none' }}
                  placeholder="Oyuncu ara..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {(searchResults.length > 0 || searching) && (
                  <div style={{ position: 'absolute', top: '100%', left: 12, right: 12, background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                    {searching && <div style={{ padding: '10px 14px', color: '#64748b', fontSize: 13 }}>Aranıyor...</div>}
                    {searchResults.map((u: any) => (
                      <div
                        key={u.id}
                        onClick={() => startConversation(u)}
                        style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{u.username}</div>
                          <div style={{ fontSize: 11, color: '#64748b' }}>Lv{u.level}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Konuşmalar */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '8px 14px 4px', fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Konuşmalar</div>
                {conversations.length === 0 && (
                  <p style={{ color: '#475569', fontSize: 12, textAlign: 'center', padding: '20px 14px' }}>Yukarıdan oyuncu ara ve mesaj gönder</p>
                )}
                {conversations.map((conv: any) => (
                  <div
                    key={conv.other_id}
                    onClick={() => setSelectedConv(conv)}
                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.04)', background: selectedConv?.other_id === conv.other_id ? 'rgba(59,130,246,0.15)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {conv.other_username?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.other_username}</span>
                        {parseInt(conv.unread_count) > 0 && (
                          <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, minWidth: 18, height: 18, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', flexShrink: 0 }}>
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.last_message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sağ panel: mesajlar */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              {!selectedConv ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 14, textAlign: 'center', padding: 20 }}>
                  Soldaki listeden bir konuşma seç<br />ya da oyuncu adı arayarak mesaj başlat
                </div>
              ) : (
                <>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {selectedConv.other_username}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {dmMessages.length === 0 && (
                      <p style={{ color: '#475569', textAlign: 'center', marginTop: 40, fontSize: 14 }}>Henüz mesaj yok. Merhaba de!</p>
                    )}
                    {dmMessages.map((msg: any) => {
                      const isMe = msg.sender_id === me.id;
                      return (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 6, alignItems: 'flex-end' }}>
                          <div style={{ background: isMe ? 'linear-gradient(135deg,#3b82f6,#06b6d4)' : 'rgba(255,255,255,0.08)', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', padding: '8px 14px', fontSize: 14, maxWidth: '75%', wordBreak: 'break-word' }}>
                            {msg.message}
                          </div>
                          <div style={{ fontSize: 11, color: '#475569', flexShrink: 0 }}>{formatDate(msg.created_at)}</div>
                        </div>
                      );
                    })}
                    <div ref={dmBottomRef} />
                  </div>
                  <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, flexShrink: 0 }}>
                    <input
                      style={{ flex: 1, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none' }}
                      placeholder="Mesaj yaz..."
                      value={dmInput}
                      onChange={e => setDmInput(e.target.value)}
                      onKeyDown={e => handleKey(e, sendDm)}
                      maxLength={200}
                    />
                    <button
                      onClick={sendDm}
                      disabled={dmSending || !dmInput.trim()}
                      style={{ background: dmSending || !dmInput.trim() ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg,#3b82f6,#06b6d4)', border: 'none', borderRadius: 10, color: '#fff', padding: '10px 20px', cursor: dmSending || !dmInput.trim() ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}
                    >
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
