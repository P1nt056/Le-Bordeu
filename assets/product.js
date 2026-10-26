document.addEventListener('DOMContentLoaded',()=>{
  const getCurrentLang = () => (typeof window !== 'undefined' && window.currentLang) || (typeof currentLang !== 'undefined' ? currentLang : (localStorage.getItem('site_lang') || 'pt'));

  const relatedCarouselOptions = {
    perPage: 4,
    gap: '16px',
    breakpoints: { 1200: { perPage: 3 }, 900: { perPage: 2 }, 480: { perPage: 1 } },
    pagination: false,
    arrows: true,
    lazyLoad: 'nearby',
    keyboard: 'global'
  };

  function mountCarousel(el) {
    if (!el || !window.Splide) return;

    if (el.splideInstance) {
      try {
        el.splideInstance.destroy(true);
      } catch (e) {}
      el.splideInstance = null;
    } else if (el.classList.contains('is-initialized')) {
      return;
    }

    const track = el.querySelector('.splide__track');
    const list = el.querySelector('.splide__list');
    if (!track || !list || list.children.length === 0) return;

    try {
      const splide = new Splide(el, relatedCarouselOptions);
      splide.mount();
      el.splideInstance = splide;
    } catch (e) {
      console.warn('[Le Bordeu] Carousel mount skipped:', e);
    }
  }

  function loadProductRecommendations() {
    const related = document.querySelector('[data-related-products]');
    if (!related || !related.dataset.productId) return;

    const section = related.closest('.related-products');
    if (!section) return;

    const url = `/recommendations/products?section_id=related-products&product_id=${related.dataset.productId}&limit=${related.dataset.limit || 6}`;

    fetch(url)
      .then(response => response.text())
      .then(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const newSection = doc.querySelector('.related-products');
        const newCarousel = newSection && newSection.querySelector('[data-related-products]');

        if (newSection && newCarousel && newCarousel.querySelectorAll('.splide__slide').length > 0) {
          if (related.splideInstance) {
            try { related.splideInstance.destroy(true); } catch (e) {}
          }
          section.replaceWith(newSection);

          requestAnimationFrame(() => {
            const liveCarousel = document.querySelector('.related-products [data-related-products]');
            if (liveCarousel) {
              mountCarousel(liveCarousel);
            }
            if (typeof applyTranslations === 'function') {
              applyTranslations();
            }
          });
        }
      })
      .catch(error => console.error('Erro a carregar recomendações:', error));
  }

  function initAllCarousels() {
    if (window.Splide) {
      document.querySelectorAll('.splide:not(.product-gallery-splide):not(.product-gallery-thumbnails)').forEach(el => {
        mountCarousel(el);
      });
    }
  }

  initAllCarousels();
  if (!window.Splide) {
    window.addEventListener('load', initAllCarousels);
  }

  loadProductRecommendations();

  // Initialize medium-zoom for gallery main images
  if(window.mediumZoom){
    mediumZoom('.gallery__main img', { margin:24, background: 'rgba(0,0,0,0.85)' });
  }

  // Gallery thumbnail click -> update main image
  document.querySelectorAll('.gallery').forEach(gallery=>{
    const mainImg = gallery.querySelector('.gallery__main img');
    const lightbox = gallery.querySelector('.lightbox');
    const lightboxImg = gallery.querySelector('.lightbox__img');
    const closeBtn = gallery.querySelector('.lightbox__close');

      gallery.querySelectorAll('.thumb').forEach((btn,index)=>{
        btn.setAttribute('aria-label', `Ver imagem ${index+1}`);
        btn.addEventListener('click',()=>{
          const src = btn.dataset.src;
          const full = btn.dataset.full;
          mainImg.src = src;
          gallery.querySelector('.gallery__image').dataset.full = full;
        });
        btn.addEventListener('keydown',(e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); btn.click(); } });
        btn.addEventListener('mouseenter',()=>{btn.classList.add('hover')});
        btn.addEventListener('mouseleave',()=>{btn.classList.remove('hover')});
    });

    // Lightbox open
    gallery.querySelector('.gallery__main').addEventListener('click',()=>{
      const src = gallery.querySelector('.gallery__image').dataset.full || gallery.querySelector('.gallery__main img').src;
      lightboxImg.src = src;
      lightbox.setAttribute('aria-hidden','false');
      lightbox.classList.add('open');
        // move focus to close button for keyboard users
        closeBtn.focus();
    });
    closeBtn.addEventListener('click',()=>{lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true')});
      // close on ESC
      document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ if(lightbox.classList.contains('open')){ lightbox.classList.remove('open'); lightbox.setAttribute('aria-hidden','true'); gallery.querySelector('.gallery__main img').focus(); } } });
  });
  // AJAX Add to Cart & Buy Now redirects
  const form = document.getElementById('add-to-cart-form');
  if (form) {
    const addToCartBtn = document.getElementById('add-to-cart');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (addToCartBtn.disabled) return;
        const formData = new FormData(form);
        
        addToCartBtn.disabled = true;
        addToCartBtn.innerText = 'A adicionar...';
        
        fetch('/cart/add.js', {
          method: 'POST',
          body: formData
        })
        .then(res => {
          if (!res.ok) throw new Error('Erro ao adicionar');
          return res.json();
        })
        .then(data => {
          addToCartBtn.innerText = 'Adicionado!';
          setTimeout(() => {
            if (window.refreshCartDrawer && window.openCartDrawer) {
              window.refreshCartDrawer();
              window.openCartDrawer();
              addToCartBtn.innerText = typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS['prod_add'][getCurrentLang()] : 'Adicionar ao Carrinho';
              addToCartBtn.disabled = false;
            } else {
              window.location.href = '/cart';
            }
          }, 400);
        })
        .catch(err => {
          console.error(err);
          // Fallback: submit natively
          form.submit();
        });
      });
    }

    // Variant Selector Synchronizer
    const productJsonEl = document.querySelector('[id^="ProductJson-"]');
    if (productJsonEl) {
      const product = JSON.parse(productJsonEl.textContent);
      const optionSelectors = form.querySelectorAll('.single-option-selector');
      const variantIdInput = form.querySelector('input[name="id"]');
      function cleanText(val) {
        return String(val || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();
      }

      const COLOR_KEYWORD_GROUPS = [
        { name: 'blue', words: ['blue', 'azul', 'navy', 'marinho', 'cyan', 'celeste', 'bleu'] },
        { name: 'green', words: ['green', 'verde', 'emerald', 'esmeralda', 'olive', 'oliva'] },
        { name: 'black', words: ['black', 'preto', 'preta', 'negro', 'noir', 'dark'] },
        { name: 'white', words: ['white', 'branco', 'branca', 'blanco', 'blanc'] },
        { name: 'beige', words: ['beige', 'bege', 'cream', 'creme', 'khaki', 'caqui', 'champagne', 'areia', 'sand'] },
        { name: 'gold', words: ['gold', 'dourado', 'dourada', 'oro', 'amarelo', 'yellow'] },
        { name: 'silver', words: ['silver', 'prata', 'prateado', 'prateada', 'steel', 'aco', 'inox'] },
        { name: 'red', words: ['red', 'vermelho', 'vermelha', 'rojo', 'rouge', 'bordeaux', 'bordeu', 'vinho'] },
        { name: 'rose', words: ['rose', 'rosa', 'pink', 'salmao', 'salmon', 'coral'] },
        { name: 'brown', words: ['brown', 'castanho', 'castanha', 'marrom', 'cafe', 'chocolate', 'camel'] },
        { name: 'grey', words: ['grey', 'gray', 'cinza', 'cinzento', 'gris'] },
        { name: 'orange', words: ['orange', 'laranja', 'naranja'] },
        { name: 'purple', words: ['purple', 'roxo', 'roxa', 'violeta', 'lilas'] }
      ];

      function getVariantImageId(variant) {
        if (!variant) return null;

        if (variant.featured_image && variant.featured_image.id) {
          return variant.featured_image.id;
        }

        if (variant.featured_media && variant.featured_media.id) {
          return variant.featured_media.id;
        }

        if (variant.image && variant.image.id) {
          return variant.image.id;
        }

        return null;
      }

      function getSelectedOptions() {
        const selectedOptions = {};
        optionSelectors.forEach(select => {
          selectedOptions[select.dataset.index] = select.value;
        });
        return selectedOptions;
      }

      function findSlideIndexForVariant(variant) {
        if (!variant || !window.LeBordeuProductGallery) return -1;
        const slides = window.LeBordeuProductGallery.getSlides ? window.LeBordeuProductGallery.getSlides() : Array.from(document.querySelectorAll('.product-gallery-splide .splide__slide'));
        if (!slides || slides.length === 0) return -1;

        const variantIdStr = String(variant.id);
        const imageId = getVariantImageId(variant);
        const imageIdStr = imageId ? String(imageId) : null;

        // 1. Direct image ID match from variant.featured_image
        if (imageIdStr) {
          const idx = slides.findIndex(s => s.dataset.imageId === imageIdStr);
          if (idx !== -1) return idx;
        }

        // 2. data-variant-ids attribute on slide
        const varIdIdx = slides.findIndex(s => {
          const ids = (s.dataset.variantIds || '').split(',').map(x => x.trim()).filter(Boolean);
          return ids.includes(variantIdStr);
        });
        if (varIdIdx !== -1) return varIdIdx;

        // 3. Extract text from selected variant (title and options)
        const variantText = cleanText([variant.title, variant.option1, variant.option2, variant.option3].filter(Boolean).join(' '));
        const variantWords = variantText.split(' ').filter(w => w.length >= 3);

        // Check which color groups match this variant
        const matchedColorGroups = COLOR_KEYWORD_GROUPS.filter(group =>
          group.words.some(word => variantWords.includes(word) || variantText.includes(word))
        );

        if (matchedColorGroups.length > 0) {
          // Look for a slide that matches any of the color words in alt, filename, or src
          for (const group of matchedColorGroups) {
            for (let i = 0; i < slides.length; i++) {
              const slide = slides[i];
              const slideText = cleanText([
                slide.dataset.imageAlt,
                slide.dataset.imageFilename,
                slide.dataset.imageSrc
              ].filter(Boolean).join(' '));

              const hasColor = group.words.some(w => {
                const regex = new RegExp(`(^|\\s|_|-)${w}($|\\s|_|-)`, 'i');
                return regex.test(slideText) || slideText.includes(w);
              });

              if (hasColor) {
                return i;
              }
            }
          }
        }

        // 4. Differential unique word matching
        // Find words that are in THIS variant but NOT in other variants of the product
        if (product && Array.isArray(product.variants) && product.variants.length > 1) {
          const otherVariantsText = product.variants
            .filter(v => v.id !== variant.id)
            .map(v => cleanText([v.title, v.option1, v.option2, v.option3].filter(Boolean).join(' ')))
            .join(' ');

          const uniqueWords = variantWords.filter(w => !otherVariantsText.includes(w));

          if (uniqueWords.length > 0) {
            for (const word of uniqueWords) {
              for (let i = 0; i < slides.length; i++) {
                const slide = slides[i];
                const slideText = cleanText([
                  slide.dataset.imageAlt,
                  slide.dataset.imageFilename,
                  slide.dataset.imageSrc
                ].filter(Boolean).join(' '));

                if (slideText.includes(word)) {
                  return i;
                }
              }
            }
          }
        }

        // 5. Fallback: match by variant index if image count matches or exceeds variant count
        const variantIdx = product.variants ? product.variants.findIndex(v => v.id === variant.id) : -1;
        if (variantIdx !== -1 && variantIdx < slides.length) {
          return variantIdx;
        }

        return -1;
      }

      function updateVariant(options = {}) {
        const syncGallery = options.syncGallery !== false;
        // Get selected options
        const selectedOptions = getSelectedOptions();

        // Find matching variant
        const matchedVariant = product.variants.find(variant => {
          return Object.keys(selectedOptions).every(optionKey => {
            return variant[optionKey] === selectedOptions[optionKey];
          });
        });

        console.log("[Le Bordeu Debug] Selected Options:", selectedOptions);
        console.log("[Le Bordeu Debug] Matched Variant:", matchedVariant);

        if (matchedVariant) {
          console.log("[Le Bordeu Debug] Variant Available Status:", matchedVariant.available);
          // Update hidden input ID
          variantIdInput.value = matchedVariant.id;

          if (syncGallery && window.LeBordeuProductGallery) {
            const targetSlideIndex = findSlideIndexForVariant(matchedVariant);
            console.log("[Le Bordeu Debug] Target slide index for variant:", targetSlideIndex, matchedVariant);
            if (targetSlideIndex !== -1) {
              window.LeBordeuProductGallery.goToIndex(targetSlideIndex);
            }
            
            // Scroll to gallery on mobile when variant is manually selected
            if (options instanceof Event && window.innerWidth < 900) {
              const galleryElement = document.querySelector('.product-page__gallery');
              if (galleryElement) {
                const headerOffset = 80; // approximate sticky header height
                const elementPosition = galleryElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                  top: offsetPosition,
                  behavior: 'smooth'
                });
              }
            }
          }

          // Check if variant is available
          const lang = getCurrentLang();
          if (matchedVariant.available) {
            if (addToCartBtn) {
              addToCartBtn.disabled = false;
              addToCartBtn.classList.remove('btn--disabled');
              addToCartBtn.setAttribute('data-i18n', 'prod_add');
              addToCartBtn.innerText = typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS['prod_add'][lang] : 'Adicionar ao Carrinho';
            }
          } else {
            if (addToCartBtn) {
              addToCartBtn.disabled = true;
              addToCartBtn.classList.add('btn--disabled');
              addToCartBtn.setAttribute('data-i18n', 'prod_sold_out');
              addToCartBtn.innerText = typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS['prod_sold_out'][lang] : 'Esgotado';
            }
          }
        } else {
          console.log("[Le Bordeu Debug] No variant matches these options.");
          const lang = getCurrentLang();
          // Combination not found
          if (addToCartBtn) {
            addToCartBtn.disabled = true;
            addToCartBtn.classList.add('btn--disabled');
            addToCartBtn.setAttribute('data-i18n', 'prod_unavailable');
            addToCartBtn.innerText = typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS['prod_unavailable'][lang] : 'Indisponível';
          }
        }
      }

      // Add listeners
      optionSelectors.forEach(select => {
        select.addEventListener('change', updateVariant);
      });

      // Initialize status on load
      updateVariant();
    }
  }
});
