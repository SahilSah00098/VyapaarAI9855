// VyapaarAI Automated Smoke & Integration Test Suite

const store = {};
global.localStorage = {
  getItem: k => store[k] || null,
  setItem: (k, v) => store[k] = String(v)
};

const el = () => ({
  innerHTML: '',
  textContent: '',
  style: {},
  value: '',
  focus() {},
  click() {},
  setSelectionRange() {},
  removeAttribute() {},
  select() {}
});

global.document = {
  querySelector: () => el(),
  querySelectorAll: () => [],
  addEventListener() {},
  documentElement: {
    getAttribute() { return 'light'; },
    setAttribute() {}
  }
};
global.window = {
  scrollTo() {},
  print() {},
  location: { protocol: 'http:', hostname: 'localhost' }
};
global.navigator = {
  clipboard: {
    writeText: async () => true
  }
};

// QRCode Implementation for test
var QRCode = (function () {
  var PAD0 = 0xEC, PAD1 = 0x11;
  function QRCode(t, e) {
    this.typeNumber = t;
    this.errorCorrectionLevel = e;
    this.modules = null;
    this.moduleCount = 0;
    this.dataCache = null;
    this.dataList = [];
  }
  function QR8bitByte(d) { this.mode = 4; this.data = d; }
  QR8bitByte.prototype = {
    getLength: function () { return this.data.length; },
    write: function (b) { for (var i = 0; i < this.data.length; i++) b.put(this.data.charCodeAt(i), 8); }
  };
  var QRUtil = {
    PATTERN_POSITION_TABLE: [[], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54]],
    G15: (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | 1,
    G15_MASK: (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1),
    getBCHTypeInfo: function (d) {
      var v = d << 10;
      while (QRUtil.getBCHDigit(v) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) v ^= (QRUtil.G15 << (QRUtil.getBCHDigit(v) - QRUtil.getBCHDigit(QRUtil.G15)));
      return ((d << 10) | v) ^ QRUtil.G15_MASK;
    },
    getBCHDigit: function (d) { var c = 0; while (d != 0) { c++; d >>>= 1; } return c; },
    getPatternPosition: function (t) { return QRUtil.PATTERN_POSITION_TABLE[t - 1]; },
    getMask: function (m, i, j) {
      switch (m) {
        case 0: return (i + j) % 2 == 0;
        case 1: return i % 2 == 0;
        case 2: return j % 3 == 0;
        case 3: return (i + j) % 3 == 0;
        case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
        case 5: return (i * j) % 2 + (i * j) % 3 == 0;
        case 6: return ((i * j) % 2 + (i * j) % 3) % 2 == 0;
        case 7: return ((i * j) % 3 + (i + j) % 2) % 2 == 0;
        default: throw new Error("bad mask:" + m);
      }
    },
    getErrorCorrectionPolynomial: function (l) {
      var a = new QRPolynomial([1], 0);
      for (var i = 0; i < l; i++) a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
      return a;
    },
    getLengthInBits: function (m, t) { return (t < 10) ? 8 : 16; },
    getLostPoint: function (q) {
      var c = q.getModuleCount(), lp = 0;
      for (var r = 0; r < c; r++) {
        for (var col = 0; col < c; col++) {
          var sc = 0, dk = q.isDark(r, col);
          for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
              if (r + dr < 0 || c <= r + dr || col + dc < 0 || c <= col + dc || (!dr && !dc)) continue;
              if (dk == q.isDark(r + dr, col + dc)) sc++;
            }
          }
          if (sc > 5) lp += 3 + sc - 5;
        }
      }
      return lp;
    }
  };
  var QRMath = {
    glog: function (n) { if (n < 1) throw new Error("glog"); return QRMath.LOG_TABLE[n]; },
    gexp: function (n) { while (n < 0) n += 255; while (n >= 256) n -= 255; return QRMath.EXP_TABLE[n]; },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
  };
  for (var i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
  for (var i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
  for (var i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
  function QRPolynomial(n, s) {
    var o = 0; while (o < n.length && n[o] == 0) o++;
    this.num = new Array(n.length - o + s);
    for (var i = 0; i < n.length - o; i++) this.num[i] = n[i + o];
  }
  QRPolynomial.prototype = {
    get: function (i) { return this.num[i]; },
    getLength: function () { return this.num.length; },
    multiply: function (e) {
      var num = new Array(this.getLength() + e.getLength() - 1);
      for (var i = 0; i < this.getLength(); i++) {
        for (var j = 0; j < e.getLength(); j++) num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
      }
      return new QRPolynomial(num, 0);
    },
    mod: function (e) {
      if (this.getLength() - e.getLength() < 0) return this;
      var r = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0)), num = new Array(this.getLength());
      for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
      for (var i = 0; i < e.getLength(); i++) num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + r);
      return new QRPolynomial(num, 0).mod(e);
    }
  };
  function QRRSBlock(t, d) { this.totalCount = t; this.dataCount = d; }
  QRRSBlock.RS_BLOCK_TABLE = [[1, 26, 19], [1, 44, 34], [1, 70, 55], [1, 100, 80], [1, 134, 108], [2, 86, 68], [2, 98, 78], [2, 121, 97], [2, 146, 116], [2, 86, 68]];
  QRRSBlock.getRSBlocks = function (t) {
    var b = QRRSBlock.RS_BLOCK_TABLE[t - 1], list = [];
    for (var i = 0; i < b[0]; i++) list.push(new QRRSBlock(b[1], b[2]));
    return list;
  };
  function QRBitBuffer() { this.buffer = []; this.length = 0; }
  QRBitBuffer.prototype = {
    put: function (n, l) { for (var i = 0; i < l; i++) this.putBit(((n >>> (l - i - 1)) & 1) == 1); },
    putBit: function (b) {
      var idx = Math.floor(this.length / 8);
      if (this.buffer.length <= idx) this.buffer.push(0);
      if (b) this.buffer[idx] |= (0x80 >>> (this.length % 8));
      this.length++;
    }
  };
  QRCode.prototype = {
    addData: function (d) { this.dataList.push(new QR8bitByte(d)); this.dataCache = null; },
    isDark: function (r, c) { return this.modules[r][c]; },
    getModuleCount: function () { return this.moduleCount; },
    make: function () { this.makeImpl(false, this.getBestMaskPattern()); },
    makeImpl: function (test, mask) {
      this.moduleCount = this.typeNumber * 4 + 17;
      this.modules = new Array(this.moduleCount);
      for (var r = 0; r < this.moduleCount; r++) {
        this.modules[r] = new Array(this.moduleCount);
        for (var c = 0; c < this.moduleCount; c++) this.modules[r][c] = null;
      }
      this.setupProbe(0, 0); this.setupProbe(this.moduleCount - 7, 0); this.setupProbe(0, this.moduleCount - 7);
      this.setupPosAdj(); this.setupTiming(); this.setupTypeInfo(test, mask);
      if (!this.dataCache) this.dataCache = QRCode.createData(this.typeNumber, this.errorCorrectionLevel, this.dataList);
      this.mapData(this.dataCache, mask);
    },
    setupProbe: function (row, col) {
      for (var r = -1; r <= 7; r++) {
        if (row + r < 0 || this.moduleCount <= row + r) continue;
        for (var c = -1; c <= 7; c++) {
          if (col + c < 0 || this.moduleCount <= col + c) continue;
          this.modules[row + r][col + c] = (0 <= r && r <= 6 && (c == 0 || c == 6)) || (0 <= c && c <= 6 && (r == 0 || r == 6)) || (2 <= r && r <= 4 && 2 <= c && c <= 4);
        }
      }
    },
    getBestMaskPattern: function () {
      var min = 0, pat = 0;
      for (var i = 0; i < 8; i++) {
        this.makeImpl(true, i);
        var lp = QRUtil.getLostPoint(this);
        if (!i || min > lp) { min = lp; pat = i; }
      }
      return pat;
    },
    setupTiming: function () {
      for (var r = 8; r < this.moduleCount - 8; r++) {
        if (this.modules[r][6] == null) this.modules[r][6] = (r % 2 == 0);
      }
      for (var c = 8; c < this.moduleCount - 8; c++) {
        if (this.modules[6][c] == null) this.modules[6][c] = (c % 2 == 0);
      }
    },
    setupPosAdj: function () {
      var pos = QRUtil.getPatternPosition(this.typeNumber);
      if (!pos) return;
      for (var i = 0; i < pos.length; i++) {
        for (var j = 0; j < pos.length; j++) {
          var row = pos[i], col = pos[j];
          if (this.modules[row][col] != null) continue;
          for (var r = -2; r <= 2; r++) {
            for (var c = -2; c <= 2; c++) {
              this.modules[row + r][col + c] = (r == -2 || r == 2 || c == -2 || c == 2 || (!r && !c));
            }
          }
        }
      }
    },
    setupTypeInfo: function (test, mask) {
      var d = (this.errorCorrectionLevel << 3) | mask, bits = QRUtil.getBCHTypeInfo(d);
      for (var i = 0; i < 15; i++) {
        var mod = (!test && ((bits >> i) & 1) == 1);
        if (i < 6) this.modules[i][8] = mod;
        else if (i < 8) this.modules[i + 1][8] = mod;
        else this.modules[this.moduleCount - 15 + i][8] = mod;
        if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
        else if (i < 9) this.modules[8][15 - i] = mod;
        else this.modules[8][15 - i - 1] = mod;
      }
      this.modules[this.moduleCount - 8][8] = !test;
    },
    mapData: function (data, mask) {
      var inc = -1, row = this.moduleCount - 1, bit = 7, byteIdx = 0;
      for (var col = this.moduleCount - 1; col > 0; col -= 2) {
        if (col == 6) col--;
        while (true) {
          for (var c = 0; c < 2; c++) {
            if (this.modules[row][col - c] == null) {
              var dark = false;
              if (byteIdx < data.length) dark = (((data[byteIdx] >>> bit) & 1) == 1);
              if (QRUtil.getMask(mask, row, col - c)) dark = !dark;
              this.modules[row][col - c] = dark;
              bit--;
              if (bit == -1) { byteIdx++; bit = 7; }
            }
          }
          row += inc;
          if (row < 0 || this.moduleCount <= row) { row -= inc; inc = -inc; break; }
        }
      }
    }
  };
  QRCode.createData = function (type, ec, list) {
    var rs = QRRSBlock.getRSBlocks(type), buf = new QRBitBuffer();
    for (var i = 0; i < list.length; i++) {
      var d = list[i]; buf.put(d.mode, 4); buf.put(d.getLength(), QRUtil.getLengthInBits(d.mode, type)); d.write(buf);
    }
    var tot = 0; for (var i = 0; i < rs.length; i++) tot += rs[i].dataCount;
    if (buf.length + 4 <= tot * 8) buf.put(0, 4);
    while (buf.length % 8 != 0) buf.putBit(false);
    while (true) {
      if (buf.length >= tot * 8) break; buf.put(PAD0, 8);
      if (buf.length >= tot * 8) break; buf.put(PAD1, 8);
    }
    return QRCode.createBytes(buf, rs);
  };
  QRCode.createBytes = function (buf, rs) {
    var off = 0, maxDc = 0, maxEc = 0, dc = new Array(rs.length), ec = new Array(rs.length);
    for (var r = 0; r < rs.length; r++) {
      var dcCount = rs[r].dataCount, ecCount = rs[r].totalCount - dcCount;
      maxDc = Math.max(maxDc, dcCount); maxEc = Math.max(maxEc, ecCount);
      dc[r] = new Array(dcCount);
      for (var i = 0; i < dc[r].length; i++) dc[r][i] = 0xff & buf.buffer[i + off];
      off += dcCount;
      var rsP = QRUtil.getErrorCorrectionPolynomial(ecCount), raw = new QRPolynomial(dc[r], rsP.getLength() - 1), mod = raw.mod(rsP);
      ec[r] = new Array(rsP.getLength() - 1);
      for (var i = 0; i < ec[r].length; i++) {
        var idx = i + mod.getLength() - ec[r].length; ec[r][i] = (idx >= 0) ? mod.get(idx) : 0;
      }
    }
    var tot = 0; for (var i = 0; i < rs.length; i++) tot += rs[i].totalCount;
    var data = new Array(tot), idx = 0;
    for (var i = 0; i < maxDc; i++) {
      for (var r = 0; r < rs.length; r++) { if (i < dc[r].length) data[idx++] = dc[r][i]; }
    }
    for (var i = 0; i < maxEc; i++) {
      for (var r = 0; r < rs.length; r++) { if (i < ec[r].length) data[idx++] = ec[r][i]; }
    }
    return data;
  };
  return function (text, size) {
    size = size || 180;
    var type = 4;
    if (text.length > 70) type = 6;
    if (text.length > 130) type = 10;
    var qr = new QRCode(type, 0);
    qr.addData(text);
    qr.make();
    var count = qr.getModuleCount(), cell = (size / count).toFixed(2), rects = '';
    for (var r = 0; r < count; r++) {
      for (var c = 0; c < count; c++) {
        if (qr.isDark(r, c)) rects += '<rect x="' + (c * cell) + '" y="' + (r * cell) + '" width="' + cell + '" height="' + cell + '" fill="#0b6b5c"/>';
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '">' + rects + '</svg>';
  };
})();

const $ = s => document.querySelector(s),
      DAY = 864e5,
      iso = d => new Date(d).toISOString().slice(0, 10),
      ago = n => iso(Date.now() - n * DAY),
      since = s => Math.floor((Date.now() - new Date(s)) / DAY),
      uid = () => Math.random().toString(36).slice(2, 9);

const inr = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CATS = ['Grocery', 'Dairy', 'Snacks', 'Household', 'Personal Care'],
      ECATS = ['Rent', 'Stock purchase', 'Electricity', 'Salary', 'Other'],
      KEY = 'vyapaarai.v1',
      SETTINGS_KEY = 'vyapaarai.settings.v1',
      sum = a => a.reduce((t, x) => t + x.amount, 0);

const I18N = {
  en: { title: "VyapaarAI", tagline: "Your next sale starts with your next smart action.", overview: "Business overview", customers: "Customers", sales: "Sales & expenses", tasks: "Follow-ups", advisor: "Growth Advisor", writer: "Message writer", totalSales: "Total sales", expenses: "Expenses", profit: "Estimated profit", udhaarPending: "Udhaar pending", activeCustomers: "Active customers (30d)", lapsedCustomers: "Not seen in 30+ days", voiceBtn: "Voice Khata", newSaleBtn: "Add Sale", askAiBtn: "AI Copilot", billBtn: "Print Bill", udhaarRecTitle: "Udhaar pending", ruleExplainer: "How these rules work" },
  hn: { title: "VyapaarAI", tagline: "Smart dhandha, tez munafa aur aasaan hisaab.", overview: "Business Dashboard", customers: "Grahak Khata", sales: "Bikri aur Kharcha", tasks: "Pending Kaam", advisor: "Vyapaar Advisor", writer: "WhatsApp Messages", totalSales: "Kul Bikri", expenses: "Dukaan Kharcha", profit: "Anumaanit Munafa", udhaarPending: "Udhaar Baaki", activeCustomers: "Active Grahak (30d)", lapsedCustomers: "Shant Grahak (30+ din)", voiceBtn: "Bol Kar Khata", newSaleBtn: "Bikri Likho", askAiBtn: "AI Coach", billBtn: "Parcha / Bill", udhaarRecTitle: "Udhaar pending", ruleExplainer: "How these rules work" },
  hi: { title: "व्यापार एआई", tagline: "स्मार्ट व्यापार, तेज मुनाफा और आसान बहीखाता।", overview: "व्यापार विवरण", customers: "ग्राहक बहीखाता", sales: "बिक्री व खर्च", tasks: "कार्य सूची", advisor: "व्यापार सलाहकार", writer: "व्हाट्सएप संदेश", totalSales: "कुल बिक्री", expenses: "दुकान खर्च", profit: "अनुमानित मुनाफा", udhaarPending: "उधार बाकी", activeCustomers: "सक्रिय ग्राहक (30 दिन)", lapsedCustomers: "30+ दिन से अनुपस्थित", voiceBtn: "बोलकर लिखें", newSaleBtn: "बिक्री जोड़ें", askAiBtn: "एआई कोच", billBtn: "बिल रसीद", udhaarRecTitle: "Udhaar pending", ruleExplainer: "How these rules work" }
};

function t(key) {
  const l = U.lang || 'en';
  return (I18N[l] && I18N[l][key]) || I18N.en[key] || key;
}

let SETTINGS = { shopName: "Vyapaar Kirana Store", upiId: "vyapaar.store@upi", phone: "9876543210", address: "Shop #4, Main Market", geminiKey: "" };

function seed() {
  const P = [
    ['Ramesh Gupta', 2, 1800, 3],
    ['Sunita Verma', 3, 900, 5],
    ['Anil Kapoor', 4, 2600, 40],
    ['Meena Iyer', 2, 700, 2],
    ['Farhan Sheikh', 5, 1500, 36],
    ['Pooja Nair', 3, 1100, 6],
    ['Harpreet Singh', 6, 3200, 28],
    ['Kavita Joshi', 4, 600, 55]
  ];
  const customers = P.map((p, i) => ({
    id: 'c' + i,
    name: p[0],
    phone: '98100000' + (10 + i),
    notes: i === 2 ? 'Prefers monthly grocery bundle' : i === 4 ? 'Buys snacks for shop events' : ''
  }));
  const sales = [], expenses = [];
  P.forEach((p, i) => {
    for (let d = p[3]; d <= 85; d += p[1] + Math.floor(p[1] * (i % 3) / 2) + (i > 1 ? 3 : 0)) {
      const c = CATS[(d + i) % 5];
      if (c === 'Dairy' && d < 30 && d % 2) continue;
      sales.push({
        id: 's' + i + '_' + d,
        date: ago(d),
        amount: Math.round(p[2] * (0.5 + ((d * 7 + i) % 5) / 10) / 10) * 10,
        category: c,
        customerId: 'c' + i
      });
    }
  });
  for (let m = 0; m < 3; m++) {
    expenses.push(
      { id: 'ea' + m, date: ago(m * 30 + 2), amount: 15000, category: 'Rent', note: 'Shop rent' },
      { id: 'eb' + m, date: ago(m * 30 + 8), amount: 9000 + m * 700, category: 'Stock purchase', note: 'Wholesale stock' },
      { id: 'ec' + m, date: ago(m * 30 + 12), amount: 2200, category: 'Electricity', note: '' }
    );
  }
  ['c6', 'c2'].forEach(id => sales.filter(s => s.customerId === id).slice(0, 1).forEach(s => s.paid = false));
  return {
    customers,
    sales,
    expenses,
    followups: [
      { id: 'f1', customerId: 'c2', title: 'Check why monthly order stopped', due: ago(3), priority: 'High', done: false },
      { id: 'f2', customerId: 'c6', title: 'Offer festive bulk discount', due: ago(-2), priority: 'Medium', done: false },
      { id: 'f3', customerId: 'c0', title: 'Thank for referral', due: ago(10), priority: 'Low', done: true }
    ],
    demo: true
  };
}

const empty = () => ({ customers: [], sales: [], expenses: [], followups: [], demo: false });

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (!s) return seed();
    const a = k => Array.isArray(s[k]) ? s[k].filter(x => x && x.id) : [];
    return {
      customers: a('customers'),
      sales: a('sales'),
      expenses: a('expenses'),
      followups: a('followups'),
      demo: !!s.demo
    };
  } catch (e) {
    return seed();
  }
}

const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

let S = load(),
    U = { tab: 'Overview', days: 30, q: '', sort: 'name', edit: null, view: null, wc: '', goal: 'winback', lang: 'en', fil: 'open', tour: null };

const cn = id => (S.customers.find(c => c.id === id) || {}).name || 'Walk-in';

function cs(c) {
  const m = S.sales.filter(x => x.customerId === c.id).sort((a, b) => b.date.localeCompare(a.date));
  const o = S.followups.filter(f => f.customerId === c.id && !f.done);
  return {
    total: sum(m),
    count: m.length,
    last: m[0] ? m[0].date : null,
    ds: m[0] ? since(m[0].date) : null,
    status: o.some(f => f.due < iso(Date.now())) ? 'Overdue' : o.length ? 'Pending' : 'None'
  };
}

function metrics() {
  const from = U.days ? ago(U.days) : '0';
  const sa = S.sales.filter(x => x.date >= from);
  const ex = S.expenses.filter(x => x.date >= from);
  const bc = {};
  sa.forEach(x => bc[x.category] = (bc[x.category] || 0) + x.amount);

  const w = Math.min(13, Math.ceil((U.days || 90) / 7)), tr = [];
  for (let i = w - 1; i >= 0; i--) {
    const a = ago(i * 7 + 6), b = ago(i * 7);
    tr.push({
      l: b.slice(5),
      v: sum(S.sales.filter(x => x.date >= a && x.date <= b)),
      e: sum(S.expenses.filter(x => x.date >= a && x.date <= b))
    });
  }
  return { s: sum(sa), e: sum(ex), p: sum(sa) - sum(ex), bc, tr };
}

function recs() {
  const o = [], t = iso(Date.now()), st = S.customers.map(c => ({ c, ...cs(c) }));
  const v = st.map(x => x.total).sort((a, b) => a - b);
  const top = v[Math.floor(v.length * 0.7)] ?? Infinity;

  st.forEach(({ c, total, ds, last, count }) => {
    if (ds === null) return;
    const hv = total >= top && total > 0;
    if (ds >= 30 || (hv && ds >= 21)) {
      o.push({
        id: 'r' + c.id,
        k: 'lapsed',
        cid: c.id,
        pr: hv || ds >= 45 ? 'High' : 'Medium',
        a: 'Reach out to ' + c.name,
        why: `Last purchase ${ds} days ago (${last}); ${count} purchases worth ${inr(total)} in total${hv ? ', among your top-value customers' : ''}.`,
        next: 'Draft a WhatsApp message',
        risk: total / Math.max(1, count)
      });
    }
  });

  S.sales.filter(x => x.paid === false).forEach(x => {
    const d = since(x.date);
    o.push({
      id: 'u' + x.id,
      k: 'udhaar',
      cid: x.customerId,
      pr: d >= 14 ? 'High' : 'Medium',
      a: `Collect ${inr(x.amount)} from ${cn(x.customerId)}`,
      why: `Udhaar sale on ${x.date} (${d} days ago) is still unpaid.`,
      next: 'Draft payment reminder'
    });
  });

  S.followups.filter(f => !f.done && f.due < t).forEach(f => {
    o.push({
      id: 'o' + f.id,
      k: 'overdue',
      pr: 'High',
      a: 'Complete overdue task: ' + f.title,
      why: `Due ${f.due}, ${since(f.due)} days ago for ${cn(f.customerId)}.`,
      next: 'Open tasks'
    });
  });

  const cu = {}, pv = {};
  S.sales.forEach(x => {
    const d = since(x.date);
    if (d < 30) cu[x.category] = (cu[x.category] || 0) + x.amount;
    else if (d < 60) pv[x.category] = (pv[x.category] || 0) + x.amount;
  });

  Object.keys(pv).forEach(k => {
    const p = pv[k], c = cu[k] || 0;
    if (p >= 1000 && c < p * 0.75) {
      o.push({
        id: 'k' + k,
        k: 'cat',
        pr: 'Medium',
        a: `Review ${k} stock and promotions`,
        why: `${k} sales fell ${Math.round((1 - c / p) * 100)}% (${inr(p)} to ${inr(c)}) versus the previous 30 days.`,
        next: 'Add a task'
      });
    }
  });

  const w = { High: 0, Medium: 1, Low: 2 };
  return o.sort((a, b) => w[a.pr] - w[b.pr]);
}

function draft(c, g, l) {
  const due = sum(S.sales.filter(x => x.customerId === c.id && x.paid === false));
  const s = cs(c), f = c.name.split(' ')[0], m = {};
  S.sales.filter(x => x.customerId === c.id).forEach(x => m[x.category] = (m[x.category] || 0) + 1);
  const fav = (Object.entries(m).sort((a, b) => b[1] - a[1])[0] || [])[0];
  const h = l === 'hi';
  return {
    winback: h
      ? `Namaste ${f} ji! Kaafi time ho gaya, aapko dukaan par dekhe${s.ds ? ` (last visit ${s.ds} din pehle)` : ''}. ${fav ? `Aapka favourite ${fav} ka naya stock aaya hai. ` : ''}Aap kab aa rahe hain? Aapke liye special offer rakha hai.`
      : `Hello ${f}, it has been a while since your last visit${s.ds ? ` (${s.ds} days ago)` : ''}. ${fav ? `We have fresh ${fav} stock you may like. ` : ''}We would love to see you again and have a small offer ready for you.`,
    pay: h
      ? `Namaste ${f} ji, aapka ${inr(due)} ka hisaab abhi baaki hai. Jab suvidha ho tab bhej dijiye. Dhanyavaad!`
      : `Hello ${f}, a gentle reminder that ${inr(due)} is pending on your account. Please pay when convenient. Thank you!`,
    thanks: h
      ? `Namaste ${f} ji, hamari dukaan se kharidari ke liye bahut dhanyavaad! Aapka saath humare liye important hai.`
      : `Hello ${f}, thank you for shopping with us. We truly value your support.`,
    offer: h
      ? `Namaste ${f} ji! Is hafte ${fav || 'selected items'} par special discount hai. Aaiye dukaan par, ya reply karein, hum ready rakhenge.`
      : `Hello ${f}, we have a special discount this week on ${fav || 'selected items'}. Visit us or reply and we will keep it ready for you.`
  }[g];
}

function parseVoiceText(text) {
  const lower = text.toLowerCase().trim();
  let amount = null;
  const numMatch = lower.match(/(?:₹|rs\.?|inr|rupaye|rupees)?\s*(\d+(?:\.\d+)?)/i);
  if (numMatch) amount = parseFloat(numMatch[1]);

  const isExpense = /(kharch|expense|kiraya|rent|bijli|electricity|salary|bill|tankha|dukaan)/i.test(lower);
  const isUdhaar = /(udhaar|baaki|baki|credit|likh|pay later)/i.test(lower);

  let category = isExpense ? 'Other' : 'Grocery';
  if (/(doodh|dairy|milk|paneer|curd|chaas)/i.test(lower)) category = 'Dairy';
  else if (/(snack|namkeen|chips|biscuit|cold drink|chai)/i.test(lower)) category = 'Snacks';
  else if (/(rent|kiraya)/i.test(lower)) category = 'Rent';
  else if (/(bijli|electricity|light)/i.test(lower)) category = 'Electricity';
  else if (/(stock|wholesale|maal)/i.test(lower)) category = 'Stock purchase';

  let customer = null;
  if (!isExpense && S.customers) {
    for (const c of S.customers) {
      const p = c.name.toLowerCase().split(/\s+/);
      if (lower.includes(c.name.toLowerCase()) || p.some(part => part.length > 2 && lower.includes(part))) {
        customer = c;
        break;
      }
    }
  }

  return {
    raw: text,
    isExpense,
    isUdhaar: !isExpense && isUdhaar,
    paid: isExpense ? true : !isUdhaar,
    amount: amount || 100,
    category,
    customer
  };
}

const TOUR = [
  ['Overview', 'Step 1/6: Read the shop’s numbers: sales, expenses, profit and udhaar.'],
  ['Advisor', 'Step 2/6: Every action has a reason from your data. Tap one.'],
  ['Writer', 'Step 3/6: A personalised draft is ready. Copy it or open WhatsApp; you press send.'],
  ['Tasks', 'Step 4/6: Complete a follow-up task.'],
  ['Sales', 'Step 5/6: Add a sale (try udhaar). Metrics update instantly.'],
  ['Overview', 'Step 6/6: See the dashboard change.']
];

function tourGo(i) {
  if (i >= TOUR.length) { U.tour = null; return; }
  U.tour = i; U.tab = TOUR[i][0]; U.edit = null;
  if (TOUR[i][0] === 'Writer' && !U.wc) { U.wc = 'c2'; U.goal = 'winback'; }
}

const opt = (l, s) => l.map(x => `<option${x === s ? ' selected' : ''}>${esc(x)}</option>`).join('');
const csel = s => `<select name="customerId" aria-label="Customer"><option value="">Walk-in</option>${S.customers.map(c => `<option value="${c.id}"${c.id === s ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
const bars = d => {
  const mx = Math.max(1, ...d.map(x => x.v));
  return `<div class="bars" role="img" aria-label="Bar chart">${d.map(x => `<div class="bar"><span>${x.v >= 1000 ? Math.round(x.v / 1000) + 'k' : x.v}</span><i style="height:${Math.max(2, x.v / mx * 100)}%"></i><span>${esc(x.l)}</span></div>`).join('')}</div>`;
};

const TABS = ['Overview', 'Customers', 'Sales', 'Tasks', 'Advisor', 'Writer'];

function view() {
  const e = U.edit;
  let h = S.demo ? '<div class="ban">Demo data for an imaginary store. Recommendations are rule-based, not an AI model. <button class="sm" data-a="tour">Start guided demo</button></div>' : '';
  if (U.tour != null) h += `<div class="card" style="border-color:var(--pri)"><b>${TOUR[U.tour][1]}</b><div class="acts"><button class="pri sm" data-a="tnext">${U.tour == 5 ? 'Finish' : 'Next'}</button><button class="sm" data-a="tend">Skip tour</button></div></div>`;
  
  if (U.tab === 'Overview') {
    const m = metrics(), op = S.followups.filter(f => !f.done).length;
    h += `<h1>Business overview</h1><div class="r"><select data-m="days" aria-label="Period"><option value="7"${U.days == 7 ? ' selected' : ''}>Last 7 days</option><option value="30"${U.days == 30 ? ' selected' : ''}>Last 30 days</option><option value="90"${U.days == 90 ? ' selected' : ''}>Last 90 days</option><option value="0"${U.days == 0 ? ' selected' : ''}>All time</option></select></div>
<div class="kpis"><div class="card"><small>Total sales</small><b>${inr(m.s)}</b></div><div class="card"><small>Expenses</small><b>${inr(m.e)}</b></div><div class="card"><small>Estimated profit</small><b>${inr(m.p)}</b></div><div class="card"><small>Customers</small><b>${S.customers.length}</b></div><div class="card"><small>Open follow-ups</small><b>${op}</b></div><div class="card"><small>Udhaar pending</small><b>${inr(sum(S.sales.filter(x => x.paid === false)))}</b></div><div class="card"><small>Active customers (30d)</small><b>${S.customers.filter(c => { const d = cs(c).ds; return d !== null && d < 30; }).length}/${S.customers.length}</b></div><div class="card"><small>Not seen in 30+ days</small><b>${S.customers.filter(c => { const d = cs(c).ds; return d !== null && d >= 30; }).length}</b></div></div>
<p class="mut" style="font-size:13px">Profit is estimated from recorded sales minus recorded expenses and may exclude unrecorded costs.</p>
<div class="card"><h3>Weekly sales (₹)</h3>${bars(m.tr)}</div><div class="card"><h3>Sales by category (₹)</h3>${Object.keys(m.bc).length ? bars(Object.entries(m.bc).map(([l, v]) => ({ l: l.split(' ')[0], v }))) : '<p class="empty">No sales in this period.</p>'}</div>`;
  }
  if (U.tab === 'Customers') {
    const L = S.customers.map(c => ({ ...c, ...cs(c) })).filter(c => (c.name + c.phone).toLowerCase().includes(U.q.toLowerCase())).sort((a, b) => U.sort === 'value' ? b.total - a.total : U.sort === 'recent' ? (b.last || '').localeCompare(a.last || '') : a.name.localeCompare(b.name));
    h += `<h1>Customers</h1><div class="r"><input id="q" data-m="q" placeholder="Search name or phone" value="${esc(U.q)}" aria-label="Search"><select data-m="sort" aria-label="Sort"><option value="name">Name</option><option value="value"${U.sort == 'value' ? ' selected' : ''}>Highest value</option><option value="recent"${U.sort == 'recent' ? ' selected' : ''}>Most recent</option></select></div><button class="pri" data-a="newc" style="width:100%;margin-bottom:10px">Add customer</button>`;
    if (e && e.kind === 'c') h += `<form class="card f" data-f="cust"><input name="name" placeholder="Name" value="${esc(e.name)}"><input name="phone" inputmode="tel" placeholder="Phone (10 digits)" value="${esc(e.phone)}"><input name="notes" placeholder="Notes" value="${esc(e.notes)}"><button class="pri">Save</button><button type="button" data-a="cancel">Cancel</button></form>`;
    h += L.length ? L.map(c => `<div class="card"><b>${esc(c.name)}</b> <small>${esc(c.phone)}</small><br><small>Last: ${c.last ? c.last + ' (' + c.ds + 'd ago)' : 'none'} · Total ${inr(c.total)} · Follow-up: ${c.status}${(() => { const u = sum(S.sales.filter(x => x.customerId === c.id && x.paid === false)); return u ? ' · <span class="od">Udhaar \u20b9' + u + '</span>' : ''; })()}</small>
${U.view === c.id ? `<p>${esc(c.notes || 'No notes')}</p><ul>${S.sales.filter(x => x.customerId === c.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map(x => `<li>${x.date} · ${x.category} · ${inr(x.amount)}</li>`).join('') || '<li>No purchases</li>'}</ul>` : ''}
<div class="acts"><button class="sm" data-a="viewc:${c.id}">${U.view === c.id ? 'Hide' : 'View'}</button><button class="sm" data-a="editc:${c.id}">Edit</button><button class="sm dng" data-a="delc:${c.id}">Delete</button></div></div>`).join('') : '<p class="empty">No customers found. Add your first customer.</p>';
  }
  if (U.tab === 'Sales') {
    h += `<h1>Sales &amp; expenses</h1><form class="card f" data-f="sale"><h3>Add sale</h3><input type="date" name="date" value="${iso(Date.now())}" aria-label="Date"><input name="amount" type="number" inputmode="decimal" step="any" placeholder="Amount (INR)"><select name="category" aria-label="Category">${opt(CATS)}</select>${csel('')}<select name="paid" aria-label="Payment"><option value="1">Paid now</option><option value="0">Udhaar (pay later)</option></select><button class="pri">Add sale</button></form>
<form class="card f" data-f="exp"><h3>Add expense</h3><input type="date" name="date" value="${iso(Date.now())}" aria-label="Date"><input name="amount" type="number" inputmode="decimal" step="any" placeholder="Amount (INR)"><select name="category" aria-label="Category">${opt(ECATS)}</select><input name="note" placeholder="Note"><button class="pri">Add expense</button></form>`;
    [['Recent sales', 'sales'], ['Recent expenses', 'expenses']].forEach(([title, k]) => {
      h += `<div class="card"><h3>${title}</h3>${S[k].length ? '<ul>' + [...S[k]].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map(x => `<li>${x.date} · ${esc(x.category)}${k === 'sales' ? ' · ' + esc(cn(x.customerId)) : ''} · <b>${inr(x.amount)}</b>${x.paid === false ? ` <span class="od">UDHAAR</span> <button class="sm" data-a="paid:${x.id}">Mark paid</button>` : ''} <button class="sm dng" data-a="delr:${k}:${x.id}" aria-label="Delete record">×</button></li>`).join('') + '</ul>' : '<p class="empty">No records yet.</p>'}</div>`;
    });
  }
  if (U.tab === 'Tasks') {
    const L = S.followups.filter(f => U.fil === 'all' || (U.fil === 'open' ? !f.done : f.done)).sort((a, b) => a.due.localeCompare(b.due)), t = iso(Date.now());
    h += `<h1>Follow-ups</h1><div class="r"><select data-m="fil" aria-label="Filter"><option value="open"${U.fil == 'open' ? ' selected' : ''}>Open</option><option value="done"${U.fil == 'done' ? ' selected' : ''}>Completed</option><option value="all"${U.fil == 'all' ? ' selected' : ''}>All</option></select><button class="pri" data-a="newf">New follow-up</button></div>`;
    if (e && e.kind === 'f') h += `<form class="card f" data-f="fu"><input name="title" placeholder="Task" value="${esc(e.title)}">${csel(e.customerId)}<input type="date" name="due" value="${e.due || t}" aria-label="Due date"><select name="priority" aria-label="Priority">${opt(['High', 'Medium', 'Low'], e.priority || 'Medium')}</select><button class="pri">Save</button><button type="button" data-a="cancel">Cancel</button></form>`;
    h += L.length ? L.map(f => `<div class="card"><b class="${f.done ? 'done' : ''}">${esc(f.title)}</b><br><small>${esc(cn(f.customerId))} · due ${f.due} · ${f.priority} ${!f.done && f.due < t ? '<span class="od">overdue</span>' : ''}</small><div class="acts"><button class="sm" data-a="done:${f.id}">${f.done ? 'Reopen' : 'Complete'}</button><button class="sm" data-a="editf:${f.id}">Edit</button><button class="sm dng" data-a="delf:${f.id}">Delete</button></div></div>`).join('') : '<p class="empty">Nothing here.</p>';
  }
  if (U.tab === 'Advisor') {
    const R = recs(), risk = sum(R.filter(r => r.k === 'lapsed').map(r => ({ amount: r.risk })));
    h += `<h1>Growth Advisor</h1><p class="mut" style="font-size:13px">Rule-based recommendations computed from your stored records. No AI model is called.</p>${risk ? `<div class="card"><small>Typical value of one visit from each lapsed customer</small><br><b>${inr(risk)}</b></div>` : ''}`;
    h += R.length ? R.map(r => `<div class="card"><span class="pill ${r.pr}">${r.pr} priority</span><h3>${esc(r.a)}</h3><p>${esc(r.why)}</p><button class="pri" data-a="rec:${r.id}">${r.next}</button></div>`).join('') : '<p class="empty">No recommendations right now. Add more sales and customers to get insights.</p>';
    h += `<div class="card"><h3>How these rules work</h3><ul><li>Lapsed: no purchase for 30+ days, or 21+ days for your top-value customers.</li><li>Udhaar: any unpaid sale; High priority after 14 days.</li><li>Overdue: a follow-up past its due date.</li><li>Category drop: a category falls 25%+ versus the previous 30 days.</li></ul><small>Rule-based and deterministic. No AI model is called and no data leaves your device.</small></div>`;
  }
  if (U.tab === 'Writer') {
    const c = S.customers.find(x => x.id === U.wc);
    h += `<h1>Message writer</h1><p class="mut" style="font-size:13px">Template-based drafts (not AI-generated). Nothing is sent automatically.</p><div class="r"><select data-m="wc" aria-label="Customer"><option value="">Choose customer</option>${S.customers.map(x => `<option value="${x.id}"${x.id === U.wc ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
<select data-m="goal" aria-label="Goal"><option value="winback">Win back</option><option value="thanks"${U.goal == 'thanks' ? ' selected' : ''}>Thank you</option><option value="offer"${U.goal == 'offer' ? ' selected' : ''}>Offer</option><option value="pay"${U.goal == 'pay' ? ' selected' : ''}>Payment reminder</option></select><select data-m="lang" aria-label="Language"><option value="en">English</option><option value="hi"${U.lang == 'hi' ? ' selected' : ''}>Hinglish</option></select></div>`;
    h += c ? `<div class="card"><textarea id="dr" rows="7" readonly>${esc(draft(c, U.goal, U.lang))}</textarea><button class="pri" data-a="copy" style="width:100%;margin-top:8px">Copy to clipboard</button><a class="pri" style="display:block;text-align:center;margin-top:8px;padding:10px;border-radius:8px;text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/91${esc(c.phone.slice(-10))}?text=${encodeURIComponent(draft(c, U.goal, U.lang))}">Open in WhatsApp (you press send)</a></div>` : '<p class="empty">Choose a customer to generate a draft.</p>';
  }
  h += `<div class="acts" style="margin-top:14px"><button class="sm" data-a="reset">Reset demo data</button><button class="sm" data-a="empty">Start empty</button><button class="sm" data-a="csv">Export sales CSV</button><button class="sm" data-a="json">Backup (JSON)</button><button class="sm" data-a="imp">Restore backup</button><input type="file" id="imp" accept=".json" hidden></div>`;
  return h;
}

// -------------------------------------------------------------
// Test Execution Suite
// -------------------------------------------------------------
;(() => {
  let ok = 0;
  const t = (n, c) => {
    if (!c) throw new Error('FAIL: ' + n);
    ok++;
  };

  console.log('--- Running Baseline Smoke Tests ---');
  for (const tab of TABS) {
    U.tab = tab; U.wc = 'c2'; U.goal = 'pay';
    t('view ' + tab, view().length > 100);
  }
  U.tab = 'Overview'; t('udhaar kpi', view().includes('Udhaar pending'));
  const R = recs();
  t('udhaar rec', R.some(r => r.k === 'udhaar' && r.why && r.next));
  t('lapsed rec', R.some(r => r.k === 'lapsed'));

  const c2 = S.customers.find(c => c.id === 'c2');
  t('pay draft', draft(c2, 'pay', 'en').includes('pending') && draft(c2, 'pay', 'hi').includes('baaki'));

  U.tab = 'Writer'; U.wc = 'c2'; U.goal = 'winback';
  t('wa link', view().includes('wa.me/91'));

  U.tab = 'Customers';
  t('customer udhaar shown', view().includes('Udhaar \u20b9'));

  U.tab = 'Advisor';
  t('rules explainer', view().includes('How these rules work'));
  t('backup buttons', view().includes('Restore backup'));

  S.sales.find(s => s.paid === false).paid = true;
  t('mark paid reduces udhaar', recs().filter(r => r.k === 'udhaar').length === 1);

  for (let i = 0; i < 6; i++) {
    tourGo(i);
    t('tour ' + i, U.tour === i);
  }
  tourGo(6);
  t('tour end', U.tour === null);

  S = empty();
  for (const tab of TABS) {
    U.tab = tab;
    view();
  }
  t('empty state renders', true);

  console.log('--- Running Enhanced AI & FinTech Feature Tests ---');

  // Test 1: Bharat UPI QR Code SVG Generation
  const upiSvg = QRCode("upi://pay?pa=vyapaar.store@upi&pn=VyapaarStore&am=1200&cu=INR", 180);
  t('UPI QR SVG contains svg and rect', upiSvg.includes('<svg') && upiSvg.includes('<rect'));

  // Test 2: Voice Khatabook NLP Parser (Hinglish / Hindi Udhaar Sale)
  S = seed();
  const v1 = parseVoiceText("Ramesh ko 450 rupaye ka doodh udhaar");
  t('Voice parses amount', v1.amount === 450);
  t('Voice identifies category Dairy', v1.category === 'Dairy');
  t('Voice marks as Udhaar', v1.isUdhaar === true);
  t('Voice matches customer Ramesh', v1.customer && v1.customer.name.includes('Ramesh'));

  // Test 3: Voice Khatabook NLP Parser (Cash Sale)
  const v2 = parseVoiceText("Sunita 1200 snacks paid cash");
  t('Voice parses cash amount', v2.amount === 1200);
  t('Voice identifies category Snacks', v2.category === 'Snacks');
  t('Voice marks paid', v2.paid === true && v2.isUdhaar === false);

  // Test 4: Voice Khatabook NLP Parser (Expense)
  const v3 = parseVoiceText("Bijli ka bill 2200 dukaan kharcha");
  t('Voice identifies Expense', v3.isExpense === true);
  t('Voice identifies Electricity category', v3.category === 'Electricity');
  t('Voice parses expense amount', v3.amount === 2200);

  // Test 5: Multi-Language Dictionary
  U.lang = 'hi';
  t('Hindi title translated', I18N.hi.title.includes('व्यापार'));
  t('Hindi Udhaar label translated', I18N.hi.udhaarPending.includes('उधार बाकी'));
  U.lang = 'hn';
  t('Hinglish tagline translated', I18N.hn.tagline.includes('Smart dhandha'));
  U.lang = 'en';

  // Test 6: Settings Load & Store
  t('Default UPI ID configured', SETTINGS.upiId.includes('@upi'));
  t('Default Store Name configured', SETTINGS.shopName.length > 3);

  console.log('====================================');
  console.log('ALL SMOKE & INTEGRATION TESTS PASSED: ' + ok);
  console.log('====================================');
})();
