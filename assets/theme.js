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
          
          window.history.pushState({path: finalUrl}, '', finalUrl);
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
      clearFiltersBtn.addEventListener('click', function() {
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
});
