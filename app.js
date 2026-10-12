'use strict';
/* MyPod — Home Screen web app. Songs are stored on this device (IndexedDB). */

// ============================================================ storage
const DB = {
  db: null,
  open() {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open('mypod', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('songs', { keyPath: 'id' });
        d.createObjectStore('files');
        d.createObjectStore('art');
      };
      r.onsuccess = () => { DB.db = r.result; resolve(); };
      r.onerror = () => reject(r.error);
    });
  },
  wrap(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
  store(name, mode) { return DB.db.transaction(name, mode).objectStore(name); },
  all(name) { return DB.wrap(DB.store(name, 'readonly').getAll()); },
  get(name, key) { return DB.wrap(DB.store(name, 'readonly').get(key)); },
  put(name, value, key) { return DB.wrap(key === undefined ? DB.store(name, 'readwrite').put(value) : DB.store(name, 'readwrite').put(value, key)); },
  clear(name) { return DB.wrap(DB.store(name, 'readwrite').clear()); },
};

// ============================================================ settings
const THEMES = {
  Silver: ['#d6d9de', '#f7f7f8', '#c9ccd2', '#d7dadf', '#6b7079', '#6aa9f0', '#2f74d0'],
  Black:  ['#26272b', '#1c1d20', '#050506', '#2b2c30', '#c9cbd0', '#6aa9f0', '#2f74d0'],
  Green:  ['#74b85c', '#f4faf0', '#7db868', '#cfe6c3', '#3f6e31', '#7dcb5c', '#3e8f2a'],
  Blue:   ['#5793d3', '#f2f7fc', '#6e9dd0', '#c6daf0', '#2c5c94', '#6aa9f0', '#2f74d0'],
  Red:    ['#c23530', '#fbf1f0', '#c2504b', '#f0cfcd', '#8e2320', '#ee6b63', '#b8241e'],
  Pink:   ['#e88db6', '#fff5f9', '#d98ab0', '#f7d5e5', '#a2406f', '#f08bb8', '#c94a84'],
  Gold:   ['#dcbd83', '#fffbf2', '#cfae6e', '#efe0be', '#8a6a2e', '#e2b35c', '#b07c22'],
  Purple: ['#9170cc', '#f7f3fd', '#9f84d2', '#dcd0f2', '#56348f', '#a17fe6', '#6a3fc0'],
};
const FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const EQ = [
  ['Flat', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
  ['Bass Booster', [6, 5, 4, 2, 0, 0, 0, 0, 0, 0]],
  ['Treble Booster', [0, 0, 0, 0, 0, 1, 2, 4, 5, 6]],
  ['Vocal Booster', [-2, -2, -1, 0, 2, 4, 4, 3, 1, 0]],
  ['Indian Film', [4, 3, 2, 0, -1, 1, 3, 3, 2, 2]],
  ['Classical', [3, 2, 1, 0, -1, 0, 1, 2, 3, 3]],
  ['Devotional', [1, 1, 1, 0, 1, 2, 3, 2, 1, 0]],
  ['Pop', [-1, 0, 2, 3, 4, 3, 2, 0, -1, -1]],
  ['Rock', [5, 4, 2, -1, -2, -1, 2, 3, 4, 5]],
  ['Dance', [6, 5, 3, 0, 0, -1, 1, 3, 4, 4]],
  ['Small Speakers', [0, 0, 3, 4, 3, 1, 0, 1, 1, 0]],
  ['Late Night', [-2, -1, 0, 1, 2, 2, 1, 0, -1, -2]],
];
const MAIN_OPTIONS = [['music', 'Music'], ['cover', 'Cover Flow'], ['shuffle', 'Shuffle Songs'], ['search', 'Search'], ['extras', 'Extras'], ['add', 'Add Songs…']];

const S = Object.assign({
  theme: 'Silver', eq: 'Flat', processing: false, levelling: true, shuffle: false, repeat: 'Off',
  click: true, volume: 0.8, hidden: [],
}, JSON.parse(localStorage.getItem('mypod.settings') || '{}'));
const save = () => localStorage.setItem('mypod.settings', JSON.stringify(S));

// ============================================================ helpers
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ICON = {
  chev: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path class="f" d="M9 17.5a3 3 0 11-2-2.83V5l11-2v11.5a3 3 0 11-2-2.83V6.4l-7 1.3z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path class="f" d="M7 4.5v15l12.5-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path class="f" d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24"><path d="M3 7h3c5 0 7 10 12 10h3M3 17h3c2 0 3.3-1.6 4.5-3.5M13.5 10.5C14.7 8.6 16 7 18 7h3M18 4l3 3-3 3M18 14l3 3-3 3"/></svg>',
  repeat: '<svg viewBox="0 0 24 24"><path d="M4 11V9a3 3 0 013-3h12l-3-3M20 13v2a3 3 0 01-3 3H5l3 3"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M9 5h11v14H9l-6-7zM12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>',
  space: '<svg viewBox="0 0 24 24"><path d="M4 10v4h16v-4"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  vol: '<svg viewBox="0 0 24 24"><path class="f" d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>',
};
function toast(msg, ms = 2600) {
  const t = $('toast'); t.textContent = msg; t.style.display = 'block';
  clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.style.display = 'none'; }, ms);
}

// ============================================================ tag reading
const latin1 = new TextDecoder('latin1');
function decodeText(bytes, enc) {
  let s;
  if (enc === 1 || enc === 2) {
    let le = enc === 1, start = 0;
    if (enc === 1 && bytes.length >= 2) {
      if (bytes[0] === 0xFF && bytes[1] === 0xFE) { le = true; start = 2; }
      else if (bytes[0] === 0xFE && bytes[1] === 0xFF) { le = false; start = 2; }
    }
    s = new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(bytes.subarray(start));
  } else if (enc === 3) s = new TextDecoder('utf-8').decode(bytes);
  else s = latin1.decode(bytes);
  return s.replace(/\u0000+$/g, '').split('\u0000')[0].trim();
}
function findTerminator(bytes, from, wide) {
  for (let i = from; i < bytes.length - (wide ? 1 : 0); i += wide ? 2 : 1) {
    if (bytes[i] === 0 && (!wide || bytes[i + 1] === 0)) return i;
  }
  return bytes.length;
}
async function readID3(file) {
  const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  if (head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return null;
  const ver = head[3];
  const size = (head[6] & 0x7f) << 21 | (head[7] & 0x7f) << 14 | (head[8] & 0x7f) << 7 | (head[9] & 0x7f);
  const b = new Uint8Array(await file.slice(10, 10 + size).arrayBuffer());
  let p = 0;
  if (head[5] & 0x40 && ver >= 3) { // extended header
    const ext = ver === 4 ? ((b[0] & 0x7f) << 21 | (b[1] & 0x7f) << 14 | (b[2] & 0x7f) << 7 | (b[3] & 0x7f)) : ((b[0] << 24 | b[1] << 16 | b[2] << 8 | b[3]) + 4);
    p = ext;
  }
  const tags = {};
  const map = { TIT2: 'title', TT2: 'title', TPE1: 'artist', TP1: 'artist', TALB: 'album', TAL: 'album', TPE2: 'albumArtist', TP2: 'albumArtist',
    TCON: 'genre', TCO: 'genre', TCOM: 'composer', TCM: 'composer', TRCK: 'track', TRK: 'track', TPOS: 'disc', TPA: 'disc' };
  while (p < b.length) {
    let id, fsize, hdr;
    if (ver === 2) {
      if (p + 6 > b.length) break;
      id = latin1.decode(b.subarray(p, p + 3)); fsize = b[p + 3] << 16 | b[p + 4] << 8 | b[p + 5]; hdr = 6;
    } else {
      if (p + 10 > b.length) break;
      id = latin1.decode(b.subarray(p, p + 4));
      fsize = ver === 4 ? ((b[p + 4] & 0x7f) << 21 | (b[p + 5] & 0x7f) << 14 | (b[p + 6] & 0x7f) << 7 | (b[p + 7] & 0x7f))
                        : (b[p + 4] << 24 | b[p + 5] << 16 | b[p + 6] << 8 | b[p + 7]) >>> 0;
      hdr = 10;
    }
    if (!/^[A-Z0-9]{3,4}$/.test(id) || fsize <= 0) break;
    const data = b.subarray(p + hdr, Math.min(b.length, p + hdr + fsize));
    if (map[id] && !tags[map[id]]) tags[map[id]] = decodeText(data.subarray(1), data[0]);
    else if ((id === 'APIC' || id === 'PIC') && !tags.picture) {
      const enc = data[0]; let q;
      if (id === 'APIC') { q = findTerminator(data, 1, false) + 1; q += 1; } else q = 5;
      const wide = enc === 1 || enc === 2;
      q = findTerminator(data, q, wide) + (wide ? 2 : 1);
      if (q < data.length) tags.picture = new Blob([data.slice(q)]);
    }
    p += hdr + fsize;
  }
  return tags;
}
async function readMP4(file) {
  if (file.size > 400 * 1024 * 1024) return null;
  const buf = new Uint8Array(await file.arrayBuffer());
  const dv = new DataView(buf.buffer);
  const atoms = (start, end) => {
    const out = [];
    let p = start;
    while (p + 8 <= end) {
      let size = dv.getUint32(p), hdr = 8;
      const type = latin1.decode(buf.subarray(p + 4, p + 8));
      if (size === 1) { size = Number(dv.getBigUint64(p + 8)); hdr = 16; }
      else if (size === 0) size = end - p;
      if (size < hdr || p + size > end) break;
      out.push({ type, start: p + hdr, end: p + size });
      p += size;
    }
    return out;
  };
  const find = (list, type) => list.find(a => a.type === type);
  const moov = find(atoms(0, buf.length), 'moov'); if (!moov) return null;
  const udta = find(atoms(moov.start, moov.end), 'udta'); if (!udta) return null;
  const meta = find(atoms(udta.start, udta.end), 'meta'); if (!meta) return null;
  const ilst = find(atoms(meta.start + 4, meta.end), 'ilst'); if (!ilst) return null;
  const tags = {};
  const map = { '©nam': 'title', '©ART': 'artist', '©alb': 'album', 'aART': 'albumArtist', '©gen': 'genre', '©wrt': 'composer' };
  for (const item of atoms(ilst.start, ilst.end)) {
    const data = find(atoms(item.start, item.end), 'data'); if (!data) continue;
    const v = buf.subarray(data.start + 8, data.end);
    if (map[item.type]) tags[map[item.type]] = new TextDecoder('utf-8').decode(v).trim();
    else if (item.type === 'trkn' && v.length >= 4) tags.track = String(v[2] << 8 | v[3]);
    else if (item.type === 'disk' && v.length >= 4) tags.disc = String(v[2] << 8 | v[3]);
    else if (item.type === 'covr') tags.picture = new Blob([v.slice()]);
  }
  return tags;
}
const ID3_GENRES = ['Blues', 'Classic Rock', 'Country', 'Dance', 'Disco', 'Funk', 'Grunge', 'Hip-Hop', 'Jazz', 'Metal', 'New Age', 'Oldies', 'Other', 'Pop', 'R&B', 'Rap', 'Reggae', 'Rock', 'Techno', 'Industrial', 'Alternative', 'Ska', 'Death Metal', 'Pranks', 'Soundtrack', 'Euro-Techno', 'Ambient', 'Trip-Hop', 'Vocal', 'Jazz+Funk', 'Fusion', 'Trance', 'Classical', 'Instrumental', 'Acid', 'House', 'Game', 'Sound Clip', 'Gospel', 'Noise'];
function cleanGenre(g) {
  if (!g) return '';
  const m = g.match(/^\((\d+)\)(.*)$/);
  if (m) return m[2].trim() || ID3_GENRES[+m[1]] || '';
  if (/^\d+$/.test(g)) return ID3_GENRES[+g] || '';
  return g;
}
async function shrinkImage(blob) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 300 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(res, 'image/jpeg', 0.85));
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}
function probeDuration(file) {
  return new Promise(resolve => {
    const a = new Audio(), url = URL.createObjectURL(file);
    const done = d => { URL.revokeObjectURL(url); a.removeAttribute('src'); resolve(isFinite(d) ? d : 0); };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done(0);
    setTimeout(() => done(a.duration), 8000);
    a.src = url;
  });
}
/** Loudness in dBFS from a middle slice of an MP3 (other formats skip levelling). */
async function measureLoudness(file) {
  if (!/\.mp3$/i.test(file.name) && file.type !== 'audio/mpeg') return null;
  try {
    const ctx = Audio2.ctx || new (window.AudioContext || window.webkitAudioContext)();
    Audio2.ctx = ctx;
    const start = Math.floor(file.size * 0.4), len = Math.min(700 * 1024, file.size - start);
    const bytes = await file.slice(start, start + len).arrayBuffer();
    const audio = await new Promise((res, rej) => ctx.decodeAudioData(bytes, res, rej));
    let sum = 0, n = 0;
    for (let c = 0; c < audio.numberOfChannels; c++) {
      const d = audio.getChannelData(c);
      for (let i = 0; i < d.length; i += 4) { sum += d[i] * d[i]; n++; }
    }
    return n && sum ? 20 * Math.log10(Math.sqrt(sum / n)) : null;
  } catch { return null; }
}
const Audio2 = { ctx: null };

async function importFiles(files, playlist) {
  const list = [...files].filter(f => /^audio\//.test(f.type) || /\.(mp3|m4a|aac|wav|flac|aiff?|m4b)$/i.test(f.name));
  if (!list.length) { toast('No audio files were chosen.'); return; }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  let added = 0;
  for (const file of list) {
    toast(`Adding ${added + 1} of ${list.length}…`, 60000);
    try {
      let tags = null;
      try { tags = /\.(m4a|m4b|aac|mp4)$/i.test(file.name) || /mp4|m4a/.test(file.type) ? await readMP4(file) : await readID3(file); } catch {}
      tags = tags || {};
      const stem = file.name.replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
      let title = tags.title, artist = tags.artist;
      if (!title) {
        const parts = stem.split(' - ');
        if (parts.length >= 2 && !artist) { artist = parts[0].trim(); title = parts.slice(1).join(' - ').trim(); } else title = stem;
      }
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const art = tags.picture ? await shrinkImage(tags.picture) : null;
      const song = {
        id, title: title || stem, artist: artist || 'Unknown Artist', album: tags.album || 'Unknown Album',
        albumArtist: tags.albumArtist || artist || 'Unknown Artist', genre: cleanGenre(tags.genre) || 'Unknown Genre',
        composer: tags.composer || 'Unknown Composer', track: parseInt(tags.track) || 0, disc: parseInt(tags.disc) || 0,
        duration: await probeDuration(file), loudness: await measureLoudness(file), hasArt: !!art,
        playlist: playlist || '', name: file.name, added: Date.now(),
      };
      // Store a full copy so the song stays playable after Files clears its temporary copy.
      await DB.put('files', new Blob([await file.arrayBuffer()], { type: file.type || 'audio/mpeg' }), id);
      if (art) await DB.put('art', art, id);
      await DB.put('songs', song);
      added++;
    } catch (e) {
      console.error('Import failed', file.name, e);
    }
  }
  await Lib.load();
  toast(added === list.length ? `Added ${added} song${added === 1 ? '' : 's'}.` : `Added ${added} of ${list.length}. Some files couldn't be read.`);
  render();
}

// ============================================================ library
const UNKNOWN = { artist: 'Unknown Artist', album: 'Unknown Album', genre: 'Unknown Genre', composer: 'Unknown Composer' };
const Lib = {
  songs: [], albums: [], artUrls: new Map(),
  async load() {
    const all = await DB.all('songs');
    this.songs = all.sort((a, b) => cmp(a.title, b.title));
    const groups = new Map();
    for (const s of this.songs) {
      const key = s.album + '\u001f' + s.albumArtist;
      if (!groups.has(key)) groups.set(key, { key, title: s.album, artist: s.albumArtist, songs: [] });
      groups.get(key).songs.push(s);
    }
    this.albums = [...groups.values()].sort((a, b) => lastUnknown(a.title, b.title, UNKNOWN.album));
    for (const a of this.albums) a.songs.sort((x, y) => (x.disc - y.disc) || (x.track - y.track) || cmp(x.title, y.title));
  },
  names(field) { return [...new Set(this.songs.map(s => s[field]))].sort((a, b) => lastUnknown(a, b, UNKNOWN[field])); },
  playlists() { return [...new Set(this.songs.map(s => s.playlist).filter(Boolean))].sort(cmp); },
  by(field, value) { return this.songs.filter(s => s[field] === value); },
  album(key) { return this.albums.find(a => a.key === key); },
  async artUrl(song) {
    if (!song || !song.hasArt) return null;
    if (this.artUrls.has(song.id)) return this.artUrls.get(song.id);
    const blob = await DB.get('art', song.id);
    const url = blob ? URL.createObjectURL(blob) : null;
    this.artUrls.set(song.id, url);
    return url;
  },
};
function lastUnknown(a, b, unknown) { if (a === unknown) return 1; if (b === unknown) return -1; return cmp(a, b); }

// ============================================================ player
const Player = {
  el: null, url: null, queue: [], original: [], index: 0, ctx: null, gain: null, filters: [],
  get current() { return this.queue[this.index] || null; },
  get playing() { return this.el && !this.el.paused; },

  /** One <audio> element. With Sound Processing on, it is routed through Web Audio for EQ, levelling and wheel volume. */
  makeElement() {
    if (this.el) { this.el.pause(); this.el.removeAttribute('src'); this.el.load(); }
    const a = new Audio();
    a.preload = 'auto';
    a.addEventListener('ended', () => this.finished());
    a.addEventListener('play', () => { this.updateSession(); render(); });
    a.addEventListener('pause', () => { this.updateSession(); render(); });
    a.addEventListener('timeupdate', () => { if (route().r === 'np') renderNowPlayingBar(); this.updatePosition(); });
    this.el = a; this.ctx = null; this.gain = null; this.filters = [];
    if (S.processing) {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(a);
      let node = src;
      this.filters = FREQS.map((f, i) => {
        const b = ctx.createBiquadFilter();
        b.type = i === 0 ? 'lowshelf' : i === FREQS.length - 1 ? 'highshelf' : 'peaking';
        b.frequency.value = f; b.Q.value = 1.4;
        node.connect(b); node = b; return b;
      });
      this.gain = ctx.createGain();
      node.connect(this.gain); this.gain.connect(ctx.destination);
      this.ctx = ctx;
      this.applyEQ();
    }
  },
  applyEQ() {
    if (!this.ctx) return;
    const gains = (EQ.find(e => e[0] === S.eq) || EQ[0])[1];
    this.filters.forEach((f, i) => { f.gain.value = gains[i]; });
    const peak = Math.max(0, ...gains);
    let db = -peak * 0.7;
    const s = this.current;
    if (S.levelling && s && s.loudness != null) db += clamp(-14 - s.loudness, -8, 6);
    this.gain.gain.value = S.volume * Math.pow(10, db / 20);
  },
  start(list, i) {
    this.original = list.slice();
    if (S.shuffle) {
      const rest = list.slice(); const first = rest.splice(i, 1)[0];
      shuffleArray(rest); this.queue = [first, ...rest]; this.index = 0;
    } else { this.queue = list.slice(); this.index = i; }
    return this.load(this.index, true);
  },
  async load(i, autoplay) {
    if (!this.queue[i]) return;
    this.index = i;
    const song = this.queue[i];
    const blob = await DB.get('files', song.id);
    if (!blob) { toast('That song file is missing.'); return; }
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = URL.createObjectURL(blob);
    this.el.src = this.url;
    this.applyEQ();
    this.updateSession();
    if (autoplay) await this.play(); else render();
  },
  async play() {
    if (!this.current) return;
    try {
      if (this.ctx && this.ctx.state !== 'running') await this.ctx.resume();
      await this.el.play();
    } catch (e) { toast('Tap Play to start.'); }
  },
  pause() { if (this.el) this.el.pause(); },
  next() {
    if (!this.queue.length) return;
    const was = this.playing;
    if (this.index + 1 < this.queue.length) this.load(this.index + 1, was);
    else if (S.repeat === 'All') this.load(0, was);
  },
  previous() {
    if (!this.queue.length) return;
    if (this.el.currentTime > 3 || this.index === 0) { this.el.currentTime = 0; return; }
    this.load(this.index - 1, this.playing);
  },
  finished() {
    if (S.repeat === 'One') { this.el.currentTime = 0; this.play(); }
    else if (this.index + 1 < this.queue.length) this.load(this.index + 1, true);
    else if (S.repeat === 'All') this.load(0, true);
    else { this.el.currentTime = 0; render(); }
  },
  seek(t) { if (this.current && isFinite(this.el.duration)) this.el.currentTime = clamp(t, 0, this.el.duration - 0.5); },
  setShuffle(on) {
    S.shuffle = on; save();
    const cur = this.current; if (!cur) return;
    if (on) { const rest = this.queue.filter((_, i) => i !== this.index); shuffleArray(rest); this.queue = [cur, ...rest]; this.index = 0; }
    else if (this.original.length) { this.queue = this.original.slice(); this.index = Math.max(0, this.queue.findIndex(s => s.id === cur.id)); }
  },
  async updateSession() {
    if (!('mediaSession' in navigator)) return;
    const s = this.current;
    if (!s) return;
    const art = await Lib.artUrl(s);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: s.title, artist: s.artist, album: s.album,
      artwork: art ? [{ src: art, sizes: '300x300', type: 'image/jpeg' }] : [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused';
  },
  updatePosition() {
    const ms = navigator.mediaSession;
    if (!ms || !ms.setPositionState || !isFinite(this.el.duration)) return;
    try { ms.setPositionState({ duration: this.el.duration, position: Math.min(this.el.currentTime, this.el.duration), playbackRate: 1 }); } catch {}
  },
};
function shuffleArray(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } }
if ('mediaSession' in navigator) {
  const ms = navigator.mediaSession;
  const set = (action, fn) => { try { ms.setActionHandler(action, fn); } catch {} };
  set('play', () => Player.play());
  set('pause', () => Player.pause());
  set('previoustrack', () => Player.previous());
  set('nexttrack', () => Player.next());
  set('seekto', d => Player.seek(d.seekTime));
}

// ============================================================ click sound
let clickCtx = null;
function click() {
  if (!S.click) return;
  try {
    if (!clickCtx) clickCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (clickCtx.state !== 'running') clickCtx.resume();
    const len = Math.floor(clickCtx.sampleRate * 0.004);
    const buf = clickCtx.createBuffer(1, len, clickCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) * 0.5;
    const src = clickCtx.createBufferSource(); src.buffer = buf; src.connect(clickCtx.destination); src.start();
  } catch {}
}

// ============================================================ navigation
const stack = [{ r: 'main', sel: 0 }];
const route = () => stack[stack.length - 1];
let npMode = 'vol', volFlash = 0, coverIndex = 0, query = '', alarmTimer = null;
const sw = { run: false, start: 0, acc: 0, laps: [] };
const swTime = () => sw.acc + (sw.run ? Date.now() - sw.start : 0);
const swFmt = ms => { const t = Math.floor(ms / 100), s = Math.floor(t / 10); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + '.' + (t % 10); };
const KEYS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').concat(['Space', 'Delete', 'Show Results']);
const matches = () => { const q = query.trim().toLowerCase(); return q ? Lib.songs.filter(s => (s.title + ' ' + s.artist + ' ' + s.album).toLowerCase().includes(q)) : []; };

const TITLES = { main: '', music: 'Music', playlists: 'Playlists', artists: 'Artists', albums: 'Albums', songs: 'Songs', genres: 'Genres', composers: 'Composers',
  np: 'Now Playing', cover: 'Cover Flow', search: 'Search', results: 'Results', extras: 'Extras', clock: 'Clock', sw: 'Stopwatch',
  settings: 'Settings', mainmenu: 'Main Menu', themes: 'Theme', eq: 'Equalizer', add: 'Add Songs', about: 'About', deleteall: 'Delete All Songs' };
function titleFor(r) {
  if (r.arg !== undefined) return r.r === 'album' ? (Lib.album(r.arg) || {}).title || 'Album' : r.arg;
  return TITLES[r.r] || '';
}
const item = (t, a, o = {}) => Object.assign({ t, a }, o);
const songItems = (list, artist) => list.length ? list.map((s, i) => item(s.title, ['play', list, i], { d: artist ? s.artist : '' })) : [item('No songs — choose Add Songs…', null)];
const nameItems = (names, r, empty) => names.length ? names.map(n => item(n, ['go', r, n], { chev: 1 })) : [item(empty || 'No songs — choose Add Songs…', null)];

function items(r) {
  switch (r.r) {
    case 'main': {
      const L = [];
      for (const [k, n] of MAIN_OPTIONS) {
        if (S.hidden.includes(k)) continue;
        if (k === 'shuffle' && Player.current) L.push(item('Now Playing', ['go', 'np'], { chev: 1 }));
        if (k === 'music') L.push(item(n, ['go', 'music'], { chev: 1 }));
        if (k === 'cover') L.push(item(n, ['go', 'cover'], { chev: 1 }));
        if (k === 'shuffle') L.push(item(n, ['shuffleAll']));
        if (k === 'search') L.push(item(n, ['go', 'search'], { chev: 1 }));
        if (k === 'extras') L.push(item(n, ['go', 'extras'], { chev: 1 }));
        if (k === 'add') L.push(item(n, ['go', 'add'], { chev: 1 }));
      }
      if (S.hidden.includes('shuffle') && Player.current) L.unshift(item('Now Playing', ['go', 'np'], { chev: 1 }));
      L.push(item('Settings', ['go', 'settings'], { chev: 1 }));
      return L;
    }
    case 'music': return [['Playlists', 'playlists'], ['Artists', 'artists'], ['Albums', 'albums'], ['Songs', 'songs'], ['Genres', 'genres'], ['Composers', 'composers']].map(([t, g]) => item(t, ['go', g], { chev: 1 }));
    case 'playlists': return nameItems(Lib.playlists(), 'playlist', 'No playlists — see About');
    case 'playlist': return songItems(Lib.by('playlist', r.arg).sort((a, b) => cmp(a.name, b.name)), true);
    case 'artists': return nameItems(Lib.names('artist'), 'artist');
    case 'artist': {
      const albums = Lib.albums.filter(a => a.songs.some(s => s.artist === r.arg));
      return [item('All Songs', ['go', 'artistSongs', r.arg], { chev: 1 }), ...albums.map(a => item(a.title, ['go', 'album', a.key], { chev: 1 }))];
    }
    case 'artistSongs': return songItems(Lib.by('artist', r.arg));
    case 'albums': return Lib.albums.length ? Lib.albums.map(a => item(a.title, ['go', 'album', a.key], { chev: 1, d: a.artist })) : [item('No songs — choose Add Songs…', null)];
    case 'album': return songItems((Lib.album(r.arg) || { songs: [] }).songs);
    case 'songs': return songItems(Lib.songs, true);
    case 'genres': return nameItems(Lib.names('genre'), 'genre');
    case 'genre': return songItems(Lib.by('genre', r.arg), true);
    case 'composers': return nameItems(Lib.names('composer'), 'composer');
    case 'composer': return songItems(Lib.by('composer', r.arg), true);
    case 'results': { const m = matches(); return m.length ? songItems(m, true) : [item('No matches', null)]; }
    case 'extras': return [item('Clock', ['go', 'clock'], { chev: 1 }), item('Stopwatch', ['go', 'sw'], { chev: 1 })];
    case 'sw': return [item(sw.run ? 'Stop' : 'Start', ['sw', 'toggle']), item('Lap', ['sw', 'lap']), item('Reset', ['sw', 'reset'])];
    case 'add': return [item('Choose Songs…', ['pick', '']), item('Choose Songs into a Playlist…', ['pickPlaylist'])];
    case 'settings': return [
      item('Main Menu', ['go', 'mainmenu'], { chev: 1 }),
      item('Theme', ['go', 'themes'], { chev: 1, d: S.theme }),
      item('Sound Processing', ['toggle', 'processing'], { d: S.processing ? 'On' : 'Off' }),
      item('Equalizer', ['go', 'eq'], { chev: 1, d: S.processing ? S.eq : 'Off' }),
      item('Volume Levelling', ['toggle', 'levelling'], { d: S.levelling ? 'On' : 'Off' }),
      item('Shuffle', ['shuffleToggle'], { d: S.shuffle ? 'On' : 'Off' }),
      item('Repeat', ['repeat'], { d: S.repeat }),
      item('Clicker Sound', ['toggle', 'click'], { d: S.click ? 'On' : 'Off' }),
      item('Delete All Songs', ['go', 'deleteall'], { chev: 1 }),
      item('About', ['go', 'about'], { chev: 1 }),
    ];
    case 'mainmenu': return MAIN_OPTIONS.map(([k, n]) => item(n, ['hide', k], { d: S.hidden.includes(k) ? 'Off' : 'On' }));
    case 'themes': return Object.keys(THEMES).map(k => item(k, ['theme', k], { check: k === S.theme }));
    case 'eq': return EQ.map(([n]) => item(n, ['eq', n], { check: n === S.eq }));
    case 'deleteall': return [item('Cancel', ['back']), item(`Delete all ${Lib.songs.length} songs`, ['deleteAll'])];
    default: return [];
  }
}

function push(r, arg) {
  if (r === 'np') npMode = 'vol';
  if (r === 'search') query = '';
  if (r === 'cover') coverIndex = clamp(coverIndex, 0, Math.max(0, Lib.albums.length - 1));
  stack.push({ r, arg, sel: 0 });
  render();
}
function back() { click(); if (stack.length > 1) { stack.pop(); render(); } }

function perform(a) {
  if (!a) return;
  const [kind, x, y] = a;
  switch (kind) {
    case 'go': push(x, y); return;
    case 'back': stack.pop(); break;
    case 'play': Player.start(x, y); push('np'); return;
    case 'shuffleAll':
      if (!Lib.songs.length) { toast('Add some songs first.'); return; }
      Player.setShuffle(true); Player.start(Lib.songs, Math.floor(Math.random() * Lib.songs.length)); push('np'); return;
    case 'pick': pickPlaylist = x; $('picker').value = ''; $('picker').click(); return;
    case 'pickPlaylist': {
      const name = (prompt('Playlist name') || '').trim();
      if (!name) return;
      pickPlaylist = name; $('picker').value = ''; $('picker').click(); return;
    }
    case 'toggle':
      S[x] = !S[x]; save();
      if (x === 'processing') { const cur = Player.current, t = Player.el.currentTime, was = Player.playing; Player.makeElement(); if (cur) Player.load(Player.index, false).then(() => { Player.el.currentTime = t; if (was) Player.play(); }); toast(S.processing ? 'Equalizer and wheel volume on. Background playback is less reliable.' : 'Off: best for playing with the screen locked. Use the side buttons for volume.', 4000); }
      if (x === 'levelling') Player.applyEQ();
      break;
    case 'shuffleToggle': Player.setShuffle(!S.shuffle); break;
    case 'repeat': S.repeat = { Off: 'All', All: 'One', One: 'Off' }[S.repeat]; save(); break;
    case 'hide': S.hidden = S.hidden.includes(x) ? S.hidden.filter(k => k !== x) : S.hidden.concat(x); save(); break;
    case 'theme': S.theme = x; save(); applyTheme(); break;
    case 'eq':
      if (!S.processing) { toast('Turn on Settings › Sound Processing to use the equalizer.', 3500); return; }
      S.eq = x; save(); Player.applyEQ(); break;
    case 'sw':
      if (x === 'toggle') { if (sw.run) { sw.acc = swTime(); sw.run = false; } else { sw.start = Date.now(); sw.run = true; } }
      if (x === 'lap' && swTime() > 0) sw.laps.push(swTime());
      if (x === 'reset') { sw.run = false; sw.acc = 0; sw.laps = []; }
      break;
    case 'deleteAll':
      Player.pause(); Player.queue = []; Player.index = 0;
      Promise.all(['songs', 'files', 'art'].map(n => DB.clear(n))).then(() => Lib.load()).then(() => { stack.length = 1; toast('All songs deleted.'); render(); });
      return;
  }
  render();
}
let pickPlaylist = '';
$('picker').addEventListener('change', e => { const files = e.target.files; if (files && files.length) importFiles(files, pickPlaylist); });

function select() {
  click();
  const r = route();
  if (r.r === 'np') { npMode = npMode === 'vol' ? 'seek' : 'vol'; if (npMode === 'vol' && !S.processing) toast('Use the side buttons for volume, or turn on Settings › Sound Processing.', 3000); render(); return; }
  if (r.r === 'cover') { const a = Lib.albums[coverIndex]; if (a) push('album', a.key); return; }
  if (r.r === 'search') {
    const k = KEYS[r.sel];
    if (k === 'Space') { if (query && !query.endsWith(' ')) query += ' '; }
    else if (k === 'Delete') query = query.slice(0, -1);
    else if (k === 'Show Results') { push('results'); return; }
    else query += (!query || query.endsWith(' ')) ? k : k.toLowerCase();
    render(); return;
  }
  if (r.r === 'clock' || r.r === 'about') return;
  const list = items(r);
  if (list[r.sel]) perform(list[r.sel].a);
}

let ticks = [], letterTimer = null;
function rotate(n) {
  const r = route();
  if (r.r === 'np') {
    if (!Player.current) return;
    if (npMode === 'vol') {
      if (!S.processing) { volFlash = Date.now(); renderNowPlayingBar(); return; }
      S.volume = clamp(S.volume + n * 0.03, 0, 1); save(); Player.applyEQ(); volFlash = Date.now();
    } else Player.seek(Player.el.currentTime + n * 3);
    click(); renderNowPlayingBar(); return;
  }
  if (r.r === 'cover') { const v = clamp(coverIndex + n, 0, Math.max(0, Lib.albums.length - 1)); if (v !== coverIndex) { coverIndex = v; click(); render(); } return; }
  if (r.r === 'clock' || r.r === 'about') return;
  const count = r.r === 'search' ? KEYS.length : items(r).length;
  const now = Date.now();
  ticks = ticks.filter(t => now - t < 350); ticks.push(now);
  const fast = r.r !== 'search' && ticks.length >= 4 && count > 12;
  const v = clamp(r.sel + n * (fast ? 2 : 1), 0, count - 1);
  if (v === r.sel) return;
  r.sel = v; click(); render();
  if (fast) {
    const ch = (items(r)[v].t[0] || '#').toUpperCase();
    const el = $('letter'); el.textContent = /[A-Z]/.test(ch) ? ch : '#'; el.style.display = 'flex';
    clearTimeout(letterTimer); letterTimer = setTimeout(() => { el.style.display = 'none'; }, 700);
  }
}

// ============================================================ rendering
function applyTheme() {
  const t = THEMES[S.theme] || THEMES.Silver, st = $('device').style;
  ['--body', '--wheel', '--edge', '--center', '--icon', '--accent1', '--accent2'].forEach((v, i) => st.setProperty(v, t[i]));
  document.querySelector('meta[name=theme-color]').content = t[0];
}

function renderBar() {
  const r = route();
  $('title').textContent = titleFor(r);
  $('back').classList.toggle('off', stack.length < 2);
  $('state').innerHTML = Player.current ? (Player.playing ? ICON.play : ICON.pause) : '';
  const d = new Date();
  $('clock').textContent = (d.getHours() % 12 || 12) + ':' + String(d.getMinutes()).padStart(2, '0');
}

function listHTML(list, sel) {
  const box = $('content');
  const rows = Math.max(3, Math.floor(box.clientHeight / 34));
  const top = clamp(sel - Math.floor(rows / 2), 0, Math.max(0, list.length - rows));
  let h = list.slice(top, top + rows).map((x, k) => {
    const i = k + top;
    return `<div class="row${i === sel ? ' on' : ''}" data-i="${i}"><span class="t">${esc(x.t)}</span>${x.d ? `<span class="d">${esc(x.d)}</span>` : ''}${x.check ? ICON.check : ''}${x.chev ? ICON.chev : ''}</div>`;
  }).join('');
  if (list.length > rows) {
    const H = box.clientHeight, th = Math.max(16, H * rows / list.length);
    h += `<div class="scroll" style="height:${th}px;top:${(H - th) * top / (list.length - rows)}px"></div>`;
  }
  return h;
}

async function artHTML(song, size) {
  const url = await Lib.artUrl(song);
  return `<div class="art" style="width:${size}px;height:${size}px">${url ? `<img src="${url}" alt="">` : ICON.note}</div>`;
}

let renderToken = 0;
async function render() {
  const token = ++renderToken;
  renderBar();
  const r = route(), box = $('content');
  const W = box.clientWidth, H = box.clientHeight;
  let html = '';
  switch (r.r) {
    case 'np': {
      const s = Player.current;
      if (!s) { html = '<div class="big"><div class="s">Nothing playing</div></div>'; break; }
      const size = Math.min(H * 0.55, W * 0.42);
      html = `<div class="np"><div class="np-top">${await artHTML(s, size)}<div class="np-info"><div class="t1">${esc(s.title)}</div><div class="t2">${esc(s.artist)}</div><div class="t3">${esc(s.album)}</div><div class="t4">${Player.index + 1} of ${Player.queue.length}</div><div class="modes">${S.shuffle ? ICON.shuffle : ''}${S.repeat !== 'Off' ? ICON.repeat + (S.repeat === 'One' ? '<b style="font-size:11px">1</b>' : '') : ''}</div></div></div><div style="flex:1"></div><div id="npbar"></div></div>`;
      break;
    }
    case 'cover': {
      if (!Lib.albums.length) { html = '<div class="cover"><div class="big"><div class="s" style="color:#aaa">No albums yet</div></div></div>'; break; }
      const size = Math.min(H * 0.62, W * 0.42), parts = [];
      for (let i = Math.max(0, coverIndex - 4); i <= Math.min(Lib.albums.length - 1, coverIndex + 4); i++) {
        const d = i - coverIndex, side = Math.sign(d);
        const x = d === 0 ? 0 : side * (size * 0.62 + (Math.abs(d) - 1) * size * 0.26);
        parts.push(`<div class="c" data-c="${i}" style="top:${H * 0.42 - size / 2}px;margin-left:${-size / 2}px;z-index:${10 - Math.abs(d)};transform:translateX(${x}px) perspective(${size * 3}px) rotateY(${-side * 58}deg) scale(${d ? 0.86 : 1})">${await artHTML(Lib.albums[i].songs.find(s => s.hasArt) || Lib.albums[i].songs[0], size)}</div>`);
      }
      const a = Lib.albums[coverIndex];
      html = `<div class="cover">${parts.join('')}<div class="cap"><div style="font-weight:700">${esc(a.title)}</div><div style="opacity:.75;font-size:13px">${esc(a.artist)}</div></div></div>`;
      break;
    }
    case 'clock': {
      const d = new Date();
      html = `<div class="big"><div class="h">${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}<span style="font-size:18px;margin-left:4px">${d.getHours() < 12 ? 'AM' : 'PM'}</span></div><div class="s">${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</div></div>`;
      break;
    }
    case 'sw': {
      const laps = sw.laps.slice(-4).map((l, k) => `<span>Lap ${sw.laps.length - Math.min(4, sw.laps.length) + k + 1}: ${swFmt(l)}</span>`).join('');
      html = `<div style="text-align:center;font-size:40px;font-weight:600;padding:8px 0 4px;font-variant-numeric:tabular-nums" id="swt">${swFmt(swTime())}</div>${listHTML(items(r), r.sel).replace(/<div class="scroll".*$/, '')}<div style="display:flex;flex-wrap:wrap;gap:2px 14px;padding:4px 10px;font-size:12px;color:#777">${laps}</div>`;
      break;
    }
    case 'search': {
      const m = matches();
      const keys = [-3, -2, -1, 0, 1, 2, 3].map(o => {
        const k = KEYS[r.sel + o];
        if (k === undefined) return '<span></span>';
        const lab = k === 'Space' ? ICON.space : k === 'Delete' ? ICON.del : k === 'Show Results' ? ICON.list : k;
        return `<span class="${o ? '' : 'on'}">${lab}</span>`;
      }).join('');
      const k = KEYS[r.sel];
      html = `<div class="search"><div class="qbox">${ICON.search}${query ? esc(query) : '<span class="ph">Turn the wheel to pick letters</span>'}<span class="caret"></span></div><div class="keys">${keys}</div><div class="hint">${k.length > 1 ? k : ''}</div>${query ? `<div class="matches">${m.length} match${m.length === 1 ? '' : 'es'}</div>` + m.slice(0, 2).map(s => `<div class="match">${esc(s.title)} <span>· ${esc(s.artist)}</span></div>`).join('') : ''}</div>`;
      break;
    }
    case 'about':
      html = `<div class="about"><b style="font-size:18px">MyPod</b><p>${Lib.songs.length} songs · ${Lib.albums.length} albums · ${Lib.names('artist').length} artists</p>
        <h3>Adding songs</h3><p>Main menu › Add Songs… and pick songs from Files or iCloud Drive. Choose “into a Playlist” to group them.</p>
        <h3>Wheel</h3><p>Slide around the ring to scroll, press the centre to select. On Now Playing the centre switches between volume and seeking.</p>
        <h3>Background playback</h3><p>Keep Sound Processing off for the most reliable playing with the screen locked.</p></div>`;
      break;
    default:
      html = listHTML(items(r), r.sel);
  }
  if (token !== renderToken) return; // a newer render started while artwork loaded
  box.innerHTML = html;
  if (r.r === 'np') renderNowPlayingBar();
}

function renderNowPlayingBar() {
  const el = $('npbar'); if (!el) return;
  const a = Player.el, dur = isFinite(a.duration) ? a.duration : (Player.current || {}).duration || 0;
  const showVol = npMode === 'vol' && Date.now() - volFlash < 1500;
  if (showVol) {
    el.innerHTML = S.processing
      ? `<div style="display:flex;align-items:center;gap:8px;font-size:15px">${ICON.vol}<div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${S.volume * 100}%"></div></div></div><div class="times" style="justify-content:center">Volume ${Math.round(S.volume * 100)}%</div>`
      : `<div class="times" style="justify-content:center;font-size:13px">Use the iPhone side buttons for volume</div>`;
    return;
  }
  const f = dur ? a.currentTime / dur : 0, seek = npMode === 'seek';
  el.innerHTML = `<div class="seekzone" id="seekzone"><div class="bar-track${seek ? ' big' : ''}"><div class="bar-fill" style="width:${f * 100}%"></div>${seek ? `<div class="knob" style="left:${f * 100}%"></div>` : ''}</div></div><div class="times"><span>${fmt(a.currentTime)}</span><b>${seek ? 'Seeking' : ''}</b><span>-${fmt(dur - a.currentTime)}</span></div>`;
}

// ============================================================ input
const content = $('content');
content.addEventListener('click', e => {
  const row = e.target.closest('.row');
  if (row) { route().sel = +row.dataset.i; select(); return; }
  const c = e.target.closest('[data-c]');
  if (c) { const i = +c.dataset.c; if (i === coverIndex) select(); else { coverIndex = i; click(); render(); } }
});
// Drag on the Now Playing progress bar to seek; swipe right on menus to go back.
let swipe = null;
content.addEventListener('pointerdown', e => {
  if (e.target.closest('#seekzone')) { swipe = { seek: true }; seekTo(e); return; }
  swipe = { x: e.clientX, y: e.clientY };
});
content.addEventListener('pointermove', e => { if (swipe && swipe.seek) seekTo(e); });
window.addEventListener('pointerup', e => {
  if (!swipe) return;
  const s = swipe; swipe = null;
  if (s.seek) return;
  const dx = e.clientX - s.x, dy = e.clientY - s.y, r = route().r;
  if (r === 'cover' && Math.abs(dx) > 30) { coverIndex = clamp(coverIndex - Math.round(dx / 60), 0, Math.max(0, Lib.albums.length - 1)); click(); render(); return; }
  if (dx > 70 && Math.abs(dy) < 50 && r !== 'np' && r !== 'cover') back();
});
function seekTo(e) {
  const z = $('seekzone'); if (!z || !isFinite(Player.el.duration)) return;
  const b = z.getBoundingClientRect();
  Player.seek(clamp((e.clientX - b.left) / b.width, 0, 1) * Player.el.duration);
  renderNowPlayingBar();
}

const wheel = $('wheel');
let last = null, acc = 0;
const angle = e => { const b = wheel.getBoundingClientRect(); return Math.atan2(e.clientY - b.top - b.height / 2, e.clientX - b.left - b.width / 2) * 180 / Math.PI; };
wheel.addEventListener('pointerdown', e => {
  if (e.target.id === 'centre') return;
  wheel.setPointerCapture(e.pointerId); last = angle(e); acc = 0;
});
wheel.addEventListener('pointermove', e => {
  if (last === null) return;
  const a = angle(e); let d = a - last;
  if (d > 180) d -= 360; if (d < -180) d += 360;
  acc += d; last = a;
  const n = Math.trunc(acc / 15);
  if (n) { acc -= n * 15; rotate(n); }
});
['pointerup', 'pointercancel'].forEach(t => wheel.addEventListener(t, () => { last = null; }));
$('centre').addEventListener('click', select);
$('back').addEventListener('click', back);
document.querySelectorAll('.key').forEach(k => k.addEventListener('click', () => {
  click();
  const key = k.dataset.key;
  if (key === 'play') { if (Player.current) Player.play(); else if (Lib.songs.length) Player.start(Lib.songs, 0); else toast('Add some songs first.'); }
  if (key === 'pause') Player.pause();
  if (key === 'next') Player.next();
  if (key === 'prev') Player.previous();
  render();
}));

// iPhone only lets audio start from a tap: unlock the player on the first touch.
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
function unlock() {
  window.removeEventListener('pointerdown', unlock, true);
  if (!Player.el.src) { Player.el.src = SILENT; Player.el.play().then(() => Player.el.pause()).catch(() => {}); }
  if (Player.ctx) Player.ctx.resume().catch(() => {});
  try { if (!clickCtx) clickCtx = new (window.AudioContext || window.webkitAudioContext)(); clickCtx.resume(); } catch {}
}
window.addEventListener('pointerdown', unlock, true);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
window.addEventListener('resize', () => render());

// Live screens: clock, stopwatch and the title-bar time.
setInterval(() => {
  const r = route().r;
  if (r === 'sw' && sw.run) { const t = $('swt'); if (t) t.textContent = swFmt(swTime()); }
}, 100);
setInterval(() => { renderBar(); if (route().r === 'clock') render(); }, 10000);

// ============================================================ start
(async function init() {
  applyTheme();
  Player.makeElement();
  try { await DB.open(); await Lib.load(); }
  catch (e) { toast('Storage is unavailable. Use Safari and add MyPod to the Home Screen.', 6000); }
  render();
  if (!Lib.songs.length) toast('Welcome! Choose Add Songs… to load your music.', 4000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
