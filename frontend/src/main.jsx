import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import './styles.css';
import './site.css';

const api = async (url, options = {}) => {
  const token = localStorage.getItem('kp_token');
  const headers = { ...(options.headers || {}) };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) throw new Error((await res.json()).message || 'Terjadi kesalahan');
  return res.json();
};

const rupiah = n => new Intl.NumberFormat('id-ID').format(n);
const PHOTO_FALLBACK = 'https://placehold.co/900x675/ece7e0/8a8178?text=Foto+Kamar';

const Icon = {
  pin: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>,
  check: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>,
  arrow: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  back: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>,
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  chat: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.6Z" /></svg>,
};

function Header() {
  return (
    <header className="site-header">
      <div className="site-wrap site-header-row">
        <Link className="site-logo" to="/">
          <img src="/primadona-mark.svg" alt="" />
          <span>Kos Primadona</span>
        </Link>
        <nav className="site-nav">
          <a href="/#kamar">Kamar</a>
          <a href="/#lokasi">Lokasi</a>
          <a href="/#cara-sewa">Cara Sewa</a>
        </nav>
      </div>
    </header>
  );
}

function Home() {
  const [locations, setLocations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [locationId, setLocationId] = useState(1);
  const [status, setStatus] = useState('semua');
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [facility, setFacility] = useState('');
  const [compare, setCompare] = useState([]);
  const [loading, setLoading] = useState(true);
  const { hash } = useLocation();

  useEffect(() => {
    if (!loading && hash) document.querySelector(hash)?.scrollIntoView();
  }, [loading, hash]);

  useEffect(() => {
    Promise.all([api('/api/lokasi'), api('/api/kamar')]).then(([l, r]) => {
      setLocations(l); setRooms(r); setLoading(false);
    });
  }, []);

  const visible = rooms.filter(r => r.lokasi_id === locationId &&
    (status === 'semua' || r.status === status) &&
    r.harga_sewa <= maxPrice &&
    (!facility || r.fasilitas.includes(facility)));
  const available = rooms.filter(r => r.status === 'tersedia');
  const minPrice = rooms.length ? Math.min(...rooms.map(r => r.harga_sewa)) : 0;
  const toggleCompare = r => setCompare(prev => prev.some(x => x.id === r.id) ? prev.filter(x => x.id !== r.id) : prev.length < 3 ? [...prev, r] : prev);
  const mainWa = locations[0]?.nomor_whatsapp;

  return (
    <div className="site">
      <Header />
      <main>
        <section className="site-wrap hero2">
          <div className="hero2-copy">
            <p className="hero2-place">Jember, Jawa Timur</p>
            <h1>Kamar kos yang tenang, dekat kampus, dan siap ditempati.</h1>
            <p className="hero2-lead">Kos Primadona mengelola dua bangunan di Jember dengan kamar berperabot, harga bulanan yang jelas, dan pengelola yang bisa dihubungi langsung.</p>
            <div className="hero2-actions">
              <a className="btn btn-dark" href="#kamar">Lihat kamar {Icon.arrow}</a>
              {mainWa && <a className="btn btn-line" href={`https://wa.me/${mainWa}`} target="_blank" rel="noreferrer">Tanya pengelola</a>}
            </div>
            <dl className="hero2-facts">
              <div><dt>Harga mulai</dt><dd>{minPrice ? `Rp${rupiah(minPrice)}` : '–'}<small>/bulan</small></dd></div>
              <div><dt>Kamar kosong</dt><dd>{loading ? '–' : available.length}<small> dari {rooms.length}</small></dd></div>
              <div><dt>Lokasi</dt><dd>{locations.length || '–'}<small> bangunan</small></dd></div>
            </dl>
          </div>
          <figure className="hero2-photo">
            <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=85" alt="Interior kamar Kos Primadona" />
          </figure>
        </section>

        <section className="site-section" id="kamar">
          <div className="site-wrap">
            <div className="sec-head">
              <h2>Daftar kamar</h2>
              <p>Pilih lokasi, lalu saring berdasarkan ketersediaan, harga, atau fasilitas.</p>
            </div>

            <div className="loc-tabs" role="tablist">
              {locations.map(l => {
                const count = rooms.filter(r => r.lokasi_id === l.id).length;
                return (
                  <button key={l.id} role="tab" aria-selected={locationId === l.id} className={locationId === l.id ? 'is-active' : ''} onClick={() => setLocationId(l.id)}>
                    {l.nama_lokasi}<span>{count} kamar</span>
                  </button>
                );
              })}
            </div>

            <div className="toolbar">
              <div className="seg">
                {[['semua','Semua'],['tersedia','Tersedia'],['sudah_dipakai','Terisi']].map(([value,label]) =>
                  <button key={value} className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)}>{label}</button>
                )}
              </div>
              <div className="toolbar-selects">
                <select aria-label="Harga maksimal" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}>
                  <option value={1000000}>Semua harga</option><option value={750000}>≤ Rp750.000</option><option value={850000}>≤ Rp850.000</option>
                </select>
                <select aria-label="Fasilitas" value={facility} onChange={e => setFacility(e.target.value)}>
                  <option value="">Semua fasilitas</option>{['AC','WiFi','Kamar mandi dalam','Kasur','Lemari'].map(x => <option key={x}>{x}</option>)}
                </select>
              </div>
              <span className="toolbar-count">{loading ? 'Memuat…' : `${visible.length} kamar`}</span>
            </div>

            {loading ? (
              <div className="room-list">{[1,2,3].map(x => <div className="rcard is-loading" key={x}><div className="rcard-photo" /><div className="sk" /><div className="sk short" /></div>)}</div>
            ) : (
              <div className="room-list">
                {visible.map(room => <RoomCard key={room.id} room={room} selected={compare.some(x => x.id === room.id)} onCompare={() => toggleCompare(room)} />)}
              </div>
            )}
            {!loading && visible.length === 0 && <p className="empty-note">Tidak ada kamar yang cocok dengan filter ini. Coba ubah pilihan harga atau fasilitas.</p>}
          </div>
        </section>

        <section className="site-section alt" id="lokasi">
          <div className="site-wrap">
            <div className="sec-head">
              <h2>Lokasi</h2>
              <p>Dua bangunan, masing-masing dengan pengelola dan nomor WhatsApp sendiri.</p>
            </div>
            <div className="loc-grid">
              {locations.map(l => {
                const free = rooms.filter(r => r.lokasi_id === l.id && r.status === 'tersedia').length;
                return (
                  <article className="loc-item" key={l.id}>
                    <div className="loc-map"><iframe src={l.peta_embed} title={`Peta ${l.nama_lokasi}`} loading="lazy" /></div>
                    <div className="loc-body">
                      <h3>{l.nama_lokasi}</h3>
                      <p className="loc-addr">{Icon.pin}{l.alamat}</p>
                      <p>{l.info_lingkungan}</p>
                      <div className="loc-foot">
                        <span><b>{free}</b> kamar kosong</span>
                        <a href={`https://wa.me/${l.nomor_whatsapp}`} target="_blank" rel="noreferrer">Hubungi pengelola {Icon.arrow}</a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="site-section" id="cara-sewa">
          <div className="site-wrap steps-wrap">
            <div className="sec-head">
              <h2>Cara menyewa</h2>
              <p>Tanpa formulir online. Semua dibicarakan langsung dengan pengelola.</p>
            </div>
            <ol className="steps">
              <li><span>01</span><h3>Pilih kamar</h3><p>Lihat foto, luas, fasilitas, dan harga tiap kamar di halaman detail.</p></li>
              <li><span>02</span><h3>Hubungi pengelola</h3><p>Tekan tombol WhatsApp untuk menanyakan ketersediaan dan jadwal survei.</p></li>
              <li><span>03</span><h3>Survei dan pindah</h3><p>Datang ke lokasi, cek kamar, sepakati pembayaran, lalu kamar siap ditempati.</p></li>
            </ol>
          </div>
        </section>
      </main>
      {compare.length > 0 && <Comparison rooms={compare} remove={toggleCompare} close={() => setCompare([])} />}
      <Footer locations={locations} />
    </div>
  );
}

function RoomCard({ room, selected, onCompare }) {
  const free = room.status === 'tersedia';
  return (
    <article className="rcard">
      <Link to={`/kamar/${room.id}`} className="rcard-photo">
        <img src={room.foto} alt={room.nama_kamar} loading="lazy" onError={e => { e.currentTarget.src = PHOTO_FALLBACK; }} />
      </Link>
      <div className="rcard-top">
        <h3><Link to={`/kamar/${room.id}`}>{room.nama_kamar}</Link></h3>
        <span className={`avail ${free ? 'yes' : 'no'}`}>{free ? 'Tersedia' : 'Terisi'}</span>
      </div>
      <p className="rcard-meta">{room.luas} · {room.fasilitas.slice(0, 3).join(', ')}{room.fasilitas.length > 3 ? ` +${room.fasilitas.length - 3}` : ''}</p>
      <div className="rcard-bottom">
        <p className="rcard-price">Rp{rupiah(room.harga_sewa)}<small> /bulan</small></p>
        <label className="cmp"><input type="checkbox" checked={selected} onChange={onCompare} />Bandingkan</label>
      </div>
    </article>
  );
}

function Comparison({ rooms, remove, close }) {
  const rows = [
    ['Harga', r => `Rp${rupiah(r.harga_sewa)}`],
    ['Luas', r => r.luas],
    ['Status', r => r.status === 'tersedia' ? 'Tersedia' : 'Terisi'],
    ['Fasilitas', r => r.fasilitas.join(', ')],
  ];
  return (
    <aside className="cmp-panel" aria-label="Perbandingan kamar">
      <div className="cmp-head">
        <b>Bandingkan kamar <small>{rooms.length}/3</small></b>
        <button onClick={close} aria-label="Tutup perbandingan">{Icon.close}</button>
      </div>
      <div className="cmp-table" style={{ '--cols': rooms.length }}>
        <div className="cmp-row cmp-names"><span />{rooms.map(r => <span key={r.id}><Link to={`/kamar/${r.id}`}>{r.nama_kamar}</Link><button onClick={() => remove(r)} aria-label={`Hapus ${r.nama_kamar}`}>{Icon.close}</button></span>)}</div>
        {rows.map(([label, get]) => <div className="cmp-row" key={label}><span>{label}</span>{rooms.map(r => <span key={r.id}>{get(r)}</span>)}</div>)}
      </div>
    </aside>
  );
}

function Detail() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  useEffect(() => { api(`/api/kamar/${id}`).then(setRoom); window.scrollTo(0, 0); }, [id]);
  if (!room) return <div className="site"><Header /><p className="site-wrap empty-note">Memuat kamar…</p></div>;
  const text = encodeURIComponent(`Halo, saya tertarik dengan ${room.nama_kamar} di ${room.lokasi.nama_lokasi}. Apakah masih tersedia?`);
  const photos = room.photos && room.photos.length ? room.photos : [room.foto];
  const free = room.status === 'tersedia';

  return (
    <div className="site">
      <Header />
      <main className="site-wrap dpage">
        <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Beranda</Link><span>/</span><Link to="/#kamar">Kamar</Link><span>/</span><b>{room.nama_kamar}</b></nav>

        <div className="dhead">
          <div>
            <h1>{room.nama_kamar}</h1>
            <p className="loc-addr">{Icon.pin}{room.lokasi.nama_lokasi} · {room.lokasi.alamat}</p>
          </div>
          <span className={`avail ${free ? 'yes' : 'no'}`}>{free ? 'Tersedia' : 'Terisi'}</span>
        </div>

        <div className="dgrid">
          <div className="dmain">
            <div className="dgallery">
              <img src={photos[photoIndex]} alt={`${room.nama_kamar}, foto ${photoIndex + 1}`} onError={e => { e.currentTarget.src = PHOTO_FALLBACK; }} />
              {photos.length > 1 && <>
                <button className="dg-nav prev" aria-label="Foto sebelumnya" onClick={() => setPhotoIndex((photoIndex - 1 + photos.length) % photos.length)}>{Icon.back}</button>
                <button className="dg-nav next" aria-label="Foto berikutnya" onClick={() => setPhotoIndex((photoIndex + 1) % photos.length)}>{Icon.arrow}</button>
                <span className="dg-count">{photoIndex + 1} / {photos.length}</span>
              </>}
            </div>
            {photos.length > 1 && <div className="dthumbs">{photos.map((p, i) => <button key={i} className={i === photoIndex ? 'is-active' : ''} onClick={() => setPhotoIndex(i)}><img src={p} alt="" /></button>)}</div>}

            <section className="dsec">
              <h2>Fasilitas kamar</h2>
              <ul className="flist">{room.fasilitas.map(f => <li key={f}>{Icon.check}{f}</li>)}</ul>
            </section>
            <section className="dsec">
              <h2>Peraturan kos</h2>
              <ol className="rlist">{room.lokasi.peraturan.map((p, i) => <li key={i}>{p}</li>)}</ol>
            </section>
            <section className="dsec">
              <h2>Lokasi dan sekitarnya</h2>
              <p>{room.lokasi.info_lingkungan}</p>
              <div className="dmap"><iframe src={room.lokasi.peta_embed} title="Peta lokasi" loading="lazy" /></div>
            </section>
          </div>

          <aside className="dside">
            <div className="dbox">
              <p className="dprice">Rp{rupiah(room.harga_sewa)}<small> /bulan</small></p>
              <dl className="dspecs">
                <div><dt>Luas</dt><dd>{room.luas}</dd></div>
                <div><dt>Lokasi</dt><dd>{room.lokasi.nama_lokasi}</dd></div>
                <div><dt>Status</dt><dd>{free ? 'Bisa ditempati' : 'Sedang terisi'}</dd></div>
              </dl>
              <a className="btn btn-dark btn-block" href={`https://wa.me/${room.lokasi.nomor_whatsapp}?text=${text}`} target="_blank" rel="noreferrer">{Icon.chat}Tanya via WhatsApp</a>
              <p className="dnote">{free ? 'Pesan otomatis berisi nama kamar ini, tinggal kirim.' : 'Kamar sedang terisi. Tanyakan ke pengelola kapan kosong, atau lihat kamar lain.'}</p>
            </div>
            <Link className="dback" to="/#kamar">{Icon.back}Kembali ke daftar kamar</Link>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const wait = ms => new Promise(r => setTimeout(r, ms));

function Mascot({ mode, look }) {
  const eyesOpen = mode === 'watch' || mode === 'peek' || mode === 'alert';
  const pupil = { transform: `translate(${look.x}px, ${look.y}px)` };
  return (
    <svg className={`mascot mascot-${mode}`} viewBox="0 0 200 186" aria-hidden="true">
      <defs><clipPath id="mascot-clip"><rect x="0" y="0" width="200" height="158" /></clipPath></defs>
      <g className="mascot-head" style={{ transform: `rotate(${look.x * 0.7}deg)` }}>
        <path className="m-fur" d="M48 66 L58 10 Q62 4 68 9 L96 40 Z" />
        <path className="m-fur" d="M152 66 L142 10 Q138 4 132 9 L104 40 Z" />
        <path className="m-ear-in" d="M58 52 L63 20 L84 41 Z" />
        <path className="m-ear-in" d="M142 52 L137 20 L116 41 Z" />
        <ellipse className="m-fur" cx="100" cy="82" rx="60" ry="54" />
        <ellipse className="m-face" cx="100" cy="98" rx="47" ry="38" />
        <path className="m-face" d="M100 36 Q110 58 114 74 L86 74 Q90 58 100 36 Z" />
        <ellipse className="m-blush" cx="66" cy="106" rx="8" ry="4.5" />
        <ellipse className="m-blush" cx="134" cy="106" rx="8" ry="4.5" />
        <g className={`m-eyes ${eyesOpen ? 'open' : 'closed'}`}>
          <g className="m-eye-open">
            <circle className="m-sclera" cx="80" cy="88" r="10" />
            <circle className="m-sclera" cx="120" cy="88" r="10" />
            <g className="m-pupil" style={pupil}>
              <circle className="m-iris" cx="80" cy="88" r="6.5" /><circle className="m-dot" cx="80" cy="88" r="3.2" /><circle className="m-shine" cx="78" cy="85.5" r="1.6" />
              <circle className="m-iris" cx="120" cy="88" r="6.5" /><circle className="m-dot" cx="120" cy="88" r="3.2" /><circle className="m-shine" cx="118" cy="85.5" r="1.6" />
            </g>
          </g>
          <g className="m-eye-closed">
            <path d={mode === 'happy' ? 'M71 91 Q80 81 89 91' : 'M71 87 Q80 95 89 87'} />
            <path d={mode === 'happy' ? 'M111 91 Q120 81 129 91' : 'M111 87 Q120 95 129 87'} />
          </g>
        </g>
        <ellipse className="m-nose" cx="100" cy="106" rx="7" ry="5" />
        <path className="m-mouth" d={mode === 'happy' ? 'M88 113 Q100 124 112 113' : 'M100 111 Q95 117 89 114 M100 111 Q105 117 111 114'} />
      </g>
      <g className="m-body" clipPath="url(#mascot-clip)">
        <ellipse className="m-fur" cx="100" cy="166" rx="40" ry="30" />
        <ellipse className="m-face" cx="100" cy="168" rx="20" ry="24" />
      </g>
      <g className="m-paw m-paw-l">
        <ellipse className="m-fur" cx="78" cy="170" rx="15" ry="12" />
        <circle className="m-bean" cx="71" cy="167" r="3" /><circle className="m-bean" cx="78" cy="164" r="3" /><circle className="m-bean" cx="85" cy="167" r="3" /><ellipse className="m-bean" cx="78" cy="174" rx="5" ry="3.6" />
      </g>
      <g className="m-paw m-paw-r">
        <ellipse className="m-fur" cx="122" cy="170" rx="15" ry="12" />
        <circle className="m-bean" cx="115" cy="167" r="3" /><circle className="m-bean" cx="122" cy="164" r="3" /><circle className="m-bean" cx="129" cy="167" r="3" /><ellipse className="m-bean" cx="122" cy="174" rx="5" ry="3.6" />
      </g>
    </svg>
  );
}

function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [focus, setFocus] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [phase, setPhase] = useState('idle');
  const navigate = useNavigate();
  useEffect(() => {
    const onGranted = () => setError('');
    window.addEventListener(ACCESS_GRANTED_EVENT, onGranted);
    return () => window.removeEventListener(ACCESS_GRANTED_EVENT, onGranted);
  }, []);

  const typed = text => Math.min(text.length / 22, 1);
  let mode = 'sleep';
  let look = { x: 0, y: 0 };
  if (phase === 'success') mode = 'happy';
  else if (phase === 'loading') { mode = 'watch'; look = { x: 5, y: 6 }; }
  else if (phase === 'error') { mode = 'alert'; look = { x: 0, y: 2 }; }
  else if (focus === 'password') {
    mode = showPass ? 'peek' : 'cover';
    look = { x: -5 + 10 * typed(form.password), y: 5 };
  } else if (focus === 'username') {
    mode = 'watch';
    look = { x: -5 + 10 * typed(form.username), y: 4 };
  } else if (form.username || form.password) mode = 'watch';

  const submit = async e => {
    e.preventDefault();
    if (phase === 'loading' || phase === 'success') return;
    setError(''); setFocus(''); setPhase('loading');
    document.activeElement?.blur();
    const started = Date.now();
    try {
      const accessToken = sessionStorage.getItem('kp_access_token');
      const data = await api('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${accessToken || ''}`}, body:JSON.stringify(form) });
      await wait(Math.max(0, 1500 - (Date.now() - started)));
      sessionStorage.removeItem('kp_access_token');
      localStorage.setItem('kp_token', data.token);
      setPhase('success');
      await wait(1100);
      navigate('/admin/dashboard');
    } catch (err) {
      await wait(Math.max(0, 900 - (Date.now() - started)));
      const accessExpired = /kode admin/i.test(err.message);
      setPhase('error');
      setError(accessExpired ? 'Kode rahasia sudah kedaluwarsa. Masukkan kode lagi, lalu tekan Masuk Dashboard.' : err.message);
      if (accessExpired) {
        sessionStorage.removeItem('kp_access_token');
        window.dispatchEvent(new CustomEvent(OPEN_ACCESS_EVENT, { detail: 'Kode sebelumnya sudah kedaluwarsa. Masukkan kode rahasia lagi.' }));
      }
      await wait(1200);
      setPhase(p => (p === 'error' ? 'idle' : p));
    }
  };

  const status = phase === 'loading' ? 'Sedang masuk…' : phase === 'success' ? 'Selamat datang kembali!' : '';
  return (
    <div className="auth-page">
      <div className="auth-glow" aria-hidden="true"><span /><span /></div>
      <div className={`auth-stage phase-${phase}`}>
        <Mascot mode={mode} look={look} />
        <form className="auth-card" onSubmit={submit}>
          <h1>Primadona</h1>
          <p className="auth-sub">Selamat datang kembali. Si penjaga kos sedang mengawasi.</p>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <label className="auth-field">
            <span>Username</span>
            <input value={form.username} autoComplete="username" placeholder="Masukkan username"
              onFocus={() => setFocus('username')} onBlur={() => setFocus('')}
              onChange={e => setForm({ ...form, username: e.target.value })} />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input type={showPass ? 'text' : 'password'} value={form.password} autoComplete="current-password" placeholder="Masukkan password"
              onFocus={() => setFocus('password')} onBlur={() => setFocus('')}
              onChange={e => setForm({ ...form, password: e.target.value })} />
            <button type="button" className={`auth-eye${showPass ? ' on' : ''}`} aria-label={showPass ? 'Sembunyikan password' : 'Tampilkan password'}
              onMouseDown={e => e.preventDefault()} onClick={() => setShowPass(v => !v)}>
              <svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /><path className="slash" d="M4 4l16 16" /></svg>
            </button>
          </label>
          <button className="auth-submit" type="submit" disabled={phase === 'loading' || phase === 'success'}>
            <span>Masuk Dashboard</span>
            <span className="auth-door" aria-hidden="true">
              <i className="door-light" /><i className="door-panel" />
              <svg className="walker" viewBox="0 0 12 24"><circle cx="6" cy="3.2" r="2.6" /><path d="M6 6v9" /><path className="w-leg l" d="M6 15l-3 7" /><path className="w-leg r" d="M6 15l3 7" /><path d="M6 8l-3 5M6 8l3 5" /></svg>
            </span>
          </button>
          <p className="auth-status" aria-live="polite">{status}</p>
          <div className="auth-foot">
            <Link to="/">← Kembali ke beranda</Link>
            <small>Demo: admin / admin123</small>
          </div>
        </form>
      </div>
    </div>
  );
}

// Komunikasi antara halaman login dan jendela kode akses (Ctrl+Z).
const OPEN_ACCESS_EVENT = 'kp:open-access';
const ACCESS_GRANTED_EVENT = 'kp:access-granted';

function AdminLoginGate() {
  return sessionStorage.getItem('kp_access_token') ? <Login /> : <Navigate to="/" replace />;
}

function AdminAccessShortcut() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onKeyDown = event => {
      const target = event.target;
      const isEditing = target instanceof HTMLElement &&
        (target.isContentEditable || target.matches('input, textarea, select'));
      if (event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'z' && !isEditing) {
        event.preventDefault();
        setCode('');
        setError('');
        setIsOpen(true);
      }
      if (event.key === 'Escape') setIsOpen(false);
    };
    const onOpenRequest = event => {
      setCode('');
      setError(event.detail || '');
      setIsOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_ACCESS_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_ACCESS_EVENT, onOpenRequest);
    };
  }, []);

  const submit = async event => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await api('/api/auth/admin-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      sessionStorage.setItem('kp_access_token', result.token);
      setIsOpen(false);
      window.dispatchEvent(new Event(ACCESS_GRANTED_EVENT));
      navigate('/admin/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="access-overlay" onMouseDown={event => {
      if (event.target === event.currentTarget) setIsOpen(false);
    }}>
      <form className="access-card" onSubmit={submit}>
        <button className="access-close" type="button" aria-label="Tutup" onClick={() => setIsOpen(false)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <h2>Akses pengelola</h2>
        <p className="access-sub">Masukkan kode rahasia untuk membuka halaman login admin.</p>
        {error && <div className="access-error" role="alert">{error}</div>}
        <label htmlFor="admin-access-code">Kode rahasia</label>
        <input
          id="admin-access-code"
          type="password"
          autoComplete="off"
          autoFocus
          value={code}
          onChange={event => setCode(event.target.value)}
          required
        />
        <button className="access-submit" type="submit" disabled={submitting}>
          {submitting ? 'Memeriksa…' : 'Lanjutkan'}
        </button>
        <p className="access-hint">Tekan Esc untuk menutup.</p>
      </form>
    </div>
  );
}

const AdIcon = {
  dashboard: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>,
  kamar: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M3 18v2M21 18v2M6 10V6h5v4" /></svg>,
  lokasi: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>,
  peraturan: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>,
  pembayaran: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M16 15h2" /></svg>,
  wa: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" /><path d="M9 9.5c.3 2 2.2 4.2 4.5 4.8l1-1.1 1.8.8-.4 1.6c-3.8.2-7.6-3.6-7.4-7.4l1.6-.4.8 1.8z" /></svg>,
  check: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  undo: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>,
  prev: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>,
  next: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>,
  shield: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M12 8v4M12 15.5h.01" /></svg>,
  riwayat: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 8v4l3 2" /></svg>,
  profil: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  out: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>,
  ext: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>,
  edit: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  download: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>,
};

const ADMIN_TABS = [
  ['dashboard', 'Ringkasan'],
  ['kamar', 'Kamar'],
  ['lokasi', 'Lokasi'],
  ['peraturan', 'Peraturan'],
  ['pembayaran', 'Pembayaran'],
  ['riwayat', 'Riwayat status'],
  ['profil', 'Profil admin'],
];

function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('dashboard');
  const [locations, setLocations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [history, setHistory] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [me, setMe] = useState(null);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('kp_token')) navigate('/admin/login');
    refresh();
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 3500);
    return () => clearTimeout(t);
  }, [message]);
  const refresh = async () => {
    try {
      const [l,r,h,m,profile] = await Promise.all([
        api('/api/lokasi'), api('/api/kamar'), api('/api/riwayat-status'), api('/api/pengingat-bayar'), api('/api/auth/me')
      ]);
      setLocations(l); setRooms(r); setHistory(h); setReminders(m); setMe(profile);
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
    const tenantData = { tenant: form.get('tenant') || '', tenant_phone: form.get('tenant_phone') || '', due_day: form.get('due_day') || null };
    ['tenant', 'tenant_phone', 'due_day'].forEach(k => form.delete(k));
    if (!form.get('foto')?.size) form.delete('foto');
    try {
      const saved = await api(editing?.id ? `/api/kamar/${editing.id}` : '/api/kamar', { method: editing?.id ? 'PUT':'POST', body: form });
      await api(`/api/kamar/${saved.id}/penghuni`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(tenantData) });
      setEditing(null); setMessage('Data kamar berhasil disimpan.'); refresh();
    } catch (err) {
      setMessage(err.message);
    }
  };
  const openEdit = room => { setEditing(room); setTab('kamar'); window.scrollTo(0, 0); };
  const [exporting, setExporting] = useState(false);
  const downloadExcel = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export/excel', { headers: { Authorization: `Bearer ${localStorage.getItem('kp_token')}` } });
      if (res.status === 401) return navigate('/admin/login');
      if (!res.ok) throw new Error();
      const name = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'data-kos-primadona.xlsx';
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('File Excel berhasil diunduh.');
    } catch {
      setMessage('Gagal membuat file Excel. Coba lagi.');
    } finally {
      setExporting(false);
    }
  };

  const occupied = rooms.filter(r => r.status === 'sudah_dipakai');
  const billed = reminders.reduce((sum, b) => sum + b.harga_sewa, 0);
  const received = reminders.reduce((sum, b) => sum + (b.payment?.jumlah || 0), 0);
  const unpaid = reminders.filter(b => b.status !== 'lunas').length;
  const needsAttention = reminders.some(b => b.status === 'terlambat' || b.status === 'segera' || b.tunggakan.length);
  const locName = id => locations.find(l => l.id === id)?.nama_lokasi || `Lokasi ${id}`;
  const title = ADMIN_TABS.find(([k]) => k === tab)?.[1];
  const today = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  return (
    <div className="site adm">
      <aside className="adm-side">
        <Link className="site-logo" to="/"><img src="/primadona-mark.svg" alt="" /><span>Kos Primadona</span></Link>
        <p className="adm-side-label">Panel pengelola</p>
        <nav className="adm-nav">
          {ADMIN_TABS.map(([key, label]) => (
            <button key={key} className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}>
              {AdIcon[key]}<span>{label}</span>
              {key === 'pembayaran' && needsAttention && <i className="adm-dot" aria-label="Ada tagihan yang perlu ditindaklanjuti" />}
              {key === 'profil' && me?.default_password && <i className="adm-dot" aria-label="Password bawaan belum diganti" />}
            </button>
          ))}
        </nav>
        <div className="adm-side-foot">
          <Link to="/" target="_blank">{AdIcon.ext}<span>Lihat website</span></Link>
          <button onClick={logout}>{AdIcon.out}<span>Keluar</span></button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-head">
          <div>
            <p>{today}</p>
            <h1>{title}</h1>
          </div>
          <div className="adm-head-actions">
            <button className="btn btn-line" onClick={downloadExcel} disabled={exporting}>{AdIcon.download}{exporting ? 'Menyiapkan…' : 'Unduh Excel'}</button>
            {tab === 'kamar' && !editing && <button className="btn btn-dark" onClick={() => setEditing({})}>{AdIcon.plus}Tambah kamar</button>}
          </div>
        </header>
        {message && <div className="adm-toast" role="status">{message}<button onClick={() => setMessage('')} aria-label="Tutup">{AdIcon.close}</button></div>}
        {me?.default_password && tab !== 'profil' && (
          <div className="adm-alert" role="alert">
            {AdIcon.shield}
            <p><b>Akun masih memakai password bawaan.</b> Siapa pun yang tahu password standar bisa masuk ke dashboard. Ganti sekarang agar data penghuni aman.</p>
            <button className="btn btn-dark" onClick={() => setTab('profil')}>Ganti password</button>
          </div>
        )}

        {tab === 'dashboard' && <>
          <dl className="adm-stats">
            <div><dt>Total kamar</dt><dd>{rooms.length}</dd><small>di {locations.length} lokasi</small></div>
            <div><dt>Tersedia</dt><dd className="ok">{rooms.length - occupied.length}</dd><small>siap disewakan</small></div>
            <div><dt>Terisi</dt><dd>{occupied.length}</dd><small>{rooms.length ? Math.round(occupied.length / rooms.length * 100) : 0}% tingkat hunian</small></div>
            <div><dt>Diterima bulan ini</dt><dd>Rp{rupiah(received)}</dd><small>{billed ? `dari Rp${rupiah(billed)} · ${unpaid ? `${unpaid} belum bayar` : 'semua lunas'}` : 'belum ada tagihan'}</small></div>
          </dl>
          <div className="adm-cols">
            <section className="adm-panel">
              <div className="adm-panel-head"><h2>Kamar</h2><button className="adm-link" onClick={() => setTab('kamar')}>Kelola semua</button></div>
              <RoomTable rooms={rooms} toggle={toggle} removeRoom={removeRoom} edit={openEdit} locName={locName} compact />
            </section>
            <section className="adm-panel">
              <div className="adm-panel-head"><h2>Tagihan bulan ini</h2><button className="adm-link" onClick={() => setTab('pembayaran')}>Kelola</button></div>
              {reminders.length === 0 ? <p className="adm-empty">Belum ada penghuni dengan tanggal jatuh tempo.</p> :
                <ul className="adm-due">{reminders.slice(0, 5).map(b => <BillSummaryRow key={b.kamar_id} b={b} />)}</ul>}
            </section>
          </div>
        </>}

        {tab === 'kamar' && <>
          {editing && <section className="adm-panel">
            <div className="adm-panel-head"><h2>{editing.id ? `Ubah ${editing.nama_kamar}` : 'Kamar baru'}</h2></div>
            <form className="adm-form" onSubmit={submitRoom} key={editing.id || 'new'}>
              <label>Nama kamar<input name="nama_kamar" defaultValue={editing.nama_kamar||''} required /></label>
              <label>Lokasi<select name="lokasi_id" defaultValue={editing.lokasi_id||locations[0]?.id}>{locations.map(l=><option key={l.id} value={l.id}>{l.nama_lokasi}</option>)}</select></label>
              <label>Luas<input name="luas" defaultValue={editing.luas||''} placeholder="3 x 4 meter" required /></label>
              <label>Harga per bulan (Rp)<input name="harga_sewa" type="number" defaultValue={editing.harga_sewa||''} required /></label>
              <label className="wide">Fasilitas<input name="fasilitas" defaultValue={editing.fasilitas?.join(', ')||''} placeholder="Kasur, Lemari, AC" /><small>Pisahkan dengan koma.</small></label>
              <label>Status<select name="status" defaultValue={editing.status||'tersedia'}><option value="tersedia">Tersedia</option><option value="sudah_dipakai">Terisi</option></select></label>
              <label>Nama penghuni<input name="tenant" defaultValue={editing.tenant||''} placeholder="Kosongkan jika tersedia" /></label>
              <label>No. HP / WhatsApp penghuni<input name="tenant_phone" type="tel" inputMode="tel" defaultValue={editing.tenant_phone ? `0${editing.tenant_phone.slice(2)}` : ''} placeholder="081234567890" /><small>Dipakai untuk tombol pengingat WhatsApp.</small></label>
              <label>Tanggal jatuh tempo<input name="due_day" type="number" min="1" max="31" defaultValue={editing.due_day||''} placeholder="1–31" /><small>Tanggal 29–31 otomatis jadi akhir bulan untuk bulan yang lebih pendek.</small></label>
              <label>Foto kamar<input name="foto" type="file" accept="image/*" /></label>
              <div className="adm-form-actions wide"><button type="button" className="btn btn-line" onClick={()=>setEditing(null)}>Batal</button><button className="btn btn-dark" type="submit">Simpan</button></div>
            </form>
          </section>}
          <section className="adm-panel">
            <RoomTable rooms={rooms} toggle={toggle} removeRoom={removeRoom} edit={openEdit} locName={locName} />
          </section>
        </>}

        {tab === 'lokasi' && <LocationAdmin locations={locations} rooms={rooms} refresh={refresh} setMessage={setMessage} />}
        {tab === 'peraturan' && <RulesAdmin locations={locations} refresh={refresh} setMessage={setMessage} />}
        {tab === 'pembayaran' && <PaymentsAdmin setMessage={setMessage} onChange={refresh} editRoom={id => { const room = rooms.find(r => r.id === id); if (room) openEdit(room); }} />}
        {tab === 'riwayat' && <section className="adm-panel">
          {history.length === 0 ? <p className="adm-empty">Belum ada perubahan status.</p> :
            <ol className="adm-history">{history.map(h => {
              const room = rooms.find(r => r.id === h.kamar_id);
              return <li key={h.id}><span className={`avail ${h.status === 'tersedia' ? 'yes' : 'no'}`}>{h.status === 'tersedia' ? 'Tersedia' : 'Terisi'}</span><b>{room?.nama_kamar || `Kamar ${h.kamar_id}`}</b><small>{new Date(h.waktu).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' })} · {h.admin}</small></li>;
            })}</ol>}
        </section>}
        {tab === 'profil' && me && <ProfileAdmin me={me} setMe={setMe} setMessage={setMessage} />}
      </main>
    </div>
  );
}

// ===== Pembayaran =====
const pad2 = n => String(n).padStart(2, '0');
const toPeriod = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
const todayYmd = () => { const d = new Date(); return `${toPeriod(d)}-${pad2(d.getDate())}`; };
const shiftPeriod = (p, n) => { const [y, m] = p.split('-').map(Number); return toPeriod(new Date(y, m - 1 + n, 1)); };
const monthLabel = p => { const [y, m] = p.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }); };
const dateLabel = (s, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('id-ID', opts); };
const STATUS_TEXT = { lunas: 'Lunas', terlambat: 'Terlambat', segera: 'Segera', belum: 'Belum bayar' };

const dueText = b => {
  if (b.status === 'lunas') return `Dibayar ${dateLabel(b.payment.tanggal, { day: 'numeric', month: 'short' })}`;
  if (b.daysLeft < 0) return `Lewat ${-b.daysLeft} hari`;
  if (b.daysLeft === 0) return 'Jatuh tempo hari ini';
  if (b.daysLeft === 1) return 'Jatuh tempo besok';
  return `${b.daysLeft} hari lagi`;
};

// Pesan WhatsApp disesuaikan dengan status tagihan.
function waMessage(b) {
  const greet = `Halo ${b.tenant}, kami dari pengelola ${b.lokasi || 'Kos Primadona'}.`;
  const sign = '\n\nTerima kasih,\nPengelola Kos Primadona';
  if (b.status === 'lunas') {
    return `${greet}\n\nPembayaran sewa ${b.nama_kamar} untuk ${monthLabel(b.periode)} sebesar Rp${rupiah(b.payment.jumlah)} sudah kami terima pada ${dateLabel(b.payment.tanggal)} (${b.payment.metode === 'transfer' ? 'transfer' : 'tunai'}).${sign}`;
  }
  const amount = `Rp${rupiah(b.harga_sewa)}`;
  const when = b.daysLeft === 0 ? 'hari ini' : b.daysLeft === 1 ? 'besok' : `pada ${dateLabel(b.jatuh_tempo)}`;
  const body = b.status === 'terlambat'
    ? `Kami ingin mengingatkan bahwa sewa ${b.nama_kamar} untuk ${monthLabel(b.periode)} sebesar ${amount} sudah melewati jatuh tempo (${dateLabel(b.jatuh_tempo)}). Mohon pembayaran dapat segera dilakukan.`
    : `Kami ingin mengingatkan bahwa sewa ${b.nama_kamar} untuk ${monthLabel(b.periode)} sebesar ${amount} jatuh tempo ${when}.`;
  const arrears = b.tunggakan.filter(p => p !== b.periode);
  const arrearsNote = arrears.length ? `\n\nSelain itu, pembayaran untuk ${arrears.map(monthLabel).join(', ')} juga belum kami terima.` : '';
  return `${greet}\n\n${body}${arrearsNote}\n\nAbaikan pesan ini jika sudah membayar.${sign}`;
}
const waLink = b => `https://wa.me/${b.tenant_phone}?text=${encodeURIComponent(waMessage(b))}`;

function BillSummaryRow({ b }) {
  return (
    <li className={`is-${b.status}`}>
      <div><b>{b.nama_kamar}</b><span>{b.tenant}</span></div>
      <span className={`chip ${b.status}`}>{b.status === 'lunas' ? 'Lunas' : dueText(b)}</span>
    </li>
  );
}

function PaymentsAdmin({ setMessage, onChange, editRoom }) {
  const [periode, setPeriode] = useState(() => toPeriod(new Date()));
  const [data, setData] = useState(null);
  const [recording, setRecording] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = async (p = periode) => {
    try { setData(await api(`/api/pembayaran?periode=${p}`)); }
    catch (err) { setMessage(err.message); }
  };
  useEffect(() => { setData(null); setRecording(null); load(periode); }, [periode]);

  const record = async e => {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.target));
    setBusy(true);
    try {
      await api('/api/pembayaran', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, kamar_id: recording.kamar_id, periode }) });
      setMessage(`Pembayaran ${recording.nama_kamar} untuk ${monthLabel(periode)} tercatat.`);
      setRecording(null); await load(); onChange();
    } catch (err) { setMessage(err.message); }
    finally { setBusy(false); }
  };
  const cancel = async b => {
    if (!confirm(`Batalkan catatan pembayaran ${b.nama_kamar} untuk ${monthLabel(b.periode)}?`)) return;
    try {
      await api(`/api/pembayaran/${b.payment.id}`, { method: 'DELETE' });
      setMessage('Catatan pembayaran dibatalkan.'); await load(); onChange();
    } catch (err) { setMessage(err.message); }
  };

  const s = data?.ringkasan;
  const isCurrent = periode === toPeriod(new Date());
  return (
    <>
      <div className="pay-bar">
        <div className="pay-period" role="group" aria-label="Pilih bulan">
          <button className="adm-icon" onClick={() => setPeriode(p => shiftPeriod(p, -1))} aria-label="Bulan sebelumnya">{AdIcon.prev}</button>
          <strong>{monthLabel(periode)}</strong>
          <button className="adm-icon" onClick={() => setPeriode(p => shiftPeriod(p, 1))} aria-label="Bulan berikutnya">{AdIcon.next}</button>
        </div>
        {!isCurrent && <button className="adm-link" onClick={() => setPeriode(toPeriod(new Date()))}>Kembali ke bulan ini</button>}
      </div>

      <dl className="adm-stats">
        <div><dt>Tagihan {monthLabel(periode).split(' ')[0]}</dt><dd>Rp{rupiah(s?.ditagih || 0)}</dd><small>{data ? `total sewa ${data.tagihan.length} penghuni` : '…'}</small></div>
        <div><dt>Sudah diterima</dt><dd className="ok">Rp{rupiah(s?.diterima || 0)}</dd><small>{s ? `${s.lunas} lunas · ${s.ditagih ? Math.round(Math.min(s.diterima, s.ditagih) / s.ditagih * 100) : 0}% terkumpul` : '…'}</small></div>
        <div><dt>Sisa tagihan</dt><dd className={s && s.belum === 0 && s.ditagih ? 'ok' : ''}>Rp{rupiah(Math.max(0, (s?.ditagih || 0) - (s?.diterima || 0)))}</dd><small>{s ? (s.belum ? `${s.belum} penghuni belum bayar` : s.ditagih ? 'semua sudah lunas' : '–') : '…'}</small></div>
        <div><dt>Terlambat</dt><dd className={s?.terlambat ? 'late' : ''}>{s?.terlambat ?? 0}</dd><small>lewat jatuh tempo</small></div>
      </dl>

      <section className="adm-panel">
        {!data ? <p className="adm-empty">Memuat tagihan…</p> :
          data.tagihan.length === 0 ? <p className="adm-empty">Belum ada penghuni dengan tanggal jatuh tempo. Isi nama penghuni, nomor HP, dan tanggal jatuh tempo di menu Kamar.</p> :
          <ul className="bills">
            {data.tagihan.map(b => (
              <li key={b.kamar_id} className={`bill is-${b.status}`}>
                <div className="bill-who">
                  <b>{b.tenant}</b>
                  <span>{b.nama_kamar} · {b.lokasi}</span>
                  {b.tunggakan.filter(p => p !== periode).length > 0 && (
                    <span className="bill-arrears">Menunggak: {b.tunggakan.filter(p => p !== periode).map(p => (
                      <button key={p} className="adm-link" onClick={() => setPeriode(p)}>{monthLabel(p)}</button>
                    ))}</span>
                  )}
                </div>
                <div className="bill-due">
                  <span>Jatuh tempo {dateLabel(b.jatuh_tempo, { day: 'numeric', month: 'short' })}</span>
                  <b className="num">Rp{rupiah(b.status === 'lunas' ? b.payment.jumlah : b.harga_sewa)}</b>
                </div>
                <div className="bill-status">
                  <span className={`chip ${b.status}`}>{STATUS_TEXT[b.status]}</span>
                  <small>{b.status === 'lunas' ? `${dateLabel(b.payment.tanggal, { day: 'numeric', month: 'short' })} · ${b.payment.metode === 'transfer' ? 'Transfer' : 'Tunai'}` : dueText(b)}</small>
                </div>
                <div className="bill-actions">
                  {b.tenant_phone
                    ? <a className="btn btn-line btn-sm" href={waLink(b)} target="_blank" rel="noreferrer" title={b.status === 'lunas' ? 'Kirim bukti terima via WhatsApp' : 'Kirim pengingat via WhatsApp'}>{AdIcon.wa}{b.status === 'lunas' ? 'Kirim bukti' : 'Ingatkan'}</a>
                    : <button className="btn btn-line btn-sm" onClick={() => editRoom(b.kamar_id)} title="Nomor HP penghuni belum diisi">{AdIcon.wa}Isi no. HP</button>}
                  {b.status === 'lunas'
                    ? <button className="adm-icon" onClick={() => cancel(b)} aria-label="Batalkan pembayaran" title="Batalkan pembayaran">{AdIcon.undo}</button>
                    : <button className="btn btn-dark btn-sm" onClick={() => setRecording(recording?.kamar_id === b.kamar_id ? null : b)}>{AdIcon.check}Catat bayar</button>}
                </div>
                {recording?.kamar_id === b.kamar_id && (
                  <form className="adm-form bill-form" onSubmit={record}>
                    <label>Jumlah (Rp)<input name="jumlah" type="number" min="1" defaultValue={b.harga_sewa} required autoFocus /></label>
                    <label>Tanggal bayar<input name="tanggal" type="date" defaultValue={todayYmd()} max={todayYmd()} required /></label>
                    <label>Metode<select name="metode" defaultValue="tunai"><option value="tunai">Tunai</option><option value="transfer">Transfer</option></select></label>
                    <label>Catatan<input name="catatan" maxLength="200" placeholder="Opsional, mis. lewat BCA" /></label>
                    <div className="adm-form-actions wide">
                      <button type="button" className="btn btn-line" onClick={() => setRecording(null)}>Batal</button>
                      <button className="btn btn-dark" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan pembayaran'}</button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ul>}
      </section>
    </>
  );
}

function ProfileAdmin({ me, setMe, setMessage }) {
  const [error, setError] = useState('');
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  const checks = [
    [pw.length >= 8, 'Minimal 8 karakter'],
    [/[a-zA-Z]/.test(pw) && /\d/.test(pw), 'Mengandung huruf dan angka'],
    [pw && pw !== 'admin123' && !pw.toLowerCase().includes(me.username.toLowerCase()), 'Bukan password bawaan / nama pengguna'],
  ];
  const save = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const password = form.get('password');
    setError('');
    if (password && password !== form.get('konfirmasi')) return setError('Konfirmasi password tidak sama.');
    if (password && !checks.every(([ok]) => ok)) return setError('Password baru belum memenuhi syarat di bawah.');
    setSaving(true);
    try {
      const body = { nama_lengkap: form.get('nama_lengkap'), ...(password ? { password, password_lama: form.get('password_lama') } : {}) };
      const result = await api('/api/auth/profil', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
      if (result.token) localStorage.setItem('kp_token', result.token);
      setMe(m => ({ ...m, nama_lengkap: result.nama_lengkap, default_password: result.default_password }));
      ['password_lama', 'password', 'konfirmasi'].forEach(n => { e.target.elements[n].value = ''; });
      setPw('');
      setMessage(password ? 'Password berhasil diganti. Sesi di perangkat lain otomatis keluar.' : 'Profil admin berhasil diperbarui.');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  return (
    <section className="adm-panel adm-narrow">
      {me.default_password && <div className="adm-alert inline">{AdIcon.shield}<p><b>Ganti password bawaan.</b> Password <code>admin123</code> mudah ditebak siapa saja.</p></div>}
      <form onSubmit={save} className="adm-form one">
        <label>Username<input value={me.username} disabled /></label>
        <label>Nama lengkap<input name="nama_lengkap" defaultValue={me.nama_lengkap} maxLength="80" /></label>
        <fieldset className="adm-fieldset">
          <legend>Ganti password</legend>
          <label>Password lama<input name="password_lama" type="password" autoComplete="current-password" /></label>
          <label>Password baru<input name="password" type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Kosongkan jika tidak ingin mengubah" /></label>
          {pw && <ul className="pw-checks">{checks.map(([ok, text]) => <li key={text} className={ok ? 'ok' : ''}>{ok ? AdIcon.check : AdIcon.close}{text}</li>)}</ul>}
          <label>Ulangi password baru<input name="konfirmasi" type="password" autoComplete="new-password" /></label>
        </fieldset>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <div className="adm-form-actions"><button className="btn btn-dark" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan profil'}</button></div>
      </form>
    </section>
  );
}

function RoomTable({ rooms, toggle, removeRoom, edit, locName, compact }) {
  if (!rooms.length) return <p className="adm-empty">Belum ada kamar.</p>;
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>Kamar</th>{!compact && <th>Lokasi</th>}<th>Harga</th>{!compact && <th>Penghuni</th>}<th>Status</th><th className="r"><span className="sr">Aksi</span></th></tr></thead>
        <tbody>{rooms.map(r => (
          <tr key={r.id}>
            <td><div className="adm-room"><img src={r.foto} alt="" /><div><b>{r.nama_kamar}</b><small>{compact ? locName(r.lokasi_id) : r.luas}</small></div></div></td>
            {!compact && <td>{locName(r.lokasi_id)}</td>}
            <td className="num">Rp{rupiah(r.harga_sewa)}</td>
            {!compact && <td>{r.tenant || <span className="muted">–</span>}</td>}
            <td>
              <button className={`adm-switch ${r.status === 'tersedia' ? 'on' : ''}`} onClick={() => toggle(r)} title="Klik untuk mengubah status">
                <i /><span>{r.status === 'tersedia' ? 'Tersedia' : 'Terisi'}</span>
              </button>
            </td>
            <td className="r">
              <button className="adm-icon" onClick={() => edit(r)} aria-label={`Ubah ${r.nama_kamar}`}>{AdIcon.edit}</button>
              <button className="adm-icon danger" onClick={() => removeRoom(r.id)} aria-label={`Hapus ${r.nama_kamar}`}>{AdIcon.trash}</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function LocationAdmin({ locations, rooms, refresh, setMessage }) {
  const [editing, setEditing] = useState(null);
  const submit = async e => { e.preventDefault(); const b = Object.fromEntries(new FormData(e.target)); await api(editing?.id ? `/api/lokasi/${editing.id}` : '/api/lokasi', { method: editing?.id ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(b) }); setEditing(null); setMessage('Data lokasi berhasil disimpan.'); refresh(); };
  const remove = async id => { if (confirm('Hapus lokasi beserta kamarnya?')) { await api(`/api/lokasi/${id}`, { method: 'DELETE' }); refresh(); } };
  return <>
    {editing ? <section className="adm-panel">
      <div className="adm-panel-head"><h2>{editing.id ? `Ubah ${editing.nama_lokasi}` : 'Lokasi baru'}</h2></div>
      <form className="adm-form" onSubmit={submit} key={editing.id || 'new'}>
        <label>Nama lokasi<input name="nama_lokasi" defaultValue={editing.nama_lokasi||''} required /></label>
        <label>Nomor WhatsApp<input name="nomor_whatsapp" defaultValue={editing.nomor_whatsapp||''} placeholder="628123456789" required /></label>
        <label className="wide">Alamat<input name="alamat" defaultValue={editing.alamat||''} required /></label>
        <label className="wide">Info lingkungan<textarea name="info_lingkungan" rows="3" defaultValue={editing.info_lingkungan||''} /></label>
        <label className="wide">Link embed Google Maps<input name="peta_embed" defaultValue={editing.peta_embed||''} /></label>
        <div className="adm-form-actions wide"><button type="button" className="btn btn-line" onClick={() => setEditing(null)}>Batal</button><button className="btn btn-dark">Simpan</button></div>
      </form>
    </section> : <div className="adm-toolbar"><button className="btn btn-dark" onClick={() => setEditing({})}>{AdIcon.plus}Tambah lokasi</button></div>}
    <div className="adm-locs">{locations.map(l => {
      const own = rooms.filter(r => r.lokasi_id === l.id);
      return (
        <article className="adm-panel adm-loc" key={l.id}>
          <div>
            <h3>{l.nama_lokasi}</h3>
            <p>{l.alamat}</p>
            <p className="muted">WhatsApp +{l.nomor_whatsapp}</p>
          </div>
          <div className="adm-loc-foot">
            <span>{own.length} kamar · {own.filter(r => r.status === 'tersedia').length} tersedia</span>
            <span>
              <button className="adm-icon" onClick={() => setEditing(l)} aria-label={`Ubah ${l.nama_lokasi}`}>{AdIcon.edit}</button>
              <button className="adm-icon danger" onClick={() => remove(l.id)} aria-label={`Hapus ${l.nama_lokasi}`}>{AdIcon.trash}</button>
            </span>
          </div>
        </article>
      );
    })}</div>
  </>;
}

function RulesAdmin({ locations, refresh, setMessage }) {
  const [selected, setSelected] = useState(locations[0]?.id);
  const location = locations.find(l => l.id === selected) || locations[0];
  useEffect(() => { if (!selected && locations[0]) setSelected(locations[0].id); }, [locations]);
  const submit = async e => { e.preventDefault(); const peraturan = [...new FormData(e.target).getAll('rule')].filter(Boolean); await api(`/api/lokasi/${location.id}/peraturan`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ peraturan }) }); setMessage('Peraturan berhasil disimpan.'); refresh(); };
  if (!location) return null;
  return (
    <section className="adm-panel adm-narrow">
      <div className="loc-tabs adm-rule-tabs">
        {locations.map(l => <button key={l.id} className={location.id === l.id ? 'is-active' : ''} onClick={() => setSelected(l.id)}>{l.nama_lokasi}</button>)}
      </div>
      <form className="adm-rules" onSubmit={submit} key={location.id}>
        {location.peraturan.map((r, i) => <label key={i}><span>{i + 1}</span><input name="rule" defaultValue={r} /></label>)}
        <label><span>+</span><input name="rule" placeholder="Tambahkan peraturan baru" /></label>
        <p className="muted">Kosongkan baris untuk menghapus peraturan.</p>
        <div className="adm-form-actions"><button className="btn btn-dark">Simpan peraturan</button></div>
      </form>
    </section>
  );
}

function Footer() {
  const [locations, setLocations] = useState([]);
  useEffect(() => { api('/api/lokasi').then(setLocations).catch(() => {}); }, []);
  return (
    <footer className="site-footer">
      <div className="site-wrap foot-grid">
        <div className="foot-brand">
          <Link className="site-logo light" to="/"><img src="/primadona-mark.svg" alt="" /><span>Kos Primadona</span></Link>
          <p>Kos bulanan di Jember. Dikelola langsung oleh pemilik.</p>
        </div>
        {locations.map(l => (
          <div key={l.id}>
            <h4>{l.nama_lokasi}</h4>
            <p>{l.alamat}</p>
            <a href={`https://wa.me/${l.nomor_whatsapp}`} target="_blank" rel="noreferrer">WhatsApp +{l.nomor_whatsapp}</a>
          </div>
        ))}
        <div>
          <h4>Halaman</h4>
          <a href="/#kamar">Daftar kamar</a>
          <a href="/#lokasi">Lokasi</a>
          <a href="/#cara-sewa">Cara menyewa</a>
        </div>
      </div>
      <div className="site-wrap foot-bottom">© {new Date().getFullYear()} Kos Primadona, Jember</div>
    </footer>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AdminAccessShortcut />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/kamar/:id" element={<Detail />} />
      <Route path="/admin/login" element={<AdminLoginGate />} />
      <Route path="/admin/dashboard" element={<Admin />} />
    </Routes>
  </BrowserRouter>
);
