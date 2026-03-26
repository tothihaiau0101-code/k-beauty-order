/**
 * BeaPop Catalog Page
 * Handles product display, search, filtering, cart, and modals
 */

// ─── PRODUCT DETAIL DATA ───
const PRODUCT_DATA = {
  'cosrx-snail': {
    name: 'COSRX Advanced Snail 96 Mucin Power Essence',
    brand: 'COSRX', spec: '100ml',
    price: '420,000₫', oldPrice: '550,000₫',
    img: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&q=80&auto=format&fit=crop',
    desc: 'Tinh chất ốc sên chứa 96.3% Snail Secretion Filtrate giúp phục hồi da tổn thương, làm dịu và cấp ẩm sâu. Kết cấu mỏng nhẹ, thấm nhanh, không gây bết dính. Thích hợp mọi loại da, đặc biệt da khô và da mụn.',
    usage: 'Sau bước toner, lấy 2-3 giọt thoa đều lên toàn mặt. Vỗ nhẹ để tinh chất thẩm thấu. Dùng sáng và tối.',
    rating: 4.9, reviewCount: 234,
    reviews: [
      {name:'Hà My', stars:5, text:'Da mình hết khô sau 1 tuần dùng, thấm rất nhanh!'},
      {name:'Thu Trang', stars:5, text:'Dùng mấy năm rồi, repurchase hoài. Best serum!'},
      {name:'Minh Anh', stars:4, text:'Cấp ẩm tốt, hơi dính chút khi thời tiết nóng.'}
    ]
  },
  'boj-sun': {
    name: 'Beauty of Joseon Relief Sun SPF50+ PA++++',
    brand: 'BEAUTY OF JOSEON', spec: '50ml',
    price: '380,000₫', oldPrice: '500,000₫',
    img: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80&auto=format&fit=crop',
    desc: 'Kem chống nắng hóa học với chiết xuất gạo 30% và men vi sinh. Bảo vệ da khỏi UVA/UVB, đồng thời nuôi dưỡng da sáng khỏe. Finish tự nhiên, không bết trắng.',
    usage: 'Thoa đều lên mặt và cổ ở bước cuối cùng trước khi ra ngoài 15 phút. Thoa lại sau 2-3 giờ nếu ở ngoài trời.',
    rating: 4.8, reviewCount: 189,
    reviews: [
      {name:'Linh Chi', stars:5, text:'Không trắng vạch, lên da mịn như lót makeup!'},
      {name:'Ngọc Anh', stars:5, text:'Dùng dưới makeup rất đẹp, không bị vón.'},
      {name:'Phương', stars:4, text:'Hơi bóng sau vài giờ nhưng protect tốt.'}
    ]
  },
  'anua-toner': {
    name: 'Anua Heartleaf 77% Soothing Toner',
    brand: 'ANUA', spec: '250ml',
    price: '450,000₫', oldPrice: '600,000₫',
    img: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=600&q=80&auto=format&fit=crop',
    desc: 'Toner chứa 77% chiết xuất rau diếp cá. Làm dịu mụn sưng đỏ, cân bằng pH, kiểm soát bã nhờn. Phù hợp da dầu mụn và da nhạy cảm.',
    usage: 'Thấm ra bông cotton lau nhẹ toàn mặt, hoặc đổ ra tay vỗ trực tiếp. Có thể dùng làm lotion mask 3-5 phút.',
    rating: 4.7, reviewCount: 156,
    reviews: [
      {name:'Thảo', stars:5, text:'Mụn xẹp rõ ràng sau 3 ngày, quá xịn!'},
      {name:'Hương', stars:4, text:'Dịu nhẹ, không kích ứng da nhạy cảm.'},
      {name:'Mai', stars:5, text:'Chai to dùng được 3-4 tháng, worth it!'}
    ]
  },
  'torriden-serum': {
    name: 'Torriden Dive-In HA Serum', brand: 'TORRIDEN', spec: '50ml',
    price: '400,000₫', oldPrice: '520,000₫',
    img: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&q=80&auto=format&fit=crop',
    desc: 'Serum cấp nước đa tầng với 5 loại Hyaluronic Acid phân tử thấp. Giúp da ngậm nước, bóng khỏe từ bên trong.',
    usage: 'Lấy 2-3 giọt serum thoa đều lên da ẩm sau bước toner. Sử dụng sáng và tối.',
    rating: 4.8, reviewCount: 201,
    reviews: [
      {name:'Lan', stars:5, text:'Da căng mọng sau 2 tuần, giá rẻ mà chất!'},
      {name:'Vy', stars:5, text:'Cấp nước sâu nhưng không bết dính.'},
      {name:'Hoa', stars:4, text:'Thấm nhanh, dùng được cả sáng lẫn tối.'}
    ]
  },
  'skin1004': {
    name: 'SKIN1004 Madagascar Centella Ampoule', brand: 'SKIN1004', spec: '100ml',
    price: '420,000₫', oldPrice: '550,000₫',
    img: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b17?w=600&q=80&auto=format&fit=crop',
    desc: 'Tinh chất rau má Madagascar nguyên chất giúp phục hồi hàng rào da, làm dịu mụn viêm và giảm đỏ.',
    usage: 'Sau toner, lấy 2-3 giọt thoa đều hoặc dùng làm mask giấy 10-15 phút.',
    rating: 4.6, reviewCount: 98,
    reviews: [
      {name:'Yến', stars:5, text:'Dùng khi da bị kích ứng cực hiệu quả!'},
      {name:'Tú', stars:4, text:'Thành phần clean, yên tâm cho da nhạy cảm.'}
    ]
  },
  'mediheal': {
    name: 'Mediheal Madecassoside Blemish Pad', brand: 'MEDIHEAL', spec: '100 miếng',
    price: '300,000₫', oldPrice: '400,000₫',
    img: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=600&q=80&auto=format&fit=crop',
    desc: 'Pad tẩy da chết chứa Madecassoside từ rau má kết hợp BHA 0.45%. Thông thoáng lỗ chân lông, làm dịu mụn ẩn.',
    usage: 'Mặt gồ ghề lau nhẹ để tẩy da chết. Mặt mịn đắp lên da cần dưỡng 5-10 phút. 2-3 lần/tuần.',
    rating: 4.5, reviewCount: 112,
    reviews: [
      {name:'Ngân', stars:5, text:'Mụn ẩn bay hết sau 2 tuần dùng đều!'},
      {name:'Trâm', stars:4, text:'Tiện lắm, vừa tẩy da chết vừa dưỡng.'}
    ]
  },
  'roundlab': {
    name: 'Round Lab 1025 Dokdo Toner', brand: 'ROUND LAB', spec: '200ml',
    price: '380,000₫', oldPrice: '480,000₫',
    img: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&q=80&auto=format&fit=crop',
    desc: 'Toner nước biển sâu Dokdo chứa khoáng chất tự nhiên giúp cân bằng độ ẩm và pH da. Best-seller Olive Young 3 năm liền.',
    usage: 'Đổ ra bông cotton hoặc lòng bàn tay, vỗ nhẹ lên toàn mặt sau bước rửa mặt.',
    rating: 4.7, reviewCount: 178,
    reviews: [
      {name:'Diệu', stars:5, text:'Nhẹ nhàng, cấp ẩm tốt, da dầu dùng ok!'},
      {name:'Như', stars:5, text:'Best-seller có lý do, dùng xong da mềm mịn!'},
      {name:'Quỳnh', stars:4, text:'Chai to dùng lâu, giá hợp lý.'}
    ]
  },
  'romand': {
    name: 'Romand Juicy Lasting Tint', brand: 'ROMAND', spec: '5.5g',
    price: '250,000₫', oldPrice: '350,000₫',
    img: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=600&q=80&auto=format&fit=crop',
    desc: 'Son tint lì dạng nước với hiệu ứng lớp nước mỏng, bám màu bền suốt 8 giờ. Công thức dưỡng ẩm với HA.',
    usage: 'Thoa 1 lớp mỏng lên môi. Đợi 10 giây cho khô, thêm lớp thứ 2 nếu muốn đậm hơn.',
    rating: 4.8, reviewCount: 320,
    reviews: [
      {name:'Linh', stars:5, text:'Màu chuẩn, bám lâu, không khô môi!'},
      {name:'Thy', stars:5, text:'Đã mua 4 màu, màu nào cũng đẹp!'},
      {name:'Hạnh', stars:4, text:'Son đẹp nhưng hơi khó tẩy.'}
    ]
  },
  'txt-7th': {
    name: 'TXT — minisode 3: TOMORROW', brand: 'BIGHIT MUSIC', spec: '8th Mini Album',
    price: '500,000₫', oldPrice: '',
    img: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=600&q=80&auto=format&fit=crop',
    desc: 'Album comeback mới nhất của TOMORROW X TOGETHER. Order từ Ktown4u / Weverse.',
    usage: 'Pre-order — Hàng về sau 7-10 ngày kể từ ngày phát hành chính thức.',
    rating: 4.9, reviewCount: 89, reviews: []
  },
  'babymonster': {
    name: 'BABYMONSTER — BABYMONS7ER', brand: 'YG ENTERTAINMENT', spec: '1st Mini Album',
    price: '500,000₫', oldPrice: '',
    img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80&auto=format&fit=crop',
    desc: 'Mini album đầu tay của girlgroup thế hệ mới BABYMONSTER với 7 thành viên.',
    usage: 'Pre-order — Giao hàng dự kiến cuối tháng 4. Full nguyên seal.',
    rating: 4.7, reviewCount: 65, reviews: []
  },
  'combo-skincare': {
    name: 'Skincare Starter Combo', brand: 'BEAPOP', spec: '3 sản phẩm',
    price: '1,100,000₫', oldPrice: '1,290,000₫',
    img: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80&auto=format&fit=crop',
    desc: 'Combo: Round Lab Dokdo + Anua Heartleaf + BOJ SPF50+. Bộ 3 quy trình skincare chuẩn Hàn.',
    usage: 'Dùng theo thứ tự: Rửa mặt → Toner → Kem chống nắng.',
    rating: 4.9, reviewCount: 45, reviews: []
  },
  'combo-mix': {
    name: 'Mix Box K-Pop + K-Beauty', brand: 'BEAPOP', spec: '3 items',
    price: '950,000₫', oldPrice: '1,150,000₫',
    img: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80&auto=format&fit=crop',
    desc: 'Combo: 1 Album K-Pop + 1 Toner Pad Mediheal + 1 Son Romand. Tặng kèm POB.',
    usage: 'Combo quà tặng lý tưởng cho fan K-Pop & K-Beauty.',
    rating: 4.8, reviewCount: 33, reviews: []
  }
};

// Shopping cart state
let cart = JSON.parse(localStorage.getItem('kbeauty_cart')) || {};

const PRODUCT_NAMES = {
  'cosrx-snail':'COSRX Snail Mucin','boj-sun':'BOJ Relief Sun SPF50+',
  'anua-toner':'Anua Heartleaf Toner','torriden-serum':'Torriden HA Serum',
  'skin1004':'SKIN1004 Centella','mediheal':'Mediheal Blemish Pad',
  'roundlab':'Round Lab Dokdo Toner','romand':'Romand Juicy Tint',
  'txt-7th':'TXT — minisode 3','bts-arirang':'BTS — ARIRANG 5th Album',
  'babymonster':'BABYMONSTER Album','kol-comeback':'KISS OF LIFE — Comeback',
  'nct-wish':'NCT WISH — Full Album',
  'combo-skincare':'Combo Skincare','combo-mix':'Mix Box K-Pop+Beauty'
};

const PRODUCT_PRICES = {
  'cosrx-snail':420000,'boj-sun':380000,'anua-toner':450000,'torriden-serum':400000,
  'skin1004':420000,'mediheal':300000,'roundlab':380000,'romand':250000,
  'txt-7th':500000,'bts-arirang':500000,'babymonster':500000,
  'kol-comeback':500000,'nct-wish':500000,
  'combo-skincare':1100000,'combo-mix':950000
};

// ─── BANNER CAROUSEL ───
(function() {
  const c = document.getElementById('bannerCarousel');
  if (!c) return;
  const sl = c.querySelectorAll('.banner-slide');
  const dots = document.querySelectorAll('#bannerDots span');
  const ob = new IntersectionObserver(function(es) {
    es.forEach(function(e) {
      if (e.isIntersecting && e.intersectionRatio > 0.6) {
        sl.forEach(function(s) { s.classList.remove('center') });
        e.target.classList.add('center');
        const i = Array.from(sl).indexOf(e.target);
        dots.forEach(function(d, j) { d.style.background = j === i ? '#1a1a1a' : '#ccc' });
      }
    });
  }, { root: c, threshold: 0.6 });
  sl.forEach(function(s) { ob.observe(s) });
  window.scrollToBanner = function(i) {
    sl[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };
  // Center first banner on load
  sl[0].classList.add('center');
})();

/**
 * Update countdown timers for pre-order albums
 */
function updateCountdowns() {
  document.querySelectorAll('.countdown-bar[data-release]').forEach(bar => {
    const release = new Date(bar.dataset.release);
    const now = new Date();
    const diff = release - now;

    if (diff <= 0) {
      bar.innerHTML = '<span class="cd-label" style="color:var(--accent-green)">🎉 Đã phát hành!</span>';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    bar.querySelector('.cd-days').textContent = String(days).padStart(2, '0');
    bar.querySelector('.cd-hours').textContent = String(hours).padStart(2, '0');
    bar.querySelector('.cd-mins').textContent = String(mins).padStart(2, '0');
  });
}

/**
 * Generate star rating string
 */
function starStr(n) { return '⭐'.repeat(n) + '☆'.repeat(5 - n); }

/**
 * Open product detail modal
 */
function openProductModal(productId) {
  const data = PRODUCT_DATA[productId];
  if (!data) return;
  document.getElementById('modalImg').src = data.img;
  document.getElementById('modalBrand').textContent = data.brand;
  document.getElementById('modalName').textContent = data.name;
  document.getElementById('modalSpec').textContent = data.spec;
  document.getElementById('modalPrice').textContent = data.price;
  document.getElementById('modalOldPrice').textContent = data.oldPrice || '';
  document.getElementById('modalDesc').textContent = data.desc;
  document.getElementById('modalUsage').textContent = data.usage;
  document.getElementById('modalAddCartBtn').setAttribute('data-id', productId);
  document.getElementById('modalBuyNowBtn').href = 'order-form.html?select=' + productId;

  // Reviews
  const rv = document.getElementById('modalReviews');
  if (rv && data.rating) {
    let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:1.1rem;">${starStr(Math.round(data.rating))}</span><span style="color:#fbbf24;font-weight:700;">${data.rating}</span><span style="color:#9a9aaa;font-size:0.75rem;">(${data.reviewCount} đánh giá)</span></div>`;
    if (data.reviews && data.reviews.length) {
      html += data.reviews.map(r => `<div style="padding:6px 0;border-top:1px solid rgba(0,0,0,0.06);"><span style="font-weight:600;color:#1a1a1a;font-size:0.78rem;">${r.name}</span> <span style="font-size:0.72rem;">${starStr(r.stars)}</span><p style="color:#6b6b7b;font-size:0.78rem;margin:3px 0 0;">${r.text}</p></div>`).join('');
    }
    rv.innerHTML = html;
    rv.parentElement.style.display = '';
    // Set review link
    const reviewLink = document.getElementById('modalReviewLink');
    if (reviewLink) {
      reviewLink.href = `reviews.html?product=${productId}`;
    }
  } else if (rv) {
    rv.parentElement.style.display = 'none';
  }
  document.getElementById('productModal').style.display = 'flex';
}

/**
 * Close product detail modal
 */
function closeProductModal() {
  document.getElementById('productModal').style.display = 'none';
}

/**
 * Update cart UI
 */
function updateCartUI() {
  const count = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartEl = document.getElementById('floatingCart');
  const badgeEl = document.getElementById('cartBadge');
  const navBadgeEl = document.getElementById('navCartBadge');

  if (count > 0) {
    if (cartEl) cartEl.style.display = 'flex';
    if (badgeEl) badgeEl.textContent = count;
    if (navBadgeEl) { navBadgeEl.style.display = 'flex'; navBadgeEl.textContent = count; }
  } else {
    if (cartEl) cartEl.style.display = 'none';
    if (navBadgeEl) navBadgeEl.style.display = 'none';
  }

  // Render dropdown with qty controls
  const dd = document.getElementById('cartDropdownItems');
  const totalEl = document.getElementById('cartDropdownTotal');
  const totalAmountEl = document.getElementById('cartTotalAmount');

  if (dd) {
    const items = Object.entries(cart).filter(([,v]) => v > 0);
    if (items.length === 0) {
      dd.innerHTML = '<div class="cart-dropdown-empty">Giỏ hàng trống</div>';
      if (totalEl) totalEl.style.display = 'none';
    } else {
      let total = 0;
      dd.innerHTML = items.map(([id, qty]) => {
        const price = PRODUCT_PRICES[id] || 0;
        total += price * qty;
        return `<div class="cart-dropdown-item">
          <span class="cart-dropdown-item-name">${PRODUCT_NAMES[id]||id}</span>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
            <button onclick="cartQty('${id}',-1)" class="cart-qty-btn" style="width:26px;height:26px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);background:#f5f5f5;cursor:pointer;font-size:0.95rem;font-weight:700;color:#1a1a1a;display:flex;align-items:center;justify-content:center;line-height:1;transition:all 0.15s;" onmouseover="this.style.background='#e8e8e8'" onmouseout="this.style.background='#f5f5f5'">−</button>
            <span style="min-width:24px;text-align:center;font-size:0.85rem;font-weight:700;color:#1a1a1a;">${qty}</span>
            <button onclick="cartQty('${id}',1)" class="cart-qty-btn" style="width:26px;height:26px;border-radius:6px;border:1px solid rgba(0,0,0,0.12);background:#f5f5f5;cursor:pointer;font-size:0.95rem;font-weight:700;color:#1a1a1a;display:flex;align-items:center;justify-content:center;line-height:1;transition:all 0.15s;" onmouseover="this.style.background='#e8e8e8'" onmouseout="this.style.background='#f5f5f5'">+</button>
            <button onclick="cartRemove('${id}')" style="width:26px;height:26px;border-radius:6px;border:none;background:rgba(220,38,38,0.1);cursor:pointer;font-size:0.8rem;color:#dc2626;display:flex;align-items:center;justify-content:center;transition:all 0.15s;" onmouseover="this.style.background='rgba(220,38,38,0.18)'" onmouseout="this.style.background='rgba(220,38,38,0.1)'">✕</button>
          </div>
        </div>`;
      }).join('');
      if (totalEl && totalAmountEl) {
        totalAmountEl.textContent = total.toLocaleString('vi') + '₫';
        totalEl.style.display = 'flex';
      }
    }
  }
}

/**
 * Change cart item quantity
 */
function cartQty(id, delta) {
  cart[id] = Math.max(0, (cart[id] || 0) + delta);
  if (cart[id] === 0) delete cart[id];
  localStorage.setItem('kbeauty_cart', JSON.stringify(cart));
  updateCartUI();
}

/**
 * Remove item from cart
 */
function cartRemove(id) {
  delete cart[id];
  localStorage.setItem('kbeauty_cart', JSON.stringify(cart));
  updateCartUI();
}

/**
 * Toggle cart dropdown
 */
function toggleCartDropdown(e) {
  e.stopPropagation();
  const dd = document.getElementById('cartDropdown');
  dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
}

/**
 * Show toast notification
 */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

/**
 * Filter products by search query
 */
function filterProducts() {
  const q = document.getElementById('catalogSearch').value.toLowerCase().trim();
  document.querySelectorAll('.product-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    card.style.display = text.includes(q) ? '' : 'none';
  });
  // Hide entire sections if no visible cards
  document.querySelectorAll('.section').forEach(sec => {
    const visibleCards = sec.querySelectorAll('.product-card:not([style*="display: none"])');
    sec.style.display = (q && visibleCards.length === 0) ? 'none' : '';
  });
}

/**
 * Filter products by category
 */
function filterCategory(cat) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.filter-btn[data-cat="${cat}"]`).classList.add('active');
  const sectionMap = { skincare:'k-beauty', makeup:'k-beauty', album:'k-pop', combo:'combos' };

  if (cat === 'all') {
    document.querySelectorAll('.section').forEach(s => s.style.display = '');
    document.querySelectorAll('.product-card').forEach(c => c.style.display = '');
  } else {
    document.querySelectorAll('.section').forEach(s => {
      s.style.display = s.id === sectionMap[cat] ? '' : 'none';
    });
    if (cat === 'skincare') {
      document.querySelectorAll('#k-beauty .product-card').forEach(c => {
        c.style.display = c.querySelector('h3')?.textContent.includes('Tint') ? 'none' : '';
      });
    } else if (cat === 'makeup') {
      document.querySelectorAll('#k-beauty .product-card').forEach(c => {
        c.style.display = c.querySelector('h3')?.textContent.includes('Tint') ? '' : 'none';
      });
    }
  }
}

/**
 * Modal add to cart
 */
function modalAddToCart() {
  const btn = document.getElementById('modalAddCartBtn');
  const id = btn ? btn.getAttribute('data-id') : null;
  if (!id) return;
  cart[id] = (cart[id] || 0) + 1;
  localStorage.setItem('kbeauty_cart', JSON.stringify(cart));
  updateCartUI();
  showToast('🛍️ Đã thêm vào giỏ hàng!');
  closeProductModal();
}

// ─── INITIALIZATION ───
document.addEventListener('DOMContentLoaded', () => {
  // Update countdowns
  updateCountdowns();
  setInterval(updateCountdowns, 60000);

  // Update cart UI
  updateCartUI();

  // Auth state check
  const navAuth = document.getElementById('navAuth');
  const navAccount = document.getElementById('navAccount');
  const token = localStorage.getItem('customerToken');
  const user = JSON.parse(localStorage.getItem('customerUser') || '{}');

  if (token && user.name) {
    if (navAuth) navAuth.style.display = 'none';
    if (navAccount) {
      navAccount.style.display = 'block';
      navAccount.textContent = '👤 ' + user.name.split(' ').pop();
    }
  } else {
    if (navAuth) navAuth.style.display = 'block';
    if (navAccount) navAccount.style.display = 'none';
  }

  // Stock sync
  const STOCK_MAP = {
    'cosrx-snail': 'KB001', 'boj-sun': 'KB002', 'anua-toner': 'KB003',
    'torriden-serum': 'KB004', 'skin1004': 'KB005', 'mediheal': 'KB006',
    'roundlab': 'KB007', 'romand': 'KB008'
  };

  const _API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : (document.querySelector('meta[name="api-url"]')?.content || 'https://beapop-api.beapop.workers.dev');

  const _orderBtns = document.querySelectorAll('.btn-order');
  _orderBtns.forEach(b => b.setAttribute('data-orig', b.textContent));

  fetch(_API + '/api/inventory')
    .then(r => { if (!r.ok) throw new Error('inventory_err'); return r.json(); })
    .then(data => {
      const stockById = {};
      const items = data.inventory || data;
      items.forEach(s => stockById[s.id] = s.stock);
      document.querySelectorAll('.btn-order').forEach(btn => {
        btn.textContent = btn.getAttribute('data-orig') || btn.textContent;
        const href = btn.getAttribute('href') || '';
        const m = href.match(/select=([^&]+)/);
        if (!m) return;
        const stockId = STOCK_MAP[m[1]];
        if (stockId == null) return;
        const qty = stockById[stockId];
        const card = btn.closest('.product-card');
        if (qty === 0) {
          btn.textContent = 'Hết hàng';
          btn.style.cssText = 'pointer-events:none;opacity:0.4;background:#555;';
          if (card) {
            const badge = card.querySelector('.card-badge');
            if (badge) { badge.textContent = 'Hết hàng'; badge.style.background = '#ef4444'; }
            else { const b = document.createElement('span'); b.className = 'card-badge'; b.textContent = 'Hết hàng'; b.style.background = '#ef4444'; card.prepend(b); }
          }
        } else if (qty != null && qty <= 2 && card) {
          const existing = card.querySelector('.card-badge');
          if (!existing) { const b = document.createElement('span'); b.className = 'card-badge'; b.textContent = `Còn ${qty} sp`; b.style.background = '#eab308'; card.prepend(b); }
        }
      });
    })
    .catch(() => {
      document.querySelectorAll('.btn-order').forEach(b => {
        b.textContent = b.getAttribute('data-orig') || b.textContent;
      });
      if (window.BeaUI) BeaUI.ErrorBoundary.show('Không thể tải thông tin tồn kho', 'info', 3000);
    });

  // Smooth scroll navigation
  document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // Active nav on scroll
  const sections = document.querySelectorAll('.section[id]');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 100;
      if (window.scrollY >= top) current = section.id;
    });
    document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  });

  // Card click to open modal
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-order');
      if (btn) return;
      const link = card.querySelector('.btn-order');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      const match = href.match(/select=([^&]+)/);
      if (match) {
        e.preventDefault();
        openProductModal(match[1]);
      }
    });
  });

  // Btn-order click handler
  document.querySelectorAll('.btn-order').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn.textContent === 'Hết hàng' || btn.style.pointerEvents === 'none') {
        e.preventDefault();
      }
      e.stopPropagation();
    });
  });

  // Btn-add-cart click handler
  document.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      if (!id) return;
      cart[id] = (cart[id] || 0) + 1;
      localStorage.setItem('kbeauty_cart', JSON.stringify(cart));
      updateCartUI();
      showToast('🛍️ Đã thêm vào giỏ hàng!');
      btn.style.transform = 'scale(0.92)';
      setTimeout(() => btn.style.transform = '', 200);
    });
  });

  // Close cart dropdown when clicking outside
  document.addEventListener('click', () => {
    const dd = document.getElementById('cartDropdown');
    if (dd) dd.style.display = 'none';
  });
  document.getElementById('cartDropdown')?.addEventListener('click', e => e.stopPropagation());

  // Scroll reveal (Intersection Observer)
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
    revealObserver.observe(el);
  });
});

// Make functions globally available
window.openProductModal = openProductModal;
window.closeProductModal = closeProductModal;
window.cartQty = cartQty;
window.cartRemove = cartRemove;
window.toggleCartDropdown = toggleCartDropdown;
window.filterProducts = filterProducts;
window.filterCategory = filterCategory;
window.modalAddToCart = modalAddToCart;
window.scrollToBanner = window.scrollToBanner || function(i) {};
