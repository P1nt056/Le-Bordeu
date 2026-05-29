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
});
