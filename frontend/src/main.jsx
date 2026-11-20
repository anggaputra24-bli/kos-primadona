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
  pengingat: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  riwayat: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 8v4l3 2" /></svg>,
  profil: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  out: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>,
  ext: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>,
  edit: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>,
  trash: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>,
  plus: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  close: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>,
};

const ADMIN_TABS = [
  ['dashboard', 'Ringkasan'],
  ['kamar', 'Kamar'],
  ['lokasi', 'Lokasi'],
  ['peraturan', 'Peraturan'],
  ['pengingat', 'Pengingat bayar'],
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
    setEditing(null); setMessage('Data kamar berhasil disimpan.'); refresh();
  };
  const openEdit = room => { setEditing(room); setTab('kamar'); window.scrollTo(0, 0); };

  const occupied = rooms.filter(r => r.status === 'sudah_dipakai');
  const income = occupied.reduce((sum, r) => sum + Number(r.harga_sewa || 0), 0);
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
              {key === 'pengingat' && reminders.some(r => r.daysLeft <= 3) && <i className="adm-dot" aria-label="Ada pembayaran mendekati jatuh tempo" />}
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
          {tab === 'kamar' && !editing && <button className="btn btn-dark" onClick={() => setEditing({})}>{AdIcon.plus}Tambah kamar</button>}
        </header>
        {message && <div className="adm-toast" role="status">{message}<button onClick={() => setMessage('')} aria-label="Tutup">{AdIcon.close}</button></div>}

        {tab === 'dashboard' && <>
          <dl className="adm-stats">
            <div><dt>Total kamar</dt><dd>{rooms.length}</dd><small>di {locations.length} lokasi</small></div>
            <div><dt>Tersedia</dt><dd className="ok">{rooms.length - occupied.length}</dd><small>siap disewakan</small></div>
            <div><dt>Terisi</dt><dd>{occupied.length}</dd><small>{rooms.length ? Math.round(occupied.length / rooms.length * 100) : 0}% tingkat hunian</small></div>
            <div><dt>Pemasukan / bulan</dt><dd>Rp{rupiah(income)}</dd><small>dari kamar terisi</small></div>
          </dl>
          <div className="adm-cols">
            <section className="adm-panel">
              <div className="adm-panel-head"><h2>Kamar</h2><button className="adm-link" onClick={() => setTab('kamar')}>Kelola semua</button></div>
              <RoomTable rooms={rooms} toggle={toggle} removeRoom={removeRoom} edit={openEdit} locName={locName} compact />
            </section>
            <section className="adm-panel">
              <div className="adm-panel-head"><h2>Jatuh tempo terdekat</h2><button className="adm-link" onClick={() => setTab('pengingat')}>Lihat semua</button></div>
              {reminders.length === 0 ? <p className="adm-empty">Belum ada penghuni dengan tanggal jatuh tempo.</p> :
                <ul className="adm-due">{reminders.slice(0, 5).map(r => <ReminderRow key={r.id} r={r} />)}</ul>}
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
              <label>Tanggal jatuh tempo<input name="due_day" type="number" min="1" max="28" defaultValue={editing.due_day||''} placeholder="1–28" /></label>
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
        {tab === 'pengingat' && <section className="adm-panel">
          {reminders.length === 0 ? <p className="adm-empty">Belum ada penghuni dengan tanggal jatuh tempo. Isi nama penghuni dan tanggal jatuh tempo di menu Kamar.</p> :
            <ul className="adm-due">{reminders.map(r => <ReminderRow key={r.id} r={r} full />)}</ul>}
        </section>}
        {tab === 'riwayat' && <section className="adm-panel">
          {history.length === 0 ? <p className="adm-empty">Belum ada perubahan status.</p> :
            <ol className="adm-history">{history.map(h => {
              const room = rooms.find(r => r.id === h.kamar_id);
              return <li key={h.id}><span className={`avail ${h.status === 'tersedia' ? 'yes' : 'no'}`}>{h.status === 'tersedia' ? 'Tersedia' : 'Terisi'}</span><b>{room?.nama_kamar || `Kamar ${h.kamar_id}`}</b><small>{new Date(h.waktu).toLocaleString('id-ID', { dateStyle:'medium', timeStyle:'short' })} · {h.admin}</small></li>;
            })}</ol>}
        </section>}
        {tab === 'profil' && <ProfileAdmin setMessage={setMessage} />}
      </main>
    </div>
  );
}

function ReminderRow({ r, full }) {
  const urgent = r.daysLeft <= 3;
  return (
    <li className={urgent ? 'is-urgent' : ''}>
      <div><b>{r.nama_kamar}</b><span>{r.tenant}{full ? ` · tanggal ${r.due_day} tiap bulan` : ''}</span></div>
      <strong>{r.daysLeft > 0 ? `${r.daysLeft} hari lagi` : r.daysLeft === 0 ? 'Hari ini' : 'Terlambat'}</strong>
    </li>
  );
}

function ProfileAdmin({setMessage}) {
  const save = async e => {
    e.preventDefault();
    const form = new FormData(e.target);
    const body = { nama_lengkap: form.get('nama_lengkap'), password: form.get('password') || undefined };
    await api('/api/auth/profil', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    e.target.reset();
    setMessage('Profil admin berhasil diperbarui.');
  };
  return (
    <section className="adm-panel adm-narrow">
      <form onSubmit={save} className="adm-form one">
        <label>Nama lengkap<input name="nama_lengkap" defaultValue="Pengelola Primadona" /></label>
        <label>Password baru<input name="password" type="password" placeholder="Kosongkan jika tidak ingin mengubah" /></label>
        <div className="adm-form-actions"><button className="btn btn-dark">Simpan profil</button></div>
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
