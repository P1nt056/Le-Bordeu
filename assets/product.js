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
  // Legacy carousel code removed in favor of Splide
});
