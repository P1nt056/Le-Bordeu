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
