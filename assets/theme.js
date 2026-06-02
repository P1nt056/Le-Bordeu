document.addEventListener('DOMContentLoaded',function(){
  // Header: transparent -> solid on scroll
  const header=document.querySelector('.site-header');
  window.addEventListener('scroll',()=>{
    if(window.scrollY>60) header.classList.add('solid'); else header.classList.remove('solid');
  });

  // Simple fade-in on scroll
  const faders=document.querySelectorAll('.fade-in');
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in-view');io.unobserve(e.target)}});
  },{threshold:.12});
  faders.forEach(f=>io.observe(f));

  // Mobile menu toggle
  const mbBtn=document.querySelector('.mobile-menu-btn');
  if(mbBtn){mbBtn.addEventListener('click',()=>{document.body.classList.toggle('mobile-menu-open')})}
  // Close mobile menu when clicking outside or on nav link
  document.addEventListener('click', (e)=>{
    const header = document.querySelector('.site-header');
    const menuOpen = document.body.classList.contains('mobile-menu-open');
    if(!menuOpen) return;
    const insideHeader = header && header.contains(e.target);
    if(!insideHeader){ document.body.classList.remove('mobile-menu-open'); }
  });
  document.querySelectorAll('.main-nav a').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('mobile-menu-open')}));

  // Update aria-expanded and aria-hidden when toggling menu
  const mainNav = document.getElementById('main-navigation');
  if(mbBtn && mainNav){
    const setMenuState = (open)=>{
      mbBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      mainNav.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    // initialize
    setMenuState(false);
    mbBtn.addEventListener('click',()=>{ setMenuState(document.body.classList.contains('mobile-menu-open')) });
    // when closed by outside click
    document.addEventListener('click',(e)=>{ if(!mainNav.contains(e.target) && !mbBtn.contains(e.target)) setMenuState(false) });
    // when link clicked
    document.querySelectorAll('#main-navigation a').forEach(a=>a.addEventListener('click',()=>setMenuState(false)));
  }
});

// Cart Drawer Logic
document.addEventListener('DOMContentLoaded', function() {
  const overlay = document.getElementById('cart-drawer-overlay');
  
  window.openCartDrawer = function() {
    document.body.classList.add('cart-drawer-open');
    overlay.classList.add('active');
  };

  window.closeCartDrawer = function() {
    document.body.classList.remove('cart-drawer-open');
    overlay.classList.remove('active');
  };

  window.refreshCartDrawer = function() {
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

document.addEventListener('DOMContentLoaded', function() {
  const mainGallery = document.querySelector('.product-gallery-splide');
  const thumbGallery = document.querySelector('.product-gallery-thumbnails');

  if (mainGallery) {
    const mainSplide = new Splide(mainGallery, {
      type: 'fade',
      rewind: true,
      pagination: false,
      arrows: true,
    });

    if (thumbGallery) {
      const thumbSplide = new Splide(thumbGallery, {
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
  }

  // Lightbox Logic
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = document.querySelector('.lightbox__img');
  const lightboxClose = document.querySelector('.lightbox__close');

  if (lightbox && lightboxImg && lightboxClose) {
    document.querySelectorAll('.product-gallery-splide .gallery__image img').forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function() {
        const fullSrc = this.getAttribute('data-full');
        if (fullSrc) {
          lightboxImg.src = fullSrc;
          lightbox.setAttribute('aria-hidden', 'false');
          lightbox.classList.add('open');
          document.body.style.overflow = 'hidden';
        }
      });
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
