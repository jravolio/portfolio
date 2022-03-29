class MobileNavbar {
    constructor(mobileMenu, navList, navLinks) {
      this.mobileMenu = document.querySelector(mobileMenu);
      this.navList = document.querySelector(navList);
      this.navLinks = document.querySelectorAll(navLinks);
      this.activeClass = "active";
  
      this.handleClick = this.handleClick.bind(this);
    }
  
    animateLinks() {
      this.navLinks.forEach((link, index) => {
        link.style.animation
          ? (link.style.animation = "")
          : (link.style.animation = `navLinkFade 0.3s ease forwards ${
              index / 7 + 0.3
            }s`);
      });
    }
  
    handleClick() {
      this.navList.classList.toggle(this.activeClass);
      this.mobileMenu.classList.toggle(this.activeClass);
      this.animateLinks();
    }
  
    addClickEvent() {
      this.mobileMenu.addEventListener("click", this.handleClick);
    }
  
    init() {
      if (this.mobileMenu) {
        this.addClickEvent();
      }
      return this;
    }
  }
  
  const mobileNavbar = new MobileNavbar(
    ".mobile-menu",
    ".nav-list",
    ".nav-list li",
  );
  mobileNavbar.init();

// close menu
function takeOffAttributesOfMenu(){
  const links = document.querySelectorAll('nav ul li a')
  const navDiv = document.querySelector('.navbar div')
  const ul = document.querySelector('.navbar ul.nav-list')
  const liAnimation = document.querySelectorAll('.navbar ul.nav-list li')
  
  for (const link of links){
    link.addEventListener('click', function(){
      navDiv.classList.remove('active')
      ul.classList.remove('active')
      for(const li of liAnimation){
        li.removeAttribute("style")
      }
      })
  }
}

takeOffAttributesOfMenu()


//SWIPER

const swiper = new Swiper('.swiper-container',{
  slidesPerView: 1,
  pagination: {
      el: '.swiper-pagination'
  },
  mousewheel: true,
  keyboard: true,
  breakpoints: {
      767:{
          slidesPerView: 2,
          setWrapperSize: true
      }
  }
})


//Scroll reveal
const scrollReveal = ScrollReveal({
  origin:'top',
  distance: '20px',
  duration: 700,
  reset: true
})

scrollReveal.reveal(`#home .avatar, #home .text, #home .about-me, #home .swiper-container,
#experience h1 .title, #experience .card,
#projects,
#education h1.title, #education .education-card,
footer`, 
{interval:100})

// BACK TO TOP
window.addEventListener('scroll', function(){
  const backToTopButton = document.querySelector('.back-to-top')
      if(window.scrollY >= 560) {
          backToTopButton.classList.add('show')
      }
      else{
          backToTopButton.classList.remove('show')
      }})
