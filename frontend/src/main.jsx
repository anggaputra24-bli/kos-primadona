import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import './styles.css';

const api = async (url, options = {}) => {
  const token = localStorage.getItem('kp_token');
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error((await res.json()).message || 'Terjadi kesalahan');
  return res.json();
};

const rupiah = n => new Intl.NumberFormat('id-ID').format(n);

function Header({ admin = false }) {
  return (
    <header className="header">
      <Link className="brand" to="/">
        <img className="brand-mark" src="/primadona-mark.svg" alt="" />
        <span><b>KOS</b><strong>PRIMADONA</strong></span>
      </Link>
      <nav className="nav">
        <Link to="/">Beranda</Link>
        <a href="#katalog">Katalog</a>
        <a href="#tentang">Tentang</a>
      </nav>
      <Link className="admin-link" to={admin ? '/admin/dashboard' : '/admin/login'}>
        {admin ? 'Dashboard' : 'Login Admin'}
      </Link>
    </header>
  );
}

function Home() {
  const [locations, setLocations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [locationId, setLocationId] = useState(1);
  const [status, setStatus] = useState('semua');
  const [search, setSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [facility, setFacility] = useState('');
  const [compare, setCompare] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api('/api/lokasi'), api('/api/kamar')]).then(([l, r]) => {
      setLocations(l); setRooms(r); setLoading(false);
    });
  }, []);

  const visible = rooms.filter(r => r.lokasi_id === locationId &&
    (status === 'semua' || r.status === status) &&
    r.nama_kamar.toLowerCase().includes(search.toLowerCase()) &&
    r.harga_sewa <= maxPrice &&
    (!facility || r.fasilitas.includes(facility)));

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">Kos Nyaman & Terjangkau</span>
            <h1>Pilih Kamar.<br/><em>Rasakan Nyaman.</em></h1>
            <p>Temukan hunian terbaik di dua lokasi strategis Kos Primadona Jember.</p>
            <a className="primary-btn" href="#katalog">Lihat Kamar <span>→</span></a>
          </div>
          <div className="hero-image">
            <div className="hero-badge"><b>2</b><span>Lokasi<br/>Strategis</span></div>
            <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1100&q=85" alt="Kamar kos nyaman" />
            <div className="hero-mini-stats"><div><b>{rooms.length}</b><span>Kamar</span></div><div><b>{rooms.filter(r => r.status === 'tersedia').length}</b><span>Tersedia</span></div></div>
          </div>
        </section>

        <section className="katalog" id="katalog">
          <div className="section-heading">
            <div><span className="eyebrow">Pilihan Hunian</span><h2>Cari Kamar Favoritmu</h2></div>
            <div className="location-tabs">
              {locations.map(l => (
                <button key={l.id} className={locationId === l.id ? 'active' : ''} onClick={() => setLocationId(l.id)}>
                  {l.nama_lokasi}
                </button>
              ))}
            </div>
          </div>

          <div className="status-tabs">
            {[['semua','Semua'],['tersedia','Tersedia'],['sudah_dipakai','Sudah Dipakai']].map(([value,label]) =>
              <button key={value} className={status === value ? 'active' : ''} onClick={() => setStatus(value)}>{label}</button>
            )}
            <span className="room-count">{visible.length} kamar ditemukan</span>
          </div>

          <div className="catalog-tools">
            <label><span>Cari kamar</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Contoh: Kamar A1" /></label>
            <label><span>Harga maksimal</span><select value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}><option value={1000000}>Semua harga</option><option value={750000}>Rp 750.000</option><option value={850000}>Rp 850.000</option><option value={1000000}>Rp 1.000.000</option></select></label>
            <label><span>Fasilitas</span><select value={facility} onChange={e => setFacility(e.target.value)}><option value="">Semua fasilitas</option>{['AC','WiFi','Kamar mandi dalam','Kasur','Lemari'].map(x => <option key={x}>{x}</option>)}</select></label>
          </div>

          {loading ? <div className="room-grid">{[1,2,3].map(x => <div className="room-card skeleton-card" key={x}><div className="skeleton image" /><div className="skeleton line" /><div className="skeleton line short" /></div>)}</div> :
            <div className="room-grid">
              {visible.map(room => <RoomCard key={room.id} room={room} compare={compare} toggleCompare={r => setCompare(prev => prev.some(x => x.id === r.id) ? prev.filter(x => x.id !== r.id) : prev.length < 3 ? [...prev,r] : prev)} />)}
            </div>}
          {!loading && visible.length === 0 && <div className="empty">Belum ada kamar pada filter ini.</div>}
          {compare.length > 0 && <Comparison rooms={compare} close={() => setCompare([])} />}
        </section>

        <section className="about" id="tentang">
          <div className="about-image">
            <img src="https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?auto=format&fit=crop&w=900&q=85" alt="Interior kos" />
          </div>
          <div className="about-copy">
            <span className="eyebrow">Tentang Primadona</span>
            <h2>Hunian Aman, Nyaman,<br/>dan Mudah Dijangkau</h2>
            <p>Kos Primadona menghadirkan pilihan kamar di lokasi strategis dengan fasilitas lengkap untuk mendukung aktivitasmu setiap hari.</p>
            <div className="about-stats"><div><b>2</b><span>Lokasi</span></div><div><b>24/7</b><span>Keamanan</span></div><div><b>Lengkap</b><span>Fasilitas</span></div></div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function RoomCard({ room, compare = [], toggleCompare }) {
  const selected = compare.some(x => x.id === room.id);
  return (
    <article className="room-card">
      <div className="room-photo">
        <img src={room.foto} alt={room.nama_kamar} onError={e => { e.currentTarget.src = 'https://placehold.co/700x500/e8eee5/1d5d45?text=Foto+Kamar'; }} />
        <span className={`status ${room.status === 'tersedia' ? 'available' : 'occupied'}`}>
          {room.status === 'tersedia' ? 'Tersedia' : 'Sudah Dipakai'}
        </span>
      </div>
      <div className="room-body">
        <h3>{room.nama_kamar}</h3>
        <p className="size">⌖ &nbsp; Luas {room.luas}</p>
        <div className="facilities">{room.fasilitas.slice(0,3).map(x => <span key={x}>{x}</span>)}</div>
        <div className="room-footer">
          <div><small>Mulai dari</small><strong>Rp {rupiah(room.harga_sewa)}<em>/bulan</em></strong></div>
          <div className="card-actions"><button className={`compare-btn ${selected?'selected':''}`} onClick={() => toggleCompare(room)} title="Bandingkan">⇄</button><Link className="detail-btn" to={`/kamar/${room.id}`}>Detail <span>→</span></Link></div>
        </div>
      </div>
    </article>
  );
}

function Comparison({ rooms, close }) {
  return (
    <div className="compare-panel">
      <div className="compare-heading"><div><b>{rooms.length}/3 kamar dipilih</b><small>Perbandingan singkat</small></div><button onClick={close}>×</button></div>
      <div className="compare-items">{rooms.map(r => <div key={r.id}><img src={r.foto} alt="" /><b>{r.nama_kamar}</b><span>Rp {rupiah(r.harga_sewa)}</span><span>{r.luas}</span><span>{r.status === 'tersedia' ? 'Tersedia' : 'Sudah Dipakai'}</span></div>)}</div>
    </div>
  );
}

function Detail() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  useEffect(() => { api(`/api/kamar/${id}`).then(setRoom); }, [id]);
  if (!room) return <><Header /><div className="loading">Memuat kamar...</div></>;
  const text = encodeURIComponent(`Halo, saya tertarik dengan ${room.nama_kamar} di ${room.lokasi.nama_lokasi}. Apakah masih tersedia?`);
  const photos = room.photos && room.photos.length ? room.photos : [room.foto];

  return (
    <>
      <Header />
      <main className="detail-page">
        <nav className="breadcrumb"><Link to="/">Beranda</Link><span>/</span><Link to="/#katalog">Katalog</Link><span>/</span><b>{room.nama_kamar}</b></nav>
        <Link className="back" to="/#katalog">← Kembali ke katalog</Link>
        <div className="detail-layout">
          <div className="detail-gallery">
            <img src={photos[photoIndex]} alt={`${room.nama_kamar} foto ${photoIndex + 1}`} onError={e => { e.currentTarget.src = 'https://placehold.co/900x600/e8eee5/1d5d45?text=Foto+Kamar'; }} />
            {photos.length > 1 && <><button className="gallery-arrow left" onClick={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)}>‹</button><button className="gallery-arrow right" onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)}>›</button><div className="gallery-dots">{photos.map((_,i)=><button key={i} className={i===photoIndex?'active':''} onClick={()=>setPhotoIndex(i)} />)}</div></>}
          </div>
          <aside className="detail-info">
            <span className={`status ${room.status === 'tersedia' ? 'available' : 'occupied'}`}>
              {room.status === 'tersedia' ? 'Tersedia' : 'Sudah Dipakai'}
            </span>
            <h1>{room.nama_kamar}</h1>
            <p className="location-name">⌖ &nbsp; {room.lokasi.nama_lokasi}</p>
            <div className="price">Rp {rupiah(room.harga_sewa)} <span>/ bulan</span></div>
            <div className="spec"><span>Luas kamar</span><b>{room.luas}</b></div>
            <h3>Fasilitas</h3>
            <div className="facility-list">{room.fasilitas.map(f => <span key={f}>✓ {f}</span>)}</div>
            <a className="wa-btn" href={`https://wa.me/${room.lokasi.nomor_whatsapp}?text=${text}`} target="_blank" rel="noreferrer">
              <span>◉</span> Hubungi via WhatsApp
            </a>
          </aside>
        </div>

        <div className="detail-bottom">
          <section>
            <span className="eyebrow">Tata Tertib</span>
            <h2>Peraturan Kos</h2>
            <ol>{room.lokasi.peraturan.map((p,i) => <li key={i}><span>{i+1}</span>{p}</li>)}</ol>
          </section>
          <section>
            <span className="eyebrow">Lokasi</span>
            <h2>Lingkungan Sekitar</h2>
            <div className="map-frame"><iframe src={room.lokasi.peta_embed} title="Peta lokasi" /></div>
            <p>{room.lokasi.info_lingkungan}</p>
            <small>{room.lokasi.alamat}</small>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      const data = await api('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      localStorage.setItem('kp_token', data.token);
      navigate('/admin/dashboard');
    } catch (err) { setError(err.message); }
  };
  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <Link className="brand" to="/"><img className="brand-mark" src="/primadona-mark.svg" alt="" /><span><b>KOS</b><strong>PRIMADONA</strong></span></Link>
        <span className="eyebrow">Panel Pengelola</span>
        <h1>Masuk Admin</h1>
        {error && <div className="error">{error}</div>}
        <label>Username<input value={form.username} onChange={e => setForm({...form,username:e.target.value})} placeholder="Masukkan username" /></label>
        <label>Password<input type="password" value={form.password} onChange={e => setForm({...form,password:e.target.value})} placeholder="Masukkan password" /></label>
        <button className="primary-btn" type="submit">Masuk Dashboard</button>
        <small>Demo: admin / admin123</small>
      </form>
    </div>
  );
}

function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [locations, setLocations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('kp_token')) navigate('/admin/login');
    refresh();
  }, []);
  const refresh = async () => {
    try {
      const [l,r,h,m] = await Promise.all([
        api('/api/lokasi'), api('/api/kamar'), api('/api/riwayat-status'), api('/api/pengingat-bayar')
      ]);
      setLocations(l); setRooms(r); setHistory(h); setReminders(m);
    }
    catch { navigate('/admin/login'); }
  };
  const logout = () => { localStorage.removeItem('kp_token'); navigate('/'); };
  const toggle = async room => {
    await api(`/api/kamar/${room.id}/status`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status: room.status === 'tersedia' ? 'sudah_dipakai':'tersedia'}) });
    refresh();
  };
  const removeRoom = async id => { if(confirm('Hapus kamar ini?')) { await api(`/api/kamar/${id}`,{method:'DELETE'}); refresh(); } };
  const submitRoom = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const saved = await api(editing?.id ? `/api/kamar/${editing.id}` : '/api/kamar', { method: editing?.id ? 'PUT':'POST', body: form });
    await api(`/api/kamar/${saved.id}/penghuni`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tenant: form.get('tenant') || '', due_day: form.get('due_day') || null}) });
    setEditing(null); setMessage('Data kamar berhasil disimpan'); refresh();
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <Link className="brand light" to="/"><img className="brand-mark" src="/primadona-mark.svg" alt="" /><span><b>KOS</b><strong>PRIMADONA</strong></span></Link>
        <nav>
          <button className={tab==='dashboard'?'active':''} onClick={()=>setTab('dashboard')}>▦ &nbsp; Dashboard</button>
          <button className={tab==='kamar'?'active':''} onClick={()=>setTab('kamar')}>▤ &nbsp; Kelola Kamar</button>
          <button className={tab==='lokasi'?'active':''} onClick={()=>setTab('lokasi')}>⌖ &nbsp; Kelola Lokasi</button>
          <button className={tab==='peraturan'?'active':''} onClick={()=>setTab('peraturan')}>☷ &nbsp; Peraturan</button>
          <button className={tab==='pengingat'?'active':''} onClick={()=>setTab('pengingat')}>◷ &nbsp; Pengingat Bayar</button>
          <button className={tab==='riwayat'?'active':''} onClick={()=>setTab('riwayat')}>↺ &nbsp; Riwayat Status</button>
          <button className={tab==='profil'?'active':''} onClick={()=>setTab('profil')}>● &nbsp; Profil Admin</button>
        </nav>
        <button className="logout" onClick={logout}>← Keluar</button>
      </aside>
      <main className="admin-main">
        <header className="admin-head"><div><small>Panel Administrator</small><h1>{tab === 'dashboard' ? 'Dashboard' : tab === 'kamar' ? 'Kelola Kamar' : tab === 'lokasi' ? 'Kelola Lokasi' : tab === 'peraturan' ? 'Peraturan Kos' : tab === 'pengingat' ? 'Pengingat Pembayaran' : tab === 'riwayat' ? 'Riwayat Status' : 'Profil Admin'}</h1></div><Link to="/">Lihat Website ↗</Link></header>
        {message && <div className="success" onClick={()=>setMessage('')}>{message} ×</div>}

        {tab==='dashboard' && <>
          <div className="stat-grid">
            <div><span className="stat-icon">▤</span><div><small>Total Kamar</small><b>{rooms.length}</b></div></div>
            <div><span className="stat-icon green">●</span><div><small>Kamar Tersedia</small><b>{rooms.filter(r=>r.status==='tersedia').length}</b></div></div>
            <div><span className="stat-icon red">●</span><div><small>Sudah Dipakai</small><b>{rooms.filter(r=>r.status==='sudah_dipakai').length}</b></div></div>
            <div><span className="stat-icon">⌖</span><div><small>Lokasi Kos</small><b>{locations.length}</b></div></div>
          </div>
          <section className="admin-panel"><h2>Ringkasan Kamar Terbaru</h2><RoomTable rooms={rooms} toggle={toggle} removeRoom={removeRoom} edit={setEditing} setTab={setTab}/></section>
          {reminders.length > 0 && <section className="admin-panel reminder-strip"><h2>Pengingat Pembayaran Terdekat</h2>{reminders.slice(0,3).map(r => <div key={r.id}><b>{r.nama_kamar}</b><span>{r.tenant}</span><strong>{r.daysLeft >= 0 ? `${r.daysLeft} hari lagi` : 'Sudah lewat'}</strong></div>)}</section>}
        </>}

        {tab==='kamar' && <section className="admin-panel">
          <div className="panel-head"><h2>Daftar Kamar</h2><button className="small-primary" onClick={()=>setEditing({})}>+ Tambah Kamar</button></div>
          {editing && <form className="room-form" onSubmit={submitRoom}>
            <label>Nama Kamar<input name="nama_kamar" defaultValue={editing.nama_kamar||''} required /></label>
            <label>Lokasi<select name="lokasi_id" defaultValue={editing.lokasi_id||locations[0]?.id}>{locations.map(l=><option key={l.id} value={l.id}>{l.nama_lokasi}</option>)}</select></label>
            <label>Luas<input name="luas" defaultValue={editing.luas||''} placeholder="3 x 4 meter" required /></label>
            <label>Harga/bulan<input name="harga_sewa" type="number" defaultValue={editing.harga_sewa||''} required /></label>
            <label className="wide">Fasilitas<input name="fasilitas" defaultValue={editing.fasilitas?.join(', ')||''} placeholder="Kasur, Lemari, AC" /></label>
            <label>Status<select name="status" defaultValue={editing.status||'tersedia'}><option value="tersedia">Tersedia</option><option value="sudah_dipakai">Sudah Dipakai</option></select></label>
            <label>Nama Penghuni<input name="tenant" defaultValue={editing.tenant||''} placeholder="Kosongkan jika tersedia" /></label>
            <label>Hari Jatuh Tempo<input name="due_day" type="number" min="1" max="28" defaultValue={editing.due_day||''} placeholder="Contoh: 5" /></label>
            <label>Foto kamar<input name="foto" type="file" accept="image/*" /></label>
            <div className="form-actions wide"><button type="button" onClick={()=>setEditing(null)}>Batal</button><button className="small-primary" type="submit">Simpan</button></div>
          </form>}
          <RoomTable rooms={rooms} toggle={toggle} removeRoom={removeRoom} edit={(r)=>setEditing(r)} setTab={setTab}/>
        </section>}

        {tab==='lokasi' && <LocationAdmin locations={locations} refresh={refresh}/>}
        {tab==='peraturan' && <RulesAdmin locations={locations} refresh={refresh}/>}
        {tab==='pengingat' && <section className="admin-panel"><div className="panel-head"><h2>Daftar Pengingat Bulanan</h2></div><div className="reminder-list">{reminders.map(r => <article key={r.id}><div className={`reminder-icon ${r.daysLeft <= 3 ? 'urgent':''}`}>◷</div><div><h3>{r.nama_kamar} — {r.tenant}</h3><p>Jatuh tempo tanggal {r.due_day} setiap bulan</p></div><strong className={r.daysLeft <= 3 ? 'urgent-text':''}>{r.daysLeft >= 0 ? `${r.daysLeft} hari lagi` : 'Sudah lewat'}</strong></article>)}</div></section>}
        {tab==='riwayat' && <section className="admin-panel"><h2>Riwayat Perubahan Status</h2><div className="history-list">{history.map(h => {const room=rooms.find(r=>r.id===h.kamar_id);return <article key={h.id}><span className={h.status==='tersedia'?'ok':'used'}>{h.status==='tersedia'?'Tersedia':'Sudah Dipakai'}</span><div><b>{room?.nama_kamar || `Kamar ${h.kamar_id}`}</b><small>{new Date(h.waktu).toLocaleString('id-ID')} · oleh {h.admin}</small></div></article>})}</div></section>}
        {tab==='profil' && <ProfileAdmin setMessage={setMessage}/>}
      </main>
    </div>
  );
}

function ProfileAdmin({setMessage}) {
  const save = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const body = { nama_lengkap: form.get('nama_lengkap'), password: form.get('password') || undefined };
    await api('/api/auth/profil', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    e.target.reset();
    setMessage('Profil admin berhasil diperbarui');
  };
  return <section className="admin-panel profile-panel"><h2>Profil Admin</h2><form onSubmit={save} className="room-form"><label className="wide">Nama Lengkap<input name="nama_lengkap" defaultValue="Pengelola Primadona" /></label><label className="wide">Password Baru<input name="password" type="password" placeholder="Kosongkan jika tidak ingin mengubah" /></label><div className="form-actions wide"><button className="small-primary">Simpan Profil</button></div></form></section>;
}

function RoomTable({rooms,toggle,removeRoom,edit,setTab}) {
  return <div className="table-wrap"><table><thead><tr><th>Foto</th><th>Kamar</th><th>Lokasi</th><th>Harga</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>{rooms.map(r=><tr key={r.id}><td><img className="table-photo" src={r.foto} alt="" /></td><td><b>{r.nama_kamar}</b><small>{r.luas}</small></td><td>Lokasi {r.lokasi_id}</td><td>Rp {rupiah(r.harga_sewa)}</td><td><button className={`toggle-status ${r.status}`} onClick={()=>toggle(r)}>{r.status==='tersedia'?'Tersedia':'Sudah Dipakai'}<span /></button></td><td><button className="icon-btn" onClick={()=>{edit(r); setTab('kamar');}}>✎</button><button className="icon-btn delete" onClick={()=>removeRoom(r.id)}>×</button></td></tr>)}</tbody>
  </table></div>;
}

function LocationAdmin({locations,refresh}) {
  const [editing,setEditing]=useState(null);
  const submit=async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));await api(editing?.id?`/api/lokasi/${editing.id}`:'/api/lokasi',{method:editing?.id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});setEditing(null);refresh();};
  const remove=async id=>{if(confirm('Hapus lokasi beserta kamarnya?')){await api(`/api/lokasi/${id}`,{method:'DELETE'});refresh();}};
  return <section className="admin-panel"><div className="panel-head"><h2>Daftar Lokasi</h2><button className="small-primary" onClick={()=>setEditing({})}>+ Tambah Lokasi</button></div>
    {editing&&<form className="room-form" onSubmit={submit}><label>Nama Lokasi<input name="nama_lokasi" defaultValue={editing.nama_lokasi||''} required/></label><label>Nomor WhatsApp<input name="nomor_whatsapp" defaultValue={editing.nomor_whatsapp||''} required/></label><label className="wide">Alamat<input name="alamat" defaultValue={editing.alamat||''} required/></label><label className="wide">Info Lingkungan<textarea name="info_lingkungan" defaultValue={editing.info_lingkungan||''}/></label><label className="wide">Embed Google Maps<input name="peta_embed" defaultValue={editing.peta_embed||''}/></label><div className="form-actions wide"><button type="button" onClick={()=>setEditing(null)}>Batal</button><button className="small-primary">Simpan</button></div></form>}
    <div className="location-list">{locations.map(l=><article key={l.id}><div className="location-number">{l.id}</div><div><h3>{l.nama_lokasi}</h3><p>{l.alamat}</p><small>WA: {l.nomor_whatsapp}</small></div><div><button className="icon-btn" onClick={()=>setEditing(l)}>✎</button><button className="icon-btn delete" onClick={()=>remove(l.id)}>×</button></div></article>)}</div>
  </section>;
}

function RulesAdmin({locations,refresh}) {
  const [selected,setSelected]=useState(locations[0]?.id);
  const location=locations.find(l=>l.id===selected) || locations[0];
  useEffect(()=>{if(!selected&&locations[0])setSelected(locations[0].id)},[locations]);
  const submit=async e=>{e.preventDefault();const peraturan=[...new FormData(e.target).getAll('rule')].filter(Boolean);await api(`/api/lokasi/${location.id}/peraturan`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({peraturan})});refresh();};
  if(!location)return null;
  return <section className="admin-panel"><div className="panel-head"><h2>Aturan per Lokasi</h2><select className="inline-select" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{locations.map(l=><option key={l.id} value={l.id}>{l.nama_lokasi}</option>)}</select></div><form className="rules-form" onSubmit={submit}>{location.peraturan.map((r,i)=><label key={i}><span>{i+1}</span><input name="rule" defaultValue={r}/></label>)}<label><span>+</span><input name="rule" placeholder="Tambahkan peraturan baru"/></label><button className="small-primary">Simpan Peraturan</button></form></section>;
}

function Footer() {
  return <footer><div className="brand light"><img className="brand-mark" src="/primadona-mark.svg" alt="" /><span><b>KOS</b><strong>PRIMADONA</strong></span></div><p>Hunian nyaman untuk hari-hari produktifmu.</p><span>© 2026 Kos Primadona</span></footer>;
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/kamar/:id" element={<Detail />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/dashboard" element={<Admin />} />
    </Routes>
  </BrowserRouter>
);
