"use client";

import { useLayoutEffect } from "react";

function getHeaderOffset(header: Element | null) {
  if (!header) return 100;
  return header.classList.contains("active") ? 70 : 100;
}

/**
 * Landing-only: load Bootstrap JS, sticky header class, and smooth-scroll
 * section nav with temporary click-lock so scroll spy does not fight the click.
 */
export function useLandingEffects() {
  useLayoutEffect(() => {
    void import("bootstrap/dist/js/bootstrap.bundle.min.js");

    const header = document.querySelector(".header");
    let clickedHref: string | null = null;
    let clickTimer: ReturnType<typeof setTimeout> | null = null;

    const onScroll = () => {
      if (!header) return;
      if (window.scrollY > 50) header.classList.add("active");
      else header.classList.remove("active");
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const navLinks = document.querySelectorAll<HTMLAnchorElement>(
      ".navbar-nav li.nav-item a[href^='#']"
    );

    const sectionLinks = Array.from(navLinks).filter((link) => {
      const href = link.getAttribute("href");
      return href && href.startsWith("#") && href !== "#/" && !link.hasAttribute("data-bs-toggle");
    });

    const setActiveLink = (href: string | null) => {
      navLinks.forEach((link) => {
        const isActive = href !== null && link.getAttribute("href") === href;
        link.classList.toggle("active", isActive);
      });
    };

    const updateActiveNav = () => {
      if (clickedHref) {
        setActiveLink(clickedHref);
        return;
      }

      const scrollPos = window.scrollY + getHeaderOffset(header) + 20;
      let activeHref: string | null = null;

      for (const link of sectionLinks) {
        const href = link.getAttribute("href");
        if (!href) continue;
        const section = document.querySelector(href);
        if (!section) continue;

        const top = section.getBoundingClientRect().top + window.scrollY;
        if (top <= scrollPos) {
          activeHref = href;
        }
      }

      setActiveLink(activeHref);
    };

    const handleNavClick = (e: Event) => {
      const link = e.currentTarget as HTMLAnchorElement;
      const href = link.getAttribute("href");
      if (!href || href === "#/" || link.hasAttribute("data-bs-toggle")) return;

      e.preventDefault();
      clickedHref = href;
      setActiveLink(href);

      if (clickTimer) clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        clickedHref = null;
        updateActiveNav();
      }, 800);

      const target = document.querySelector(href);
      if (target) {
        const offset = getHeaderOffset(header);
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: "smooth" });
      }

      // Close mobile menu after navigation
      const collapse = document.getElementById("navbarNav");
      if (collapse?.classList.contains("show")) {
        collapse.classList.remove("show");
      }
    };

    navLinks.forEach((link) => {
      if (!link.hasAttribute("data-bs-toggle")) {
        link.addEventListener("click", handleNavClick);
      }
    });

    window.addEventListener("scroll", updateActiveNav, { passive: true });
    window.addEventListener("resize", updateActiveNav, { passive: true });
    updateActiveNav();

    return () => {
      if (clickTimer) clearTimeout(clickTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", updateActiveNav);
      window.removeEventListener("resize", updateActiveNav);
      navLinks.forEach((link) => link.removeEventListener("click", handleNavClick));
    };
  }, []);
}
