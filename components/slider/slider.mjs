import Swiper from "https://cdn.jsdelivr.net/npm/swiper@11.1.9/+esm";
import {
  Navigation,
} from "https://cdn.jsdelivr.net/npm/swiper@11.1.9/modules/index.min.mjs";
(({ behaviors }) => {
  behaviors.slider = {
    attach: (context) => {
      Array.prototype.forEach.call(
        context.querySelectorAll("[data-slider]:not(.slider-processed)"),
        (slider) => {
          const options = {
            modules: [Navigation],
            navigation: {
              nextEl: slider.querySelector(".o-slider__nav--next"),
              prevEl: slider.querySelector(".o-slider__nav--prev"),
            },
            slidesPerView: "auto",
            spaceBetween: 20,
            scrollbar: {
              el: slider.querySelector(".swiper-scrollbar"),
            },
          };
          options.breakpoints = {
            768: {},
          };

          const swiper = new Swiper(slider.querySelector(".swiper"), options);

          slider.classList.add("slider-processed");
        },
      );
    },
  };
})(Drupal);
