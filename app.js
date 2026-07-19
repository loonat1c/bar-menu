import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
    import { getFirestore, collection, onSnapshot, query } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
    import { firebaseConfig } from "./firebase-config.js";

    const app = initializeApp(firebaseConfig);
    const db  = getFirestore(app);

    let allDrinks  = [];
    let currentCat = 'all';

    // orderBy убран — требует составной индекс в Firestore если поле не у всех заполнено
    const q = query(collection(db, 'cocktails'));
    // Таймаут — если Firebase не ответил за 6 сек, скрываем лоадер
    const loaderTimeout = setTimeout(() => {
      document.getElementById('loader').classList.add('hidden');
      document.getElementById('cocktailGrid').innerHTML =
        '<div class="empty-state"><div class="icon">⚓</div><p>Could not connect. Check your internet connection and reload.</p></div>';
    }, 6000);

    onSnapshot(q, snap => {
      clearTimeout(loaderTimeout);
      allDrinks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      buildCategories();
      renderGrid();
      document.getElementById('loader').classList.add('hidden');
    }, (err) => {
      clearTimeout(loaderTimeout);
      console.error('Firebase error:', err);
      document.getElementById('loader').classList.add('hidden');
      document.getElementById('cocktailGrid').innerHTML =
        '<div class="empty-state"><div class="icon">⚓</div><p>Error: ' + err.message + '</p></div>';
    });

    const CAT_ORDER = ['Specials', 'Sodas', 'Cocktails', 'Virgin Cocktails', 'Beer', 'Wine', 'Spirits'];

    function buildCategories() {
      const found = [...new Set(allDrinks.map(d => d.category).filter(Boolean))];
      const sorted = [...CAT_ORDER.filter(c => found.includes(c)), ...found.filter(c => !CAT_ORDER.includes(c))];
      const cats = ['all', ...sorted];
      const scroll = document.getElementById('filterScroll');
      scroll.innerHTML = '';
      scroll.classList.toggle('scrollable', cats.length > 4);
      cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn' + (cat === currentCat ? ' active' : '');
        btn.dataset.cat = cat;
        btn.textContent = cat === 'all' ? 'All' : cat;
        btn.onclick = () => {
          currentCat = cat;
          scroll.querySelectorAll('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
          renderGrid();
        };
        scroll.appendChild(btn);
      });
    }

    function renderGrid() {
      const grid = document.getElementById('cocktailGrid');
      const filtered = currentCat === 'all'
        ? allDrinks
        : allDrinks.filter(d => d.category === currentCat);

      if (!filtered.length) {
        grid.innerHTML = '<div class="empty-state"><div class="icon">🍹</div><p>No cocktails available right now</p></div>';
        return;
      }

      grid.innerHTML = '';
      filtered.forEach((drink, i) => {
        const card = document.createElement('div');
        card.className = 'cocktail-card' + (drink.available === false ? ' unavailable' : '');
        card.style.animationDelay = (i * 55) + 'ms';

        const imgHtml = drink.imageUrl
          ? '<img src="' + drink.imageUrl + '" alt="' + drink.name + '" loading="lazy" />'
          : '<div class="card-img-placeholder">🍸</div>';

        const badge = drink.available === false
          ? '<div class="unavailable-badge"><span>Unavailable</span></div>'
          : '';

        const bottlePriceCard = drink.priceBottle
          ? '<div class="card-price-bottle">Bottle $' + drink.priceBottle + '</div>' : '';
        card.innerHTML =
          '<div class="card-img-wrap">' + imgHtml + badge + '</div>' +
          '<div class="card-body">' +
            '<div class="card-name">' + drink.name + '</div>' +
            '<div class="card-volume">' + (drink.volume || '') + '</div>' +
            '<div class="card-price">$' + drink.price + '</div>' +
            bottlePriceCard +
          '</div>';

        card.onclick = () => openModal(drink);
        grid.appendChild(card);
      });
    }

    function openModal(drink) {
      const overlay = document.getElementById('modalOverlay');
      const body    = document.getElementById('modalBody');

      const closeBtnHtml = '<button class="modal-close-btn" id="modalCloseBtn" aria-label="Close">✕</button>';
      const imgHtml = drink.imageUrl
        ? '<div class="modal-img-wrap">' + closeBtnHtml + '<img class="modal-img" src="' + drink.imageUrl + '" alt="' + drink.name + '" /></div>'
        : '<div class="modal-img-placeholder" style="position:relative;">' + closeBtnHtml + '🍸</div>';

      const descHtml = drink.description
        ? '<div class="modal-divider"></div><div class="modal-description">' + drink.description + '</div>'
        : '';

      const allergensHtml = (drink.allergens && drink.allergens.length)
        ? '<div class="modal-section-label">Allergens</div>' +
          '<div class="allergen-tags">' + drink.allergens.map(function(a) { return '<span class="allergen-tag">' + a + '</span>'; }).join('') + '</div>'
        : '';

      const unavailableNote = drink.available === false
        ? '<div class="unavailable-note">Currently unavailable</div>' : '';

      const priceBottleHtml = drink.priceBottle
        ? '<div class="modal-price-bottle"><span class="price-label">bottle</span>$' + drink.priceBottle + '</div>' : '';

      const volumeHtml = drink.volume
        ? '<span class="modal-volume">' + drink.volume + '</span>' : '';

      const volumeBottleHtml = drink.volumeBottle
        ? '<span class="modal-volume">' + drink.volumeBottle + ' btl</span>' : '';

      const catBadgeHtml = drink.category
        ? '<span class="modal-cat-badge">' + drink.category + '</span>' : '';

      const spiritsHtml = drink.category === 'Spirits'
        ? '<div class="modal-section-label">Serving options</div>' +
          '<div class="spirits-options">' +
            '<div class="spirit-opt"><span>On the Rocks</span><span class="spirit-price">$12</span></div>' +
            '<div class="spirit-opt"><span>Neat</span><span class="spirit-price">$12</span></div>' +
            '<div class="spirit-opt"><span>Shot</span><span class="spirit-price">$10</span></div>' +
            '<div class="spirit-opt"><span>Mix</span><span class="spirit-price">$14</span></div>' +
            '<div class="spirit-opt"><span>Double</span><span class="spirit-price">$18</span></div>' +
          '</div>' : '';

      body.innerHTML =
        imgHtml +
        '<div class="modal-content">' +
          '<div class="modal-top-row">' +
            '<div class="modal-name">' + drink.name + '</div>' +
            '<div class="modal-price-wrap">' +
              '<div class="modal-price"><span class="price-label">glass</span>$' + drink.price + '</div>' +
              priceBottleHtml +
            '</div>' +
          '</div>' +
          '<div class="modal-meta">' + volumeHtml + volumeBottleHtml + catBadgeHtml + '</div>' +
          descHtml +
          '<div class="modal-section-label">Ingredients</div>' +
          '<div class="modal-ingredients">' + (drink.ingredients || '—') + '</div>' +
          allergensHtml +
          spiritsHtml +
          unavailableNote +
        '</div>';

      openModalOverlay();
      document.getElementById('modal').scrollTop = 0;
    }

    // ── Close modal ──────────────────────────────────────────
    let modalOpen = false;

    function openModalOverlay() {
      document.getElementById('modalOverlay').classList.add('open');
      if (!modalOpen) {
        history.pushState({ modal: true }, '');
        modalOpen = true;
      }
    }

    function closeModal() {
      document.getElementById('modalOverlay').classList.remove('open');
      modalOpen = false;
    }

    // Кнопка ✕ — делегирование, т.к. кнопка пересоздаётся при каждом открытии
    document.getElementById('modal').addEventListener('click', e => {
      if (e.target.closest('#modalCloseBtn')) {
        if (modalOpen) history.back();
        else closeModal();
      }
    });

    // Тап по overlay
    document.getElementById('modalOverlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) {
        if (modalOpen) history.back();
        else closeModal();
      }
    });

    // Кнопка «Назад» в браузере/жест
    window.addEventListener('popstate', e => {
      if (document.getElementById('modalOverlay').classList.contains('open')) {
        closeModal();
      }
    });

    // Свайп вниз
    let startY = 0;
    document.getElementById('modal').addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
    }, { passive: true });
    document.getElementById('modal').addEventListener('touchend', e => {
      if (e.changedTouches[0].clientY - startY > 80) {
        if (modalOpen) history.back();
        else closeModal();
      }
    }, { passive: true });
