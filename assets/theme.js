document.addEventListener('DOMContentLoaded', function () {
  // Header: transparent -> solid on scroll
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) header.classList.add('solid'); else header.classList.remove('solid');
  });

  // Simple fade-in on scroll
  const faders = document.querySelectorAll('.fade-in');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target) } });
  }, { threshold: .12 });
  faders.forEach(f => io.observe(f));

  // Mobile menu toggle
  const mbBtn = document.querySelector('.mobile-menu-btn');
  if (mbBtn) { mbBtn.addEventListener('click', () => { document.body.classList.toggle('mobile-menu-open') }) }
  // Close mobile menu when clicking outside or on nav link
  document.addEventListener('click', (e) => {
    const header = document.querySelector('.site-header');
    const menuOpen = document.body.classList.contains('mobile-menu-open');
    if (!menuOpen) return;
    const insideHeader = header && header.contains(e.target);
    if (!insideHeader) { document.body.classList.remove('mobile-menu-open'); }
  });
  document.querySelectorAll('.main-nav a').forEach(a => a.addEventListener('click', () => { document.body.classList.remove('mobile-menu-open') }));

  // Update aria-expanded and aria-hidden when toggling menu
  const mainNav = document.getElementById('main-navigation');
  if (mbBtn && mainNav) {
    const setMenuState = (open) => {
      mbBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      mainNav.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    // initialize
    setMenuState(false);
    mbBtn.addEventListener('click', () => { setMenuState(document.body.classList.contains('mobile-menu-open')) });
    // when closed by outside click
    document.addEventListener('click', (e) => { if (!mainNav.contains(e.target) && !mbBtn.contains(e.target)) setMenuState(false) });
    // when link clicked
    document.querySelectorAll('#main-navigation a').forEach(a => a.addEventListener('click', () => setMenuState(false)));
  }
});

// Cart Drawer Logic
document.addEventListener('DOMContentLoaded', function () {
  const overlay = document.getElementById('cart-drawer-overlay');

  window.openCartDrawer = function () {
    document.body.classList.add('cart-drawer-open');
    overlay.classList.add('active');
    if (typeof loadCartRecommendations === 'function') {
      loadCartRecommendations();
    }
  };

  window.closeCartDrawer = function () {
    document.body.classList.remove('cart-drawer-open');
    overlay.classList.remove('active');
  };

  window.refreshCartDrawer = function () {
    fetch('/?section_id=cart-drawer')
      .then(res => res.text())
      .then(html => {
        const div = document.createElement('div');
        div.innerHTML = html;
        const newDrawer = div.querySelector('.cart-drawer-inner');
        const oldDrawer = document.querySelector('.cart-drawer-inner');
        if (newDrawer && oldDrawer) {
          oldDrawer.innerHTML = newDrawer.innerHTML;
          bindCartDrawerInnerEvents();
          if (typeof loadCartRecommendations === 'function') {
            loadCartRecommendations();
          }
        }
      });

    // Update cart badge
    fetch('/cart.js')
      .then(res => res.json())
      .then(cart => {
        const badge = document.querySelector('.cart-count-badge');
        if (badge) {
          badge.textContent = cart.item_count;
          if (cart.item_count > 0) {
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }
      })
      .catch(err => console.error('Erro ao atualizar badge:', err));
  };

  function updateQuantity(key, qty) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    })
      .then(res => res.json())
      .then(data => {
        refreshCartDrawer();
      })
      .catch(err => console.error(err));
  }

  function loadCartRecommendations() {
    const container = document.querySelector('.cart-drawer__recommendations');
    if (!container) return;

    const productId = container.dataset.productId;
    const colorRaw = container.dataset.color || '';
    const prodType = (container.dataset.type || '').toLowerCase();
    const prodTags = (container.dataset.tags || '').toLowerCase();
    if (!productId) return;

    let cleanColor = colorRaw.split('/')[0].split('-')[0].trim();
    
    let typeQuery = '';
    const matchType = prodType + " " + prodTags;
    if (matchType.includes('vestido') || matchType.includes('dress')) {
      typeQuery = 'product_type:Calçado OR product_type:Malas OR product_type:Bijuteria OR product_type:Sapatos OR product_type:Relógios';
    } else if (matchType.includes('shirt') || matchType.includes('top') || matchType.includes('camisa') || matchType.includes('casaco')) {
      typeQuery = 'product_type:Calças OR product_type:Calções OR product_type:Calçado OR product_type:Sapatos';
    } else if (matchType.includes('calça') || matchType.includes('jeans') || matchType.includes('bottom') || matchType.includes('short')) {
      typeQuery = 'product_type:T-Shirts OR product_type:Camisas OR product_type:Calçado OR product_type:Sapatos';
    } else if (matchType.includes('sapatos') || matchType.includes('calçado') || matchType.includes('shoes')) {
      typeQuery = 'product_type:Malas OR product_type:Bijuteria OR product_type:Acessórios';
    } else if (matchType.includes('bijuteria') || matchType.includes('relógios') || matchType.includes('jewelry')) {
      typeQuery = 'product_type:Vestidos OR product_type:T-Shirts';
    }

    // Pipeline de pesquisas:
    // 1. Cor + Tipo
    // 2. Só Tipo
    // 3. Padrão do Shopify
    let currentStep = parseInt(container.dataset.step || '1', 10);
    
    let fetchUrl = `/recommendations/products.json?product_id=${productId}&limit=6`;
    
    if (currentStep === 1 && cleanColor !== '' && typeQuery !== '') {
      fetchUrl = `/search/suggest.json?q=${encodeURIComponent(cleanColor + ' (' + typeQuery + ')')}&resources[type]=product&resources[limit]=6`;
    } else if (currentStep <= 2 && typeQuery !== '') {
      currentStep = 2;
      fetchUrl = `/search/suggest.json?q=${encodeURIComponent(typeQuery)}&resources[type]=product&resources[limit]=6`;
    } else {
      currentStep = 3;
    }

    container.dataset.step = currentStep;

    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(data => {
        let products = [];
        if (data.products) {
          products = data.products;
        } else if (data.resources && data.resources.results && data.resources.results.products) {
          products = data.resources.results.products;
          products = products.slice(0, 6);
        }

        const currentContainer = document.querySelector('.cart-drawer__recommendations');
        if (!currentContainer || currentContainer.dataset.productId !== productId) return;

        if (products.length > 0) {
          const list = currentContainer.querySelector('.cart-drawer__recommendations-list');
          if (list) {
            let html = '';
            products.forEach(product => {
              const image = (product.featured_image && typeof product.featured_image === 'object') ? product.featured_image.url : (product.featured_image || product.image || '');
              const priceVal = product.price !== undefined ? (typeof product.price === 'string' ? parseFloat(product.price.replace(/[^0-9.]/g,'')) : product.price / 100) : 0;
              const priceStr = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(priceVal);
              
              const actionHtml = `<a href="${product.url}" class="cart-recommendation-item__add" data-i18n="cart_view_prod">Ver Produto</a>`;

              html += `
                <div class="cart-recommendation-item">
                  <a href="${product.url}" class="cart-recommendation-item__image">
                    <img src="${image}" alt="${product.title}">
                  </a>
                  <div class="cart-recommendation-item__details">
                    <a href="${product.url}" class="cart-recommendation-item__title">${product.title}</a>
                    <div class="cart-recommendation-item__price">${priceStr}</div>
                    ${actionHtml}
                  </div>
                </div>
              `;
            });

            list.innerHTML = html;

            if (typeof applyTranslations === 'function') {
              applyTranslations();
            }
          }
        } else {
          // Fallback para o próximo passo
          if (currentStep < 3) {
            currentContainer.dataset.step = currentStep + 1;
            loadCartRecommendations();
          } else {
            currentContainer.style.display = 'none';
          }
        }
      })
      .catch(err => {
        console.error('Erro ao carregar:', err);
        const currentContainer = document.querySelector('.cart-drawer__recommendations');
        if (currentContainer) currentContainer.style.display = 'none';
      });
  }

  function bindCartDrawerInnerEvents() {
    // Close button
    const closeBtn = document.querySelector('.cart-drawer__close');
    if (closeBtn) closeBtn.addEventListener('click', closeCartDrawer);

    // Continue shopping button
    const continueBtn = document.querySelector('.cart-drawer__continue');
    if (continueBtn) continueBtn.addEventListener('click', closeCartDrawer);

    // Quantity buttons
    document.querySelectorAll('.cart-drawer-item__quantity .qty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        const qty = parseInt(e.target.dataset.qty, 10);
        updateQuantity(key, qty);
      });
    });

    // Remove item
    document.querySelectorAll('.cart-drawer-item__remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        updateQuantity(key, 0);
      });
    });
  }

  // Global event bindings (only run once)
  if (overlay) overlay.addEventListener('click', closeCartDrawer);

  document.addEventListener('click', (e) => {
    // Check if the clicked element or its parent is the cart icon
    const cartIcon = e.target.closest('.icon--cart');
    if (cartIcon) {
      e.preventDefault();
      openCartDrawer();
    }
  });

  // Initial binding for inner elements
  bindCartDrawerInnerEvents();
});

document.addEventListener('DOMContentLoaded', function () {
  const mainGallery = document.querySelector('.product-gallery-splide');
  const thumbGallery = document.querySelector('.product-gallery-thumbnails');

  if (mainGallery) {
    let isProgrammaticMove = false;
    let mainSplide = null;
    let thumbSplide = null;
    let variantTerms = [];
    let variantImageIds = [];
    let selectedVariantImageId = null;
    const productTitleTerms = normalizeGalleryText(mainGallery.dataset.productTitle).split(' ').filter(Boolean);

    const mainList = mainGallery.querySelector('.splide__list');
    const thumbList = thumbGallery && thumbGallery.querySelector('.splide__list');
    const allMainSlides = mainList ? Array.from(mainList.children).map(slide => slide.cloneNode(true)) : [];
    const allThumbSlides = thumbList ? Array.from(thumbList.children).map(slide => slide.cloneNode(true)) : [];

    function normalizeGalleryText(value) {
      return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }

    function slideMatchesVariant(slide, selectedTerms) {
      const alt = normalizeGalleryText(slide.dataset.imageAlt);
      const imageId = slide.dataset.imageId;

      if (imageId && variantImageIds.includes(String(imageId))) {
        return String(imageId) === selectedVariantImageId;
      }

      if (!alt) return true;

      const matchesSelectedVariant = selectedTerms.some(term => term && alt.includes(term));
      if (matchesSelectedVariant) return true;

      const isVariantSpecific = variantTerms.some(term => term && alt.includes(term));
      return !isVariantSpecific;
    }

    function getVariantImageId(variant) {
      if (!variant) return null;

      if (variant.featured_image && variant.featured_image.id) return variant.featured_image.id;
      if (variant.featured_media && variant.featured_media.id) return variant.featured_media.id;
      if (variant.image && variant.image.id) return variant.image.id;

      return null;
    }

    function getVariantTerms(variant) {
      const terms = [];

      ['title', 'option1', 'option2', 'option3'].forEach(key => {
        const term = normalizeGalleryText(variant[key]);
        if (!term || term === 'default title') return;

        terms.push(term);
        term.split(' ').forEach(word => {
          if (word.length >= 3 && !productTitleTerms.includes(word)) {
            terms.push(word);
          }
        });
      });

      return Array.from(new Set(terms));
    }

    function mountGallery() {
      mainSplide = new Splide(mainGallery, {
        type: 'fade',
        rewind: true,
        pagination: false,
        arrows: true,
      });

      if (thumbGallery) {
        thumbSplide = new Splide(thumbGallery, {
          fixedWidth: 88,
          fixedHeight: 88,
          gap: 15,
          rewind: true,
          pagination: false,
          isNavigation: true,
          arrows: false,
          focus: 'center',
          breakpoints: {
            600: {
              fixedWidth: 60,
              fixedHeight: 60,
            }
          }
        });
        mainSplide.sync(thumbSplide);
        mainSplide.mount();
        thumbSplide.mount();
      } else {
        mainSplide.mount();
      }

      mainSplide.on('moved', function (newIndex) {
        if (isProgrammaticMove) {
          isProgrammaticMove = false;
          return;
        }

        const slide = mainGallery.querySelectorAll('.splide__slide')[newIndex];
        const imageId = slide && slide.dataset.imageId;

        if (imageId) {
          window.dispatchEvent(new CustomEvent('leBordeu:galleryImageChange', {
            detail: { imageId }
          }));
        }
      });
    }

    function renderSlides(selectedTerms = []) {
      if (!mainList) return;

      const filteredMainSlides = allMainSlides.filter(slide => slideMatchesVariant(slide, selectedTerms));
      const filteredThumbSlides = allThumbSlides.filter(slide => slideMatchesVariant(slide, selectedTerms));
      const nextMainSlides = filteredMainSlides.length ? filteredMainSlides : allMainSlides;
      const nextThumbSlides = filteredThumbSlides.length ? filteredThumbSlides : allThumbSlides;

      if (mainSplide) mainSplide.destroy(true);
      if (thumbSplide) thumbSplide.destroy(true);

      mainList.innerHTML = '';
      nextMainSlides.forEach(slide => mainList.appendChild(slide.cloneNode(true)));

      if (thumbList) {
        thumbList.innerHTML = '';
        nextThumbSlides.forEach(slide => thumbList.appendChild(slide.cloneNode(true)));
      }

      mountGallery();
    }

    renderSlides();

    window.LeBordeuProductGallery = {
      configureVariantTerms(variants) {
        const terms = [];

        variants.forEach(variant => {
          terms.push(...getVariantTerms(variant));

          const imageId = getVariantImageId(variant);
          if (imageId) variantImageIds.push(String(imageId));
        });

        variantTerms = Array.from(new Set(terms)).sort((a, b) => b.length - a.length);
        variantImageIds = Array.from(new Set(variantImageIds));
      },
      filterByVariant(variant) {
        if (!variant) return;

        const imageId = getVariantImageId(variant);
        selectedVariantImageId = imageId ? String(imageId) : null;

        const selectedTerms = getVariantTerms(variant).sort((a, b) => b.length - a.length);

        renderSlides(selectedTerms);
      },
      goToImageId(imageId) {
        if (!imageId || !mainSplide) return false;

        const targetId = String(imageId);
        const slides = Array.from(mainGallery.querySelectorAll('.splide__slide'));
        const slideIndex = slides.findIndex(slide => slide.dataset.imageId === targetId);

        if (slideIndex === -1) return false;
        if (slideIndex === mainSplide.index) return true;

        isProgrammaticMove = true;
        mainSplide.go(slideIndex);
        return true;
      }
    };
  }

  // Lightbox Logic
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = document.querySelector('.lightbox__img');
  const lightboxClose = document.querySelector('.lightbox__close');

  if (lightbox && lightboxImg && lightboxClose) {
    mainGallery && mainGallery.addEventListener('click', function (event) {
      const clickedImage = event.target.closest('.product-gallery-splide .gallery__image img');
      if (!clickedImage) return;

      const fullSrc = clickedImage.getAttribute('data-full');
      if (fullSrc) {
        lightboxImg.src = fullSrc;
        lightbox.setAttribute('aria-hidden', 'false');
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    });

    document.querySelectorAll('.product-gallery-splide .gallery__image img').forEach(img => {
      img.style.cursor = 'zoom-in';
    });

    const closeLightbox = () => {
      lightbox.setAttribute('aria-hidden', 'true');
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
      setTimeout(() => { lightboxImg.src = ''; }, 300);
    };

    lightboxClose.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
    });
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const filterForm = document.getElementById('CollectionFiltersForm');
  if (filterForm) {
    const applyFilters = () => {
      // Get selected custom tags
      const checkedTags = Array.from(filterForm.querySelectorAll('.custom-tag-checkbox:checked')).map(cb => cb.value);

      // Determine base collection handle
      let pathParts = window.location.pathname.split('/').filter(Boolean);
      let collectionIndex = pathParts.indexOf('collections');
      let collectionHandle = pathParts[collectionIndex + 1] || 'all';

      let newPath = `/collections/${collectionHandle}`;
      if (checkedTags.length > 0) {
        newPath += '/' + checkedTags.join('+');
      }

      // Build query string for price inputs
      const urlParams = new URLSearchParams();
      const minPrice = filterForm.querySelector('input[name*="price.gte"]');
      const maxPrice = filterForm.querySelector('input[name*="price.lte"]');

      if (minPrice && minPrice.value) urlParams.set(minPrice.name, minPrice.value);
      if (maxPrice && maxPrice.value) urlParams.set(maxPrice.name, maxPrice.value);

      const queryString = urlParams.toString();
      const finalUrl = newPath + (queryString ? '?' + queryString : '');

      const grid = document.querySelector('.products-grid');
      const count = document.querySelector('.collection-count');
      const main = document.querySelector('.collection-main');

      if (grid) grid.style.opacity = '0.5';

      fetch(finalUrl)
        .then(response => response.text())
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          const newGrid = doc.querySelector('.products-grid');
          if (newGrid && grid) {
            grid.innerHTML = newGrid.innerHTML;
            grid.style.opacity = '1';
          } else if (grid) {
            grid.innerHTML = '<div class="collection-empty" style="grid-column: 1/-1; text-align: center; padding: 40px;"><p>Nenhum produto encontrado com estes filtros.</p></div>';
            grid.style.opacity = '1';
          }

          const newCount = doc.querySelector('.collection-count');
          if (newCount && count) count.innerHTML = newCount.innerHTML;

          const newPagination = doc.querySelector('.pagination');
          let currentPagination = document.querySelector('.pagination');

          if (currentPagination && newPagination) {
            currentPagination.innerHTML = newPagination.innerHTML;
          } else if (currentPagination && !newPagination) {
            currentPagination.remove();
          } else if (!currentPagination && newPagination) {
            main.appendChild(newPagination);
          }

          window.history.pushState({ path: finalUrl }, '', finalUrl);
        })
        .catch(err => {
          console.error('Erro a carregar filtros:', err);
          window.location.href = finalUrl;
        });
    };

    // Enforce single selection on load (in case of weird history states)
    ['genero', 'tipo'].forEach(group => {
      const checkedBoxes = filterForm.querySelectorAll(`.custom-tag-checkbox[data-group="${group}"]:checked`);
      if (checkedBoxes.length > 1) {
        for (let i = 1; i < checkedBoxes.length; i++) {
          checkedBoxes[i].checked = false;
        }
      }
    });

    const initSubfilters = () => {
      const checkedTags = Array.from(filterForm.querySelectorAll('.custom-tag-checkbox:checked')).map(cb => cb.value);
      const subBijuteria = document.getElementById('subtipo-bijuteria');
      if (subBijuteria && checkedTags.includes('bijuteria')) {
        subBijuteria.style.display = 'block';
      }
      const subCalcado = document.getElementById('subtipo-calcado');
      if (subCalcado && (checkedTags.includes('calcado') || checkedTags.includes('calçado'))) {
        subCalcado.style.display = 'block';
      }
    };
    initSubfilters();

    filterForm.addEventListener('change', function (e) {
      if (e.target.type !== 'submit') {

        // Enforce single selection within group
        if (e.target.classList.contains('custom-tag-checkbox') && e.target.checked) {
          const group = e.target.getAttribute('data-group');
          if (group) {
            const others = filterForm.querySelectorAll(`.custom-tag-checkbox[data-group="${group}"]`);
            others.forEach(cb => {
              if (cb !== e.target) cb.checked = false;
            });
          }
        }

        const checkedTags = Array.from(filterForm.querySelectorAll('.custom-tag-checkbox:checked')).map(cb => cb.value);

        const subBijuteria = document.getElementById('subtipo-bijuteria');
        if (subBijuteria) {
          if (checkedTags.includes('bijuteria')) {
            subBijuteria.style.display = 'block';
          } else {
            subBijuteria.style.display = 'none';
            subBijuteria.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
          }
        }

        const subCalcado = document.getElementById('subtipo-calcado');
        if (subCalcado) {
          if (checkedTags.includes('calcado') || checkedTags.includes('calçado')) {
            subCalcado.style.display = 'block';
          } else {
            subCalcado.style.display = 'none';
            subCalcado.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
          }
        }

        clearTimeout(window.filterTimeout);
        window.filterTimeout = setTimeout(applyFilters, 50);
      }
    });

    filterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      applyFilters();
    });

    // Clear filters button
    const clearFiltersBtn = document.getElementById('ClearFiltersBtn');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', function () {
        // Uncheck all custom tags
        const customTags = filterForm.querySelectorAll('.custom-tag-checkbox');
        customTags.forEach(cb => cb.checked = false);

        // Clear price inputs
        const minPrice = filterForm.querySelector('input[name*="price.gte"]');
        const maxPrice = filterForm.querySelector('input[name*="price.lte"]');
        if (minPrice) minPrice.value = '';
        if (maxPrice) maxPrice.value = '';

        applyFilters();
      });
    }
  }

  // Account Dropdown Toggle
  const accountToggleBtn = document.querySelector('.account-toggle-btn');
  const accountDropdownMenu = document.querySelector('.account-dropdown-menu');
  if (accountToggleBtn && accountDropdownMenu) {
    accountToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      accountDropdownMenu.classList.toggle('show');
    });
    document.addEventListener('click', (e) => {
      if (!accountDropdownMenu.contains(e.target)) {
        accountDropdownMenu.classList.remove('show');
      }
    });
  }

  // Star Rating Widget Logic
  const starWidget = document.getElementById('starRatingWidget');
  const starInput = document.getElementById('reviewStars');
  if (starWidget && starInput) {
    const stars = starWidget.querySelectorAll('span');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const rating = parseInt(star.getAttribute('data-value'));
        starInput.value = rating;
        
        stars.forEach(s => {
          if (parseInt(s.getAttribute('data-value')) <= rating) {
            s.classList.add('active');
            s.innerHTML = '★';
          } else {
            s.classList.remove('active');
            s.innerHTML = '☆';
          }
        });
      });
    });
  }
});

// ==========================================
// 5. Editorial Reviews System (Firebase)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCe3T-anXZ2zqSqmASZ22TYqyR3gfWzv0c",
  authDomain: "le-bordeu.firebaseapp.com",
  projectId: "le-bordeu",
  storageBucket: "le-bordeu.firebasestorage.app",
  messagingSenderId: "1062479355014",
  appId: "1:1062479355014:web:80ab1e25e4682721ac8507",
  measurementId: "G-QHT3E9D4RE"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
  const reviewsContainer = document.getElementById('editorialReviews');
  if (reviewsContainer) {
    const btnWriteReview = document.getElementById('btnWriteReview');
    const reviewFormContainer = document.getElementById('reviewFormContainer');
    const reviewForm = document.getElementById('reviewForm');
    const reviewsList = document.getElementById('reviewsList');

    if (btnWriteReview && reviewFormContainer) {
      btnWriteReview.addEventListener('click', () => {
        if (reviewFormContainer.style.display === 'none') {
          reviewFormContainer.style.display = 'block';
          btnWriteReview.textContent = 'Cancelar';
        } else {
          reviewFormContainer.style.display = 'none';
          btnWriteReview.textContent = 'Escrever Review';
        }
      });
    }

    let currentPage = 1;
    const reviewsPerPage = 4;

    const getFlagForLang = (lang) => {
      const flags = {
        'pt': 'pt',
        'en': 'gb',
        'es': 'es',
        'fr': 'fr',
        'de': 'de',
        'it': 'it'
      };
      const countryCode = flags[lang] || 'pt';
      return `<img src="https://flagcdn.com/w20/${countryCode}.png" width="16" height="12" style="vertical-align: middle; margin-right: 4px; border-radius: 2px; display: inline-block; position: relative; top: -2px;" alt="${lang}">`;
    };

    const renderReviews = (allReviews) => {
      reviewsList.innerHTML = '';
      
      const totalPages = Math.ceil(allReviews.length / reviewsPerPage);
      const startIndex = (currentPage - 1) * reviewsPerPage;
      const pageReviews = allReviews.slice(startIndex, startIndex + reviewsPerPage);

      pageReviews.forEach(review => {
        const starsHtml = '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars);
        
        let dateObj = new Date(review.date);
        if (isNaN(dateObj.getTime())) {
          dateObj = new Date(); // Fallback se a data estiver inválida/antiga
        }
        const dateStr = dateObj.toLocaleDateString('pt-PT');
        const flag = getFlagForLang(review.lang || 'pt');
        
        reviewsList.innerHTML += `
          <div class="editorial-review-card" onclick="this.classList.toggle('expanded')" title="Clica para expandir">
            <div class="editorial-review-card__header">
              <span class="editorial-review-card__author">${flag} ${review.name}</span>
              <span class="editorial-review-card__date">${dateStr}</span>
            </div>
            <div class="editorial-review-card__stars">${starsHtml}</div>
            <p class="editorial-review-card__comment">${review.comment}</p>
          </div>
        `;
      });

      // Pagination
      const paginationContainer = document.getElementById('reviewsPagination');
      if (paginationContainer) {
        paginationContainer.innerHTML = '';
        if (totalPages > 1) {
          
          const prevBtn = document.createElement('button');
          prevBtn.className = `editorial-reviews__page-btn`;
          prevBtn.innerHTML = '&#8592;'; // Seta para a esquerda
          if (currentPage === 1) prevBtn.style.opacity = '0.3';
          prevBtn.addEventListener('click', () => {
            if(currentPage > 1) {
              currentPage--;
              renderReviews(allReviews);
            }
          });
          paginationContainer.appendChild(prevBtn);

          const nextBtn = document.createElement('button');
          nextBtn.className = `editorial-reviews__page-btn`;
          nextBtn.innerHTML = '&#8594;'; // Seta para a direita
          if (currentPage === totalPages) nextBtn.style.opacity = '0.3';
          nextBtn.addEventListener('click', () => {
            if(currentPage < totalPages) {
              currentPage++;
              renderReviews(allReviews);
            }
          });
          paginationContainer.appendChild(nextBtn);
          
        }
      }
    };

    const loadReviews = async () => {
      try {
        const snapshot = await db.collection("reviews").orderBy("date", "desc").get();
        const reviews = [];
        snapshot.forEach(doc => reviews.push(doc.data()));
        
        const updateAvgWidget = (revs) => {
          if (revs.length > 0) {
            let totalStars = 0;
            revs.forEach(r => totalStars += r.stars);
            const avg = (totalStars / revs.length).toFixed(1);
            
            const avgWidget = document.getElementById('averageRatingWidget');
            const avgValue = document.getElementById('averageRatingValue');
            const avgCount = document.getElementById('averageRatingCount');
            
            if (avgWidget && avgValue && avgCount) {
              avgValue.textContent = avg;
              avgCount.textContent = `(${revs.length} opiniões)`;
              avgWidget.style.display = 'flex';
            }
          }
        };
        
        // Se a base de dados estiver vazia (primeira vez), colocamos umas de teste
        if (reviews.length === 0) {
           const initialReviews = [
             { name: "Maria Sousa", stars: 5, comment: "A qualidade da roupa é divinal. Encomendei um vestido para um casamento e assentou que nem uma luva!", date: "2023-10-12T10:00:00Z" },
             { name: "Carla Oliveira", stars: 5, comment: "O atendimento ao cliente é espetacular. Tive uma dúvida com o tamanho e ajudaram-me super rápido. Recomendo 100%.", date: "2023-11-05T12:00:00Z" },
             { name: "Joana Fernandes", stars: 4, comment: "Peças lindas e muito elegantes. A única razão para não dar 5 estrelas foi o tempo de entrega que demorou mais um dia, mas a culpa foi da transportadora.", date: "2023-12-20T15:00:00Z" }
           ];
           for (const r of initialReviews) {
             await db.collection("reviews").add(r);
           }
           renderReviews(initialReviews);
           updateAvgWidget(initialReviews);
        } else {
           renderReviews(reviews);
           updateAvgWidget(reviews);
        }
      } catch (error) {
        console.error('Erro ao carregar reviews do Firebase:', error);
        reviewsList.innerHTML = '<p style="color:var(--text-muted); font-size:14px;">Não foi possível carregar as opiniões de momento.</p>';
      }
    };

    if (reviewForm) {
      reviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newReview = {
          name: document.getElementById('reviewName').value,
          stars: parseInt(document.getElementById('reviewStars').value),
          comment: document.getElementById('reviewComment').value,
          date: new Date().toISOString(),
          lang: localStorage.getItem('site_lang') || 'pt'
        };

        try {
          // Enviar para o Firebase
          await db.collection("reviews").add(newReview);
          
          // Reset form
          reviewForm.reset();
          reviewFormContainer.style.display = 'none';
          btnWriteReview.textContent = 'Escrever Review';

          // Reload
          loadReviews();
        } catch(error) {
          console.error('Erro ao submeter review:', error);
          alert("Ocorreu um erro ao enviar a review. Verifica as regras de segurança do Firebase.");
        }
      });
    }

    loadReviews();
  }
});

// ==========================================
// Product Reviews System
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const productReviewsWrapper = document.getElementById('productReviews');
  if (productReviewsWrapper) {
    const productId = productReviewsWrapper.getAttribute('data-product-id');
    const pReviewsList = document.getElementById('productReviewsList');
    const pReviewForm = document.getElementById('productReviewForm');
    const pPagination = document.getElementById('productReviewsPagination');
    
    let pCurrentPage = 1;
    const pReviewsPerPage = 4;

    const getFlagForLang = (lang) => {
      const flags = {
        'pt': 'pt',
        'en': 'gb',
        'es': 'es',
        'fr': 'fr',
        'de': 'de',
        'it': 'it'
      };
      const countryCode = flags[lang] || 'pt';
      return `<img src="https://flagcdn.com/w20/${countryCode}.png" width="16" height="12" style="vertical-align: middle; margin-right: 4px; border-radius: 2px; display: inline-block; position: relative; top: -2px;" alt="${lang}">`;
    };

    const renderPReviews = (allReviews) => {
      pReviewsList.innerHTML = '';
      
      const totalPages = Math.ceil(allReviews.length / pReviewsPerPage);
      const startIndex = (pCurrentPage - 1) * pReviewsPerPage;
      const pageReviews = allReviews.slice(startIndex, startIndex + pReviewsPerPage);

      if (allReviews.length === 0) {
        pReviewsList.innerHTML = '<p style="color: var(--text-muted); grid-column: 1 / -1; margin-bottom: 20px;">Ainda não existem avaliações para este produto. Seja o primeiro a avaliar!</p>';
        if(pPagination) pPagination.innerHTML = '';
        return;
      }

      pageReviews.forEach(review => {
        const starsHtml = '★'.repeat(review.stars) + '☆'.repeat(5 - review.stars);
        
        let dateObj = new Date(review.date);
        if (isNaN(dateObj.getTime())) {
          dateObj = new Date();
        }
        const dateStr = dateObj.toLocaleDateString('pt-PT');
        const flag = getFlagForLang(review.lang || 'pt');
        
        pReviewsList.innerHTML += `
          <div class="editorial-review-card" onclick="this.classList.toggle('expanded')" title="Clica para expandir">
            <div class="editorial-review-card__header">
              <span class="editorial-review-card__author">${flag} ${review.name}</span>
              <span class="editorial-review-card__date">${dateStr}</span>
            </div>
            <div class="editorial-review-card__stars">${starsHtml}</div>
            <p class="editorial-review-card__comment">${review.comment}</p>
          </div>
        `;
      });

      if (totalPages > 1 && pPagination) {
        let paginationHtml = '';
        
        if (pCurrentPage > 1) {
          paginationHtml += `<button class="p-page-btn" data-page="${pCurrentPage - 1}" aria-label="Página anterior" style="background: none; border: 1px solid var(--border-color); color: var(--text-cream); padding: 5px 12px; margin: 0 5px; cursor: pointer;">←</button>`;
        }
        if (pCurrentPage < totalPages) {
          paginationHtml += `<button class="p-page-btn" data-page="${pCurrentPage + 1}" aria-label="Próxima página" style="background: none; border: 1px solid var(--border-color); color: var(--text-cream); padding: 5px 12px; margin: 0 5px; cursor: pointer;">→</button>`;
        }
        
        pPagination.innerHTML = paginationHtml;
        
        pPagination.querySelectorAll('.p-page-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            pCurrentPage = parseInt(e.target.getAttribute('data-page'));
            renderPReviews(allReviews);
          });
        });
      } else if (pPagination) {
        pPagination.innerHTML = '';
      }
    };

    const loadProductReviews = async () => {
      try {
        const snapshot = await db.collection("reviews").get();
        const reviews = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if(data.productId === productId) {
             reviews.push(data);
          }
        });
        
        // Ordear manualmente por data para evitar erro de Index do Firebase
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (reviews.length > 0) {
          let totalStars = 0;
          reviews.forEach(r => totalStars += r.stars);
          const avg = (totalStars / reviews.length).toFixed(1);
          
          const pAvgWidget = document.getElementById('productAverageRatingWidget');
          const pAvgValue = document.getElementById('productAverageRatingValue');
          const pAvgCount = document.getElementById('productAverageRatingCount');
          
          if (pAvgWidget && pAvgValue && pAvgCount) {
            pAvgValue.textContent = avg;
            pAvgCount.textContent = `(${reviews.length} opiniões)`;
            pAvgWidget.style.display = 'flex';
          }
        } else {
           const pAvgWidget = document.getElementById('productAverageRatingWidget');
           if (pAvgWidget) pAvgWidget.style.display = 'none';
        }
        
        renderPReviews(reviews);
      } catch (error) {
        console.error('Erro ao carregar reviews do produto:', error);
      }
    };

    loadProductReviews();

    if (pReviewForm) {
      pReviewForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = pReviewForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'A enviar...';
        submitBtn.disabled = true;

        const newReview = {
          productId: productId,
          name: document.getElementById('productReviewName').value,
          stars: parseInt(document.getElementById('productReviewStars').value),
          comment: document.getElementById('productReviewComment').value,
          date: new Date().toISOString(),
          lang: localStorage.getItem('site_lang') || 'pt'
        };

        try {
          await db.collection("reviews").add(newReview);
          pReviewForm.reset();
          document.getElementById('productReviewFormWrapper').style.display = 'none';
          
          const leaveBtn = document.querySelector('#productReviews .editorial-reviews__actions button');
          if(leaveBtn) leaveBtn.style.display = 'inline-block';

          alert('Avaliação enviada com sucesso! Obrigado.');
          
          pCurrentPage = 1;
          loadProductReviews();
        } catch (error) {
          console.error('Erro ao enviar review:', error);
          alert('Ocorreu um erro ao enviar. Tente novamente mais tarde.');
        } finally {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }
      });
    }

    // Star Rating Widget Logic for Product
    const pStarWidget = document.getElementById('productStarRatingWidget');
    const pStarInput = document.getElementById('productReviewStars');
    if (pStarWidget && pStarInput) {
      const pStars = pStarWidget.querySelectorAll('span');
      pStars.forEach(star => {
        star.addEventListener('click', () => {
          const rating = parseInt(star.getAttribute('data-value'));
          pStarInput.value = rating;
          
          pStars.forEach(s => {
            if (parseInt(s.getAttribute('data-value')) <= rating) {
              s.classList.add('active');
              s.innerHTML = '★';
            } else {
              s.classList.remove('active');
              s.innerHTML = '☆';
            }
          });
        });
      });
    }
  }
});
