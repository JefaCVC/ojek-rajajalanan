// Every line of text the player reads, in one place. Indonesian, plain, and
// specific: short lines a driver would actually see on a sign or a phone.

export const TEXT = {
  title: 'OJEK!',
  subtitle: 'Raja Jalanan',
  tagline: 'Narik ojek di Kota Sinar. Pilih orderanmu, antar penumpang, naik pangkat.',
  start: 'Mulai Narik',
  continue: 'Lanjutkan',
  howTo: 'Cara Bermain',
  soundOn: 'Suara: Nyala',
  soundOff: 'Suara: Mati',
  resume: 'Lanjut Main',
  saveGame: 'Simpan',
  mainMenu: 'Menu Utama',
  saved: 'Progres tersimpan.',
  ordersTitle: 'Orderan',
  ordersHint: 'Pilih satu. Jarak dan harga sudah kelihatan.',
  noOrders: 'Belum ada orderan. Tunggu sebentar.',
  accept: 'Ambil',
  activeOrder: 'Orderan aktif',
  pickup: 'Jemput',
  deliver: 'Antar ke',
  passenger: 'Penumpang',
  distance: 'Jarak',
  fare: 'Ongkos',
  rating: 'Rating',
  streak: 'Beruntun',
  rank: 'Pangkat',
  dealerTitle: 'Dealer Motor Sinar Jaya',
  dealerHint: 'Beli motor baru, pasang upgrade, atau servis motormu.',
  buy: 'Beli',
  use: 'Pakai',
  owned: 'Punya',
  locked: 'Butuh level',
  speed: 'Kecepatan',
  accel: 'Akselerasi',
  handling: 'Handling',
  brakes: 'Rem',
  fuel: 'Bensin',
  condition: 'Kondisi',
  repair: 'Servis',
  repairDone: 'Motor diservis. Kondisi kembali bagus.',
  upgradeTitle: 'Upgrade',
  level: 'Level',
  money: 'Uang',
  wanted: 'Diburu polisi',
  busted: 'Ditilang!',
  bustedText: 'Polisi menangkapmu. Denda dan rating dipotong.',
  knockedOut: 'Pingsan!',
  knockedOutText: 'Kamu dikeroyok sampai pingsan. Bangun di pangkalan, uang berkurang.',
  levelUp: 'Naik level!',
  rankUp: 'Naik pangkat!',
  missionDone: 'Misi selesai!',
  storyTitle: 'Misi Cerita',
  pauseTitle: 'Jeda',
  helpTitle: 'Cara Bermain',
  helpLines: [
    'WASD atau panah: jalan dan gas motor.',
    'E: naik atau turun motor, jemput penumpang, masuk dealer.',
    'Q: buka menu orderan. Pilih yang jarak dan harganya cocok.',
    'F: pukul atau dorong. Buat ngusir begal dan geng rival.',
    'H: klakson. Esc: jeda. N: suara nyala atau mati. F3: panel debug.',
    'Lampu merah jangan diterobos kalau ada polisi.',
    'Bensin habis di SPBU. Motor curian bikin polisi ngejar.',
    'Tepat waktu dan tanpa tabrakan menaikkan rating dan streak.',
  ],
  controlsHint: 'WASD jalan, E naik motor, Q orderan, F pukul, H klakson',
  pressE: 'Tekan E',
  getOnBike: 'naik motor',
  getOffBike: 'turun dari motor',
  boardPassenger: 'penumpang naik',
  dropPassenger: 'penumpang turun',
  enterDealer: 'masuk dealer',
  refuel: 'isi bensin',
  payFine: 'bayar denda',
  stealVehicle: 'pinjam kendaraan ini',
  orderAccepted: 'Orderan diambil. Jemput penumpangmu.',
  orderComplete: 'Penumpang sampai. Ongkos masuk.',
  tipEarned: 'Tip penumpang',
  streakBonus: 'Bonus beruntun',
  fuelEmpty: 'Bensin habis. Dorong motor ke SPBU.',
  fuelLow: 'Bensin tinggal sedikit.',
  bikeStalled: 'Motor mogok. Tunggu sebentar.',
  bikeDamaged: 'Motor rusak. Servis di dealer.',
  redLight: 'Lampu merah diterobos. Polisi melihat.',
  hitAndRun: 'Kamu menabrak. Polisi mengejarmu.',
  stolen: 'Kendaraan pinjaman. Polisi mengejarmu.',
  rivalDown: 'Rival kabur. Kamu dapat uang jajan.',
  newOrders: 'Orderan baru masuk.',
  rushHour: 'Jam sibuk. Orderan naik harga.',
  rushOver: 'Jam sibuk selesai.',
  rainStart: 'Hujan turun. Jalan licin, ongkos naik.',
  rainStop: 'Hujan reda.',
  shiftChange: 'Shift baru',
  eventFlood: 'Banjir! Satu ruas jalan ditutup.',
  eventProtest: 'Demo di jalan. Persimpangan ditutup.',
  eventCrash: 'Kecelakaan. Jalan macet total.',
  eventVip: 'Penumpang VIP muncul. Ongkos besar.',
  eventParcel: 'Paket kilat! Antar cepat, bonus besar.',
  eventOver: 'Jalan sudah bisa dilewati lagi.',
  begalWarning: 'Begal menghadang di depan!',
  lateDelivery: 'Telat. Streak putus, rating turun.',
};

export const ORDER_TYPES = {
  penumpang: { name: 'Penumpang', hint: 'Antar orang ke tujuan.' },
  paket: { name: 'Paket', hint: 'Antar paket. Tidak ada penumpang.' },
  makanan: { name: 'Makanan', hint: 'Makanan panas. Jangan sampai dingin.' },
  vip: { name: 'VIP', hint: 'Penumpang penting. Ongkos besar, harus rapi.' },
};

export const STORY = [
  {
    id: 'hari-pertama',
    title: 'Hari pertama',
    brief: 'Bu Ratna langganan pangkalan. Antar dia ke Pasar Sinar.',
    done: 'Bu Ratna senang. Dia bilang kamu rajin.',
    fare: 12000,
  },
  {
    id: 'pelanggan-tetap',
    title: 'Pelanggan tetap',
    brief: 'Pak Haji harus sampai masjid sebelum azan. Jangan telat.',
    done: 'Pak Haji sampai tepat waktu. Dia kasih tip lebih.',
    fare: 18000,
  },
  {
    id: 'geng-macan',
    title: 'Geng Macan',
    brief: 'Geng Macan menghadang pangkalan. Usir dua orangnya, lalu narik lagi.',
    done: 'Geng Macan mundur. Pangkalan aman buat sekarang.',
    fare: 25000,
  },
  {
    id: 'balapan-liar',
    title: 'Balapan liar',
    brief: 'Joko si ketua geng menantangmu balapan ke dealer. Kalahkan dia.',
    done: 'Kamu sampai duluan. Joko diam saja.',
    fare: 35000,
  },
  {
    id: 'raja-jalanan',
    title: 'Raja Jalanan',
    brief: 'Tiga penumpang VIP menunggu. Antar semuanya tanpa keluhan.',
    done: 'Kota Sinar sekarang kenal namamu. Raja Jalanan.',
    fare: 60000,
  },
];

/** Formats rupiah the way an Indonesian driver reads it: Rp 12.500. */
export function formatRupiah(amount) {
  const rounded = Math.round(amount);
  return 'Rp ' + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formats a distance in metres: 850 m, or 1,2 km past a kilometre. */
export function formatDistance(metres) {
  if (metres < 1000) return Math.round(metres) + ' m';
  return (metres / 1000).toFixed(1).replace('.', ',') + ' km';
}

/** Formats a clock time like 07:30. */
export function formatClock(hourFloat) {
  const h = Math.floor(hourFloat) % 24;
  const m = Math.floor((hourFloat % 1) * 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
