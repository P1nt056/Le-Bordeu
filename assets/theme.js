document.addEventListener('DOMContentLoaded', function () {
  // Suppress repetitive cookie consent banner strictly in local development (127.0.0.1 / localhost)
  if (['127.0.0.1', 'localhost'].includes(window.location.hostname)) {
    document.body.classList.add('is-localhost');
    const dismissLocalCookie = () => {
      if (window.Shopify && window.Shopify.customerPrivacy && typeof window.Shopify.customerPrivacy.setTrackingConsent === 'function') {
        try { window.Shopify.customerPrivacy.setTrackingConsent(true, () => {}); } catch (e) {}
      }
      document.querySelectorAll('#shopify-pc__banner, .shopify-pc__banner, #shopify-privacy-banner, shopify-cookie-banner, [id*="cookie-consent"], [class*="cookie-consent"]').forEach(el => {
        el.style.setProperty('display', 'none', 'important');
      });
      document.querySelectorAll('div, section, aside').forEach(el => {
        if (el.children.length > 0 && el.children.length < 12) {
          const text = el.innerText || el.textContent || '';
          if (text.includes('Cookie consent') && text.includes('Accept') && text.includes('Decline')) {
            el.style.setProperty('display', 'none', 'important');
          }
        }
      });
    };
    dismissLocalCookie();
    setTimeout(dismissLocalCookie, 300);
    setTimeout(dismissLocalCookie, 800);
    setTimeout(dismissLocalCookie, 1500);
    window.addEventListener('load', dismissLocalCookie);
  }

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
      mbBtn.innerHTML = open ? '&#x2715;' : '&#x2630;';
    }
    // initialize
    setMenuState(false);
    mbBtn.addEventListener('click', () => { setMenuState(document.body.classList.contains('mobile-menu-open')) });
    
    // Listen to the close button inside the menu
    const mbCloseBtn = document.querySelector('.mobile-menu-close-btn');
    if (mbCloseBtn) {
      mbCloseBtn.addEventListener('click', () => {
        document.body.classList.remove('mobile-menu-open');
        setMenuState(false);
      });
    }

    // when closed by outside click
    document.addEventListener('click', (e) => { if (!mainNav.contains(e.target) && !mbBtn.contains(e.target)) setMenuState(false) });
    // when link clicked
    document.querySelectorAll('#main-navigation a').forEach(a => a.addEventListener('click', () => setMenuState(false)));
  }
});

// Cart Drawer Logic
document.addEventListener('DOMContentLoaded', function () {
  const overlay = document.getElementById('cart-drawer-overlay');

  const updateDrawerState = () => {
    const drawerInner = document.querySelector('.cart-drawer-inner');
    const cartSection = document.getElementById('shopify-section-cart-drawer');
    if (drawerInner && cartSection) {
      if (drawerInner.classList.contains('has-recommendations') && drawerInner.querySelector('.cart-drawer__rec-col')) {
        cartSection.classList.add('has-recommendations-drawer');
      } else {
        cartSection.classList.remove('has-recommendations-drawer');
      }
    }
  };

  window.openCartDrawer = function () {
    document.body.classList.add('cart-drawer-open');
    overlay.classList.add('active');
    updateDrawerState();
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
          oldDrawer.className = newDrawer.className;
          oldDrawer.innerHTML = newDrawer.innerHTML;
          updateDrawerState();
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
        document.querySelectorAll('.cart-count-badge').forEach(badge => {
          badge.textContent = cart.item_count;
          if (cart.item_count > 0) {
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        });
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

    const list = container.querySelector('.cart-drawer__recommendations-list');
    if (list && list.children.length > 0) {
      // Liquid already populated the recommendations!
      bindCartDrawerRecommendations();
      return;
    }

    // Fallback: Fetch all products and run client-side complementary look logic
    const cartProductIds = (container.dataset.cartProductIds || '').split(',').map(s => s.trim()).filter(Boolean);
    const hasTop = container.dataset.hasTop === 'true';
    const hasBottom = container.dataset.hasBottom === 'true';
    const hasShoes = container.dataset.hasShoes === 'true';
    const hasWatch = container.dataset.hasWatch === 'true';
    const hasAccessory = container.dataset.hasAccessory === 'true';
    const cartGender = container.dataset.gender || 'neutral';

    fetch('/collections/all/products.json?limit=50')
      .then(res => {
        if (!res.ok) throw new Error('Network error');
        return res.json();
      })
      .then(data => {
        if (!data || !data.products || !data.products.length) {
          container.style.display = 'none';
          return;
        }

        let pickedTop = hasTop;
        let pickedBottom = hasBottom;
        let pickedShoes = hasShoes;
        let pickedWatch = hasWatch;
        let pickedAccessory = hasAccessory;
        let pickedProducts = [];

        for (const p of data.products) {
          if (pickedProducts.length >= 3) break;
          if (cartProductIds.includes(String(p.id))) continue;

          // Check availability
          const availableVariant = p.variants.find(v => v.available);
          if (!availableVariant) continue;

          const pText = (p.title + ' ' + (p.product_type || '') + ' ' + (p.tags || []).join(' ')).toLowerCase();

          // Gender filtering
          if (cartGender === 'homem') {
            if (pText.includes('mulher') || pText.includes('women') || pText.includes('vestido') || pText.includes('dress')) continue;
          } else if (cartGender === 'mulher') {
            if (pText.includes('homem') || pText.includes('men ') || pText.includes('masculin')) continue;
          }

          let isTop = /shirt|camisa|camisola|polo|casaco|sweater|hoodie|blazer|t-shirt|tshirt|jacket|cardigan|malha/i.test(pText);
          let isBottom = /jean|calca|pant|denim|calcao|short|trouser/i.test(pText);
          let isShoes = /sapato|calcado|sapatilha|sneaker|shoe|boot|bota/i.test(pText);
          let isWatch = /relogio|watch/i.test(pText);
          let isAccessory = /chapeu|gorro|cinto|oculos|carteira|mala|bag|hat|belt|bijuteria|anel|colar|pulseira|estojo/i.test(pText);

          let badge = '';
          let shouldPick = false;

          if (isTop && !pickedTop) {
            shouldPick = true;
            pickedTop = true;
            badge = 'Parte de Cima';
          } else if (isBottom && !pickedBottom) {
            shouldPick = true;
            pickedBottom = true;
            badge = 'Calças & Jeans';
          } else if (isShoes && !pickedShoes) {
            shouldPick = true;
            pickedShoes = true;
            badge = 'Calçado';
          } else if (isWatch && !pickedWatch) {
            shouldPick = true;
            pickedWatch = true;
            badge = 'Relógio';
          } else if (isAccessory && !pickedAccessory) {
            shouldPick = true;
            pickedAccessory = true;
            badge = 'Acessórios';
          }

          if (shouldPick) {
            pickedProducts.push({ product: p, badge, defaultVariant: availableVariant });
          }
        }

        if (pickedProducts.length === 0) {
          container.style.display = 'none';
          return;
        }

        let html = '';
        pickedProducts.forEach(({ product, badge, defaultVariant }) => {
          const image = (product.images && product.images[0] && product.images[0].src) || '';
          const priceVal = parseFloat(defaultVariant.price);
          const priceStr = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(priceVal);

          let optionsHtml = '';
          if (product.variants.length > 1) {
            optionsHtml = `
              <div class="cart-rec-item__option">
                <select class="cart-rec-item__select" aria-label="Opções para ${product.title}">
                  ${product.variants.map(v => `<option value="${v.id}" ${!v.available ? 'disabled' : ''}>${v.title}${!v.available ? ' - (Esgotado)' : ''}</option>`).join('')}
                </select>
              </div>
            `;
          }

          html += `
            <div class="cart-rec-item" data-product-id="${product.id}">
              <a href="/products/${product.handle}" class="cart-rec-item__image-link">
                <img src="${image}" alt="${product.title}" loading="lazy">
              </a>
              <div class="cart-rec-item__info">
                ${badge ? `<span class="cart-rec-item__badge">${badge}</span>` : ''}
                <a href="/products/${product.handle}" class="cart-rec-item__title" title="${product.title}">${product.title}</a>
                <div class="cart-rec-item__pricing">
                  <span class="cart-rec-item__price">${priceStr}</span>
                </div>
                ${optionsHtml}
                <button type="button" class="cart-rec-item__add-btn" data-variant-id="${defaultVariant.id}">
                  <span class="btn-text">+ Adicionar</span>
                </button>
              </div>
            </div>
          `;
        });

        list.innerHTML = html;
        bindCartDrawerRecommendations();
      })
      .catch(err => {
        console.error('Erro ao carregar sugestões:', err);
        container.style.display = 'none';
      });
  }

  function bindCartDrawerRecommendations() {
    // Multi-option selects (separate Color, Size, etc.)
    document.querySelectorAll('.cart-rec-item__option-select').forEach(select => {
      select.removeEventListener('change', onRecOptionSelectChange);
      select.addEventListener('change', onRecOptionSelectChange);
    });

    // Fallback single select change
    document.querySelectorAll('.cart-rec-item__select').forEach(select => {
      select.removeEventListener('change', onRecSelectChange);
      select.addEventListener('change', onRecSelectChange);
    });

    // Add button adds to cart via AJAX
    document.querySelectorAll('.cart-rec-item__add-btn').forEach(btn => {
      btn.removeEventListener('click', onRecAddBtnClick);
      btn.addEventListener('click', onRecAddBtnClick);
    });
  }

  function onRecOptionSelectChange(e) {
    const card = e.target.closest('.cart-rec-item');
    if (!card) return;

    const optionsWrap = card.querySelector('.cart-rec-item__options');
    if (!optionsWrap || !optionsWrap.dataset.variants) return;

    let variants = [];
    try {
      variants = JSON.parse(optionsWrap.dataset.variants);
    } catch (err) {
      console.error('Erro ao ler variantes:', err);
      return;
    }

    const selects = card.querySelectorAll('.cart-rec-item__option-select');
    const selectedVals = Array.from(selects).map(s => s.value);

    const matchedVariant = variants.find(v => {
      return selectedVals.every((val, idx) => {
        const key = `option${idx + 1}`;
        return !val || v[key] === val;
      });
    });

    const btn = card.querySelector('.cart-rec-item__add-btn');
    const textEl = btn && (btn.querySelector('.btn-text') || btn);
    const priceEl = card.querySelector('.cart-rec-item__price');
    const imgEl = card.querySelector('.cart-rec-item__image-link img');

    if (matchedVariant) {
      if (btn) {
        btn.dataset.variantId = matchedVariant.id;
        if (matchedVariant.available) {
          btn.disabled = false;
          if (textEl) textEl.textContent = '+ Adicionar';
        } else {
          btn.disabled = true;
          if (textEl) textEl.textContent = 'Esgotado';
        }
      }

      // Update image if variant has its own image
      if (imgEl && matchedVariant.featured_image && matchedVariant.featured_image.src) {
        imgEl.src = matchedVariant.featured_image.src;
      }

      // Update price if available
      if (priceEl && matchedVariant.price) {
        const numPrice = typeof matchedVariant.price === 'number' && matchedVariant.price > 1000 ? matchedVariant.price / 100 : parseFloat(matchedVariant.price);
        if (!isNaN(numPrice) && numPrice > 0) {
          priceEl.textContent = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(numPrice);
        }
      }
    } else {
      if (btn) {
        btn.disabled = true;
        if (textEl) textEl.textContent = 'Indisponível';
      }
    }
  }

  function onRecSelectChange(e) {
    const card = e.target.closest('.cart-rec-item');
    const btn = card && card.querySelector('.cart-rec-item__add-btn');
    if (btn) {
      btn.dataset.variantId = e.target.value;
    }
  }

  function onRecAddBtnClick(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const variantId = btn.dataset.variantId;
    if (!variantId || btn.disabled) return;

    const textEl = btn.querySelector('.btn-text') || btn;
    const originalText = textEl.textContent;
    btn.disabled = true;
    textEl.textContent = 'A adicionar...';

    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity: 1 })
    })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao adicionar');
        return res.json();
      })
      .then(() => {
        btn.classList.add('is-added');
        textEl.textContent = '✓ Adicionado';
        setTimeout(() => {
          refreshCartDrawer();
        }, 350);
      })
      .catch(err => {
        console.error('Erro ao adicionar item:', err);
        btn.disabled = false;
        textEl.textContent = originalText;
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

    // Bind recommendation events
    bindCartDrawerRecommendations();
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
  updateDrawerState();
});

document.addEventListener('DOMContentLoaded', function () {
  const mainGallery = document.querySelector('.product-gallery-splide');
  const thumbGallery = document.querySelector('.product-gallery-thumbnails');

  if (mainGallery) {
    let isProgrammaticMove = false;
    let mainSplide = null;
    let thumbSplide = null;

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

        const slides = mainGallery.querySelectorAll('.splide__slide');
        const slide = slides[newIndex];
        const imageId = slide && slide.dataset.imageId;

        window.dispatchEvent(new CustomEvent('leBordeu:galleryImageChange', {
          detail: { imageId, slideIndex: newIndex }
        }));
      });
    }

    mountGallery();

    window.LeBordeuProductGallery = {
      getMainSplide() {
        return mainSplide;
      },
      getSlides() {
        return Array.from(mainGallery.querySelectorAll('.splide__slide'));
      },
      goToIndex(index) {
        if (index < 0 || !mainSplide) return false;
        const slides = Array.from(mainGallery.querySelectorAll('.splide__slide'));
        if (index >= slides.length) return false;
        if (index === mainSplide.index) return true;

        isProgrammaticMove = true;
        mainSplide.go(index);
        return true;
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
      },
      configureVariantTerms() {},
      filterByVariant(variant) {
        if (!variant) return;
        const imgId = variant.featured_image && variant.featured_image.id ? variant.featured_image.id : (variant.image && variant.image.id ? variant.image.id : null);
        if (imgId) {
          this.goToImageId(imgId);
        }
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

    const updateClearFiltersButtonVisibility = () => {
      const mobileClearBtn = document.getElementById('MobileFiltersClearBtn');
      if (!mobileClearBtn) return;
      
      const checkedTags = Array.from(filterForm.querySelectorAll('.custom-tag-checkbox:checked'));
      const minPrice = filterForm.querySelector('input[name*="price.gte"]');
      const maxPrice = filterForm.querySelector('input[name*="price.lte"]');
      
      const hasFilters = checkedTags.length > 0 || (minPrice && minPrice.value) || (maxPrice && maxPrice.value);
      
      if (hasFilters) {
        mobileClearBtn.style.display = 'block';
      } else {
        mobileClearBtn.style.display = 'none';
      }
    };

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
      updateClearFiltersButtonVisibility();
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
        
        updateClearFiltersButtonVisibility();

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
      const clearAllFilters = function () {
        // Uncheck all custom tags
        const customTags = filterForm.querySelectorAll('.custom-tag-checkbox');
        customTags.forEach(cb => cb.checked = false);

        // Clear price inputs
        const minPrice = filterForm.querySelector('input[name*="price.gte"]');
        const maxPrice = filterForm.querySelector('input[name*="price.lte"]');
        if (minPrice) minPrice.value = '';
        if (maxPrice) maxPrice.value = '';

        updateClearFiltersButtonVisibility();
        applyFilters();
      };
      
      clearFiltersBtn.addEventListener('click', clearAllFilters);
      
      const mobileClearBtn = document.getElementById('MobileFiltersClearBtn');
      if (mobileClearBtn) {
        mobileClearBtn.addEventListener('click', clearAllFilters);
      }
    }

    // Mobile Filters Modal Logic
    const mobileFiltersTrigger = document.getElementById('MobileFiltersTrigger');
    const mobileFiltersClose = document.getElementById('MobileFiltersClose');
    const mobileFiltersApply = document.getElementById('MobileFiltersApply');
    const collectionSidebar = document.getElementById('CollectionSidebar');

    if (mobileFiltersTrigger && collectionSidebar) {
      const openFilters = () => {
        collectionSidebar.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      };

      const closeFilters = () => {
        collectionSidebar.classList.remove('is-open');
        document.body.style.overflow = '';
      };

      mobileFiltersTrigger.addEventListener('click', openFilters);
      
      if (mobileFiltersClose) {
        mobileFiltersClose.addEventListener('click', closeFilters);
      }
      
      if (mobileFiltersApply) {
        mobileFiltersApply.addEventListener('click', closeFilters);
      }
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
    const reviewsPerPage = 2;

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

        const currentCustomerId = document.getElementById('reviewCustomerId')?.value || document.getElementById('productReviewCustomerId')?.value || '';

        let deleteBtnHtml = '';
        if (currentCustomerId && review.customerId === currentCustomerId) {
          deleteBtnHtml = `<button onclick="deleteReview('${review.id}')" style="background:none; border:none; color:var(--color-gold); cursor:pointer; font-size: 16px; margin-left: 10px;" title="Apagar Review">&#128465;</button>`;
        }

        reviewsList.innerHTML += `
          <div class="editorial-review-card" onclick="this.classList.toggle('expanded')" title="Clica para expandir">
            <div class="editorial-review-card__header">
              <span class="editorial-review-card__author">${flag} ${review.name}${deleteBtnHtml}</span>
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
            if (currentPage > 1) {
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
            if (currentPage < totalPages) {
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
        snapshot.forEach(doc => {
          reviews.push({ id: doc.id, ...doc.data() });
        });

        const updateAvgWidget = (revs) => {
          if (revs.length > 0) {
            let totalStars = 0;
            revs.forEach(r => totalStars += r.stars);
            const avg = (totalStars / revs.length).toFixed(1);
            const roundedAvg = Math.round(avg);

            const avgWidget = document.getElementById('averageRatingWidget');
            const avgStars = document.getElementById('averageRatingStars');
            const avgValue = document.getElementById('averageRatingValue');
            const avgCount = document.getElementById('averageRatingCount');

            if (avgWidget && avgValue && avgCount && avgStars) {
              const currentLang = localStorage.getItem('site_lang') || 'pt';
              const opinsText = currentLang === 'en' ? TRANSLATIONS['rev_opinions'].en : TRANSLATIONS['rev_opinions'].pt;
              avgStars.innerHTML = '★'.repeat(roundedAvg) + '☆'.repeat(5 - roundedAvg);
              avgValue.textContent = avg;
              avgCount.innerHTML = `(${revs.length} <span data-i18n="rev_opinions">${opinsText}</span>)`;
              avgWidget.style.display = 'flex';
            }
          }
        };

        // Se a base de dados estiver vazia (primeira vez), colocamos umas de teste
        if (reviews.length === 0) {
          const initialReviews = [
            { name: "Mariana Costa", stars: 5, comment: "A qualidade surpreendeu-me. O vestido chegou bem embalado e ficou elegante sem perder conforto.", date: "2023-10-12T10:00:00Z" },
            { name: "Joao Ferreira", stars: 5, comment: "Comprei um relogio para oferecer e a apresentacao transmitiu muito bom gosto. Voltarei a comprar.", date: "2023-11-05T12:00:00Z" },
            { name: "Catarina Alves", stars: 5, comment: "Pecas bonitas, atendimento atento e uma experiencia de compra simples. Gostei muito do cuidado nos detalhes.", date: "2023-12-20T15:00:00Z" }
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
          customerId: document.getElementById('reviewCustomerId')?.value || '',
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
        } catch (error) {
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
        const currentLang = localStorage.getItem('site_lang') || 'pt';
        const emptyText = currentLang === 'en' ? TRANSLATIONS['rev_empty'].en : TRANSLATIONS['rev_empty'].pt;
        pReviewsList.innerHTML = `<p style="color: var(--text-muted); grid-column: 1 / -1; margin-bottom: 20px;">${emptyText}</p>`;
        if (pPagination) pPagination.innerHTML = '';
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

        const currentCustomerId = document.getElementById('reviewCustomerId')?.value || document.getElementById('productReviewCustomerId')?.value || '';

        let deleteBtnHtml = '';
        if (currentCustomerId && review.customerId === currentCustomerId) {
          deleteBtnHtml = `<button onclick="deleteReview('${review.id}')" style="background:none; border:none; color:var(--color-gold); cursor:pointer; font-size: 16px; margin-left: 10px;" title="Apagar Review">&#128465;</button>`;
        }

        pReviewsList.innerHTML += `
          <div class="editorial-review-card" onclick="this.classList.toggle('expanded')" title="Clica para expandir">
            <div class="editorial-review-card__header">
              <span class="editorial-review-card__author">${flag} ${review.name}${deleteBtnHtml}</span>
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
          if (data.productId === productId) {
            reviews.push({ id: doc.id, ...data });
          }
        });

        // Ordear manualmente por data para evitar erro de Index do Firebase
        reviews.sort((a, b) => new Date(b.date) - new Date(a.date));

        const renderBadgeStars = (rating) => {
          let starsSvg = '';
          for (let i = 1; i <= 5; i++) {
            if (rating >= i - 0.25) {
              starsSvg += '<svg class="star star--full" width="15" height="15" viewBox="0 0 24 24" fill="#F59E0B" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            } else if (rating >= i - 0.75) {
              starsSvg += '<svg class="star star--half" width="15" height="15" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="halfStarGradBadge"><stop offset="50%" stop-color="#F59E0B"/><stop offset="50%" stop-color="rgba(255,255,255,0.25)"/></linearGradient></defs><path fill="url(#halfStarGradBadge)" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            } else {
              starsSvg += '<svg class="star star--empty" width="15" height="15" viewBox="0 0 24 24" fill="rgba(255,255,255,0.25)" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            }
          }
          return starsSvg;
        };

        const pBadge = document.getElementById('productReviewsBadge');
        const pBadgeStars = document.getElementById('productBadgeStars');
        const pBadgeRating = document.getElementById('productBadgeRating');
        const pBadgeCount = document.getElementById('productBadgeCount');
        const pBadgeCountLabel = document.getElementById('productBadgeCountLabel');
        const pBadgeDivider2 = document.getElementById('productBadgeDivider2');
        const pBadgeRecommendWrap = document.getElementById('productBadgeRecommendWrap');
        const pBadgeRecommend = document.getElementById('productBadgeRecommend');

        const currentLang = localStorage.getItem('site_lang') || 'pt';

        if (reviews.length > 0) {
          let totalStars = 0;
          reviews.forEach(r => totalStars += r.stars);
          const avg = (totalStars / reviews.length).toFixed(1);

          // Recommendation: all reviews with 4 or 5 stars count as recommended
          const recommendedCount = reviews.filter(r => r.stars >= 4).length;
          const recommendedPct = Math.round((recommendedCount / reviews.length) * 100);

          if (pBadge && pBadgeRating && pBadgeCount) {
            pBadgeRating.textContent = avg;
            pBadgeCount.textContent = reviews.length;

            const reviewLabelKey = reviews.length === 1 ? 'rev_badge_review' : 'rev_badge_reviews';
            if (pBadgeCountLabel) {
              const labelText = currentLang === 'en' ? TRANSLATIONS[reviewLabelKey].en : TRANSLATIONS[reviewLabelKey].pt;
              pBadgeCountLabel.textContent = labelText;
              pBadgeCountLabel.setAttribute('data-i18n', reviewLabelKey);
            }

            if (pBadgeRecommendWrap) {
              const recKey = 'rev_badge_recommend';
              const recText = currentLang === 'en' ? TRANSLATIONS[recKey].en : TRANSLATIONS[recKey].pt;
              pBadgeRecommendWrap.innerHTML = `<span class="product-reviews-badge__check">&#10003;</span> <span id="productBadgeRecommend">${recommendedPct}%</span> <span data-i18n="${recKey}">${recText}</span>`;
              pBadgeRecommendWrap.style.display = 'inline-flex';
            }

            if (pBadgeDivider2) pBadgeDivider2.style.display = 'inline';

            if (pBadgeStars) {
              pBadgeStars.innerHTML = renderBadgeStars(parseFloat(avg));
            }
            pBadge.style.display = 'inline-flex';
          }
        } else {
          // 0 reviews: realistic empty state
          if (pBadge && pBadgeRating && pBadgeCount) {
            pBadgeRating.textContent = '0.0';
            pBadgeCount.textContent = '0';
            const reviewsLabel = currentLang === 'en' ? TRANSLATIONS['rev_badge_reviews'].en : TRANSLATIONS['rev_badge_reviews'].pt;
            if (pBadgeCountLabel) {
              pBadgeCountLabel.textContent = reviewsLabel;
              pBadgeCountLabel.setAttribute('data-i18n', 'rev_badge_reviews');
            }

            if (pBadgeRecommendWrap) {
              const firstText = currentLang === 'en' ? TRANSLATIONS['rev_badge_first'].en : TRANSLATIONS['rev_badge_first'].pt;
              pBadgeRecommendWrap.innerHTML = `<span style="text-decoration: underline;" data-i18n="rev_badge_first">${firstText}</span>`;
              pBadgeRecommendWrap.style.display = 'inline-flex';
            }

            if (pBadgeDivider2) pBadgeDivider2.style.display = 'inline';

            if (pBadgeStars) {
              pBadgeStars.innerHTML = renderBadgeStars(0);
            }
            pBadge.style.display = 'inline-flex';
          }
        }

        renderPReviews(reviews);
      } catch (error) {
        console.error('Erro ao carregar reviews do produto:', error);
        if (pBadge && pBadgeRating && pBadgeCount) {
          pBadgeRating.textContent = '0.0';
          pBadgeCount.textContent = '0';
          const reviewsLabel = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS['rev_badge_reviews']) ? (currentLang === 'en' ? TRANSLATIONS['rev_badge_reviews'].en : TRANSLATIONS['rev_badge_reviews'].pt) : 'avaliações';
          if (pBadgeCountLabel) {
            pBadgeCountLabel.textContent = reviewsLabel;
            pBadgeCountLabel.setAttribute('data-i18n', 'rev_badge_reviews');
          }
          if (pBadgeRecommendWrap) {
            const firstText = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS['rev_badge_first']) ? (currentLang === 'en' ? TRANSLATIONS['rev_badge_first'].en : TRANSLATIONS['rev_badge_first'].pt) : 'Seja o primeiro a avaliar';
            pBadgeRecommendWrap.innerHTML = `<span style="text-decoration: underline;" data-i18n="rev_badge_first">${firstText}</span>`;
            pBadgeRecommendWrap.style.display = 'inline-flex';
          }
          if (pBadgeDivider2) pBadgeDivider2.style.display = 'inline';
          if (pBadgeStars) pBadgeStars.innerHTML = renderBadgeStars(0);
          pBadge.style.display = 'inline-flex';
        }
      }
    };

    loadProductReviews();

    const pBadgeEl = document.getElementById('productReviewsBadge');
    if (pBadgeEl) {
      pBadgeEl.addEventListener('click', () => {
        const reviewsSection = document.getElementById('productReviews');
        if (reviewsSection) {
          reviewsSection.scrollIntoView({ behavior: 'smooth' });
        }
        const currentCount = parseInt(document.getElementById('productBadgeCount')?.textContent || '0');
        if (currentCount === 0) {
          const formWrapper = document.getElementById('productReviewFormWrapper');
          const leaveBtn = document.querySelector('#productReviews .editorial-reviews__actions button');
          if (formWrapper) {
            formWrapper.style.display = 'block';
            if (leaveBtn) leaveBtn.style.display = 'none';
          }
        }
      });
    }

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
          customerId: document.getElementById('productReviewCustomerId')?.value || '',
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
          if (leaveBtn) leaveBtn.style.display = 'inline-block';

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
