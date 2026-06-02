document.addEventListener('DOMContentLoaded',()=>{
  // Initialize Splide carousels if available
  if(window.Splide){
    document.querySelectorAll('.splide').forEach((el)=>{
      new Splide(el, {
        perPage: 4,
        gap: '16px',
        breakpoints: { 1200: { perPage:3 }, 900: { perPage:2 }, 480: { perPage:1 } },
        pagination:false,
        arrows:true,
        lazyLoad: 'nearby',
        keyboard: 'global',
        accessibility: true
      }).mount();
    });
  }

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
              addToCartBtn.innerText = 'Adicionar ao Carrinho';
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

    const buyNowBtn = form.querySelector('button[type="submit"]');
    if (buyNowBtn) {
      buyNowBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let returnInput = form.querySelector('input[name="return_to"]');
        if (!returnInput) {
          returnInput = document.createElement('input');
          returnInput.type = 'hidden';
          returnInput.name = 'return_to';
          returnInput.value = '/checkout';
          form.appendChild(returnInput);
        } else {
          returnInput.value = '/checkout';
        }
        form.submit();
      });
    }
    // Variant Selector Synchronizer
    const productJsonEl = document.querySelector('[id^="ProductJson-"]');
    if (productJsonEl) {
      const product = JSON.parse(productJsonEl.textContent);
      const optionSelectors = form.querySelectorAll('.single-option-selector');
      const variantIdInput = form.querySelector('input[name="id"]');

      function updateVariant() {
        // Get selected options
        const selectedOptions = {};
        optionSelectors.forEach(select => {
          selectedOptions[select.dataset.index] = select.value;
        });

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

          // Check if variant is available
          if (matchedVariant.available) {
            buyNowBtn.disabled = false;
            buyNowBtn.innerText = 'Comprar Agora';
            
            if (addToCartBtn) {
              addToCartBtn.disabled = false;
              addToCartBtn.innerText = 'Adicionar ao Carrinho';
            }
          } else {
            buyNowBtn.disabled = true;
            buyNowBtn.innerText = 'Esgotado';
            
            if (addToCartBtn) {
              addToCartBtn.disabled = true;
              addToCartBtn.innerText = 'Esgotado';
            }
          }
        } else {
          console.log("[Le Bordeu Debug] No variant matches these options.");
          // Combination not found
          buyNowBtn.disabled = true;
          buyNowBtn.innerText = 'Indisponível';
          
          if (addToCartBtn) {
            addToCartBtn.disabled = true;
            addToCartBtn.innerText = 'Indisponível';
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
