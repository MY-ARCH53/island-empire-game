import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';

function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [resourceForm, setResourceForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) { navigate('/login'); return; }
    const u = JSON.parse(userData);
    if (!u.is_admin) { navigate('/'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.users);
    } catch (err) {
      console.error('Admin load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setEditForm({
      level: user.level,
      experience: user.experience,
      league: user.league,
      is_active: user.is_active,
      is_admin: user.is_admin,
    });
    setResourceForm({
      gold: Math.round(user.resources?.gold || 0),
      wood: Math.round(user.resources?.wood || 0),
      food: Math.round(user.resources?.food || 0),
      energy: Math.round(user.resources?.energy || 0),
    });
    setMessage('');
  };

  const saveUser = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await adminAPI.updateUser(editUser.id, editForm);
      await adminAPI.updateResources(editUser.id, resourceForm);
      setMessage('✅ Kaydedildi!');
      await loadData();
      setTimeout(() => setMessage(''), 2000);
    } catch {
      setMessage('❌ Hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user: any) => {
    if (!confirm(`"${user.username}" kullanıcısını silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;
    try {
      await adminAPI.deleteUser(user.id);
      setEditUser(null);
      await loadData();
    } catch {
      alert('Silme işlemi başarısız');
    }
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const leagueColor: any = { 'Ticaret': '#3b82f6', 'Üretim': '#22c55e', 'Korsan': '#ef4444' };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#fff', fontSize: 20 }}>Admin paneli yükleniyor...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🛡️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Admin Paneli</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>Island Empire Yönetim</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#94a3b8', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
        >
          ← Ana Sayfa
        </button>
      </div>

      <div style={{ padding: 24 }}>
        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Toplam Oyuncu', value: stats.total_users, emoji: '👥', color: '#3b82f6' },
              { label: 'Bugün Aktif', value: stats.active_today, emoji: '🟢', color: '#22c55e' },
              { label: 'Toplam Savaş', value: stats.total_battles, emoji: '⚔️', color: '#ef4444' },
              { label: 'Toplam Lonca', value: stats.total_guilds, emoji: '🏰', color: '#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '20px 16px', border: `1px solid ${s.color}33` }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{s.emoji}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search */}
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="🔍 Oyuncu ara (kullanıcı adı veya e-posta)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 16px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
          />
        </div>

        {/* Table */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {['ID', 'Kullanıcı', 'E-posta', 'Seviye', 'Lig', 'Altın', 'Odun', 'Yiyecek', 'Enerji', 'Ada', 'Durum', 'Kayıt', 'İşlem'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{u.id}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600 }}>{u.username}</span>
                        {u.is_admin && <span style={{ background: '#f59e0b22', color: '#f59e0b', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>ADMIN</span>}
                        {!u.is_active && <span style={{ background: '#ef444422', color: '#ef4444', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>BANLANDI</span>}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ color: '#06b6d4', fontWeight: 600 }}>Lvl {u.level}</span></td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: `${leagueColor[u.league]}22`, color: leagueColor[u.league], padding: '3px 8px', borderRadius: 10, fontSize: 12 }}>
                        {u.league}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#f59e0b' }}>{Math.round(u.resources?.gold || 0)}</td>
                    <td style={{ padding: '10px 14px', color: '#22c55e' }}>{Math.round(u.resources?.wood || 0)}</td>
                    <td style={{ padding: '10px 14px', color: '#ef4444' }}>{Math.round(u.resources?.food || 0)}</td>
                    <td style={{ padding: '10px 14px', color: '#06b6d4' }}>{Math.round(u.resources?.energy || 0)}</td>
                    <td style={{ padding: '10px 14px', color: '#a78bfa' }}>{u.island_count} ada</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.is_active ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => openEdit(u)}
                        style={{ background: '#3b82f6', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                      >
                        Düzenle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>Oyuncu bulunamadı</div>
          )}
        </div>

        <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>
          Toplam {filtered.length} / {users.length} oyuncu gösteriliyor
        </div>
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={() => setEditUser(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
          <div style={{ position: 'relative', background: '#1e293b', borderRadius: 16, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>✏️ {editUser.username}</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>{editUser.email}</p>
              </div>
              <button onClick={() => setEditUser(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Kullanıcı Bilgileri */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>OYUNCU BİLGİLERİ</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Seviye</label>
                  <input
                    type="number" min="1" max="100"
                    value={editForm.level}
                    onChange={e => setEditForm({ ...editForm, level: parseInt(e.target.value) })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Deneyim (XP)</label>
                  <input
                    type="number" min="0"
                    value={editForm.experience}
                    onChange={e => setEditForm({ ...editForm, experience: parseInt(e.target.value) })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 4 }}>Lig</label>
                <select
                  value={editForm.league}
                  onChange={e => setEditForm({ ...editForm, league: e.target.value })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14 }}
                >
                  <option>Ticaret</option>
                  <option>Üretim</option>
                  <option>Korsan</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })}
                  />
                  <span style={{ fontSize: 13 }}>Aktif Hesap</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1, background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <input
                    type="checkbox"
                    checked={editForm.is_admin}
                    onChange={e => setEditForm({ ...editForm, is_admin: e.target.checked })}
                  />
                  <span style={{ fontSize: 13 }}>Admin Yetkisi</span>
                </label>
              </div>
            </div>

            {/* Kaynaklar */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, color: '#94a3b8', marginBottom: 12 }}>KAYNAKLAR</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'gold', label: '💰 Altın', color: '#f59e0b' },
                  { key: 'wood', label: '🪵 Odun', color: '#22c55e' },
                  { key: 'food', label: '🍎 Yiyecek', color: '#ef4444' },
                  { key: 'energy', label: '⚡ Enerji', color: '#06b6d4' },
                ].map(r => (
                  <div key={r.key}>
                    <label style={{ fontSize: 12, color: r.color, display: 'block', marginBottom: 4 }}>{r.label}</label>
                    <input
                      type="number" min="0"
                      value={resourceForm[r.key]}
                      onChange={e => setResourceForm({ ...resourceForm, [r.key]: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: `1px solid ${r.color}44`, borderRadius: 8, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {message && (
              <div style={{ textAlign: 'center', padding: '8px', marginBottom: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 8, fontSize: 14 }}>
                {message}
              </div>
            )}

            {/* Butonlar */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={saveUser}
                disabled={saving}
                style={{ flex: 1, background: '#3b82f6', border: 'none', color: '#fff', padding: '12px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14, opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
              </button>
              <button
                onClick={() => deleteUser(editUser)}
                style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '12px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
