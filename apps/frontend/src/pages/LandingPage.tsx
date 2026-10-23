import React from 'react';
import { RoleSelectionSection } from './landing/RoleSelectionSection';

export const LandingPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 md:py-10 flex flex-col gap-8 md:gap-10">
      {/* Hero Panoramic Banner (Figma Exact 3D Visual) */}
      <section className="relative rounded-3xl overflow-hidden border border-[#E0EAFF] shadow-xs min-h-[200px] sm:min-h-[230px] md:min-h-[260px] lg:min-h-[280px] flex items-center bg-[#F4F8FD]">
        {/* Full Panoramic 3D Banner Image */}
        <img
          src={`${import.meta.env.BASE_URL}assets/illustrations/landing/banner-hero-lostnfound.png`}
          alt="Banner UBL LostnFound"
          className="absolute inset-0 w-full h-full object-cover object-right select-none pointer-events-none"
          loading="eager"
        />

        {/* Mobile Soft Readable Overlay Shield (Active only on small screens <640px) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F4F8FD]/95 via-[#F4F8FD]/75 to-transparent sm:hidden pointer-events-none" />

        {/* Hero Text Content */}
        <div className="relative z-10 px-6 sm:px-10 md:px-12 lg:px-14 py-6 sm:py-8 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--lf-ink)] tracking-tight leading-tight">
            Barangmu hilang?
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-[var(--lf-muted)] leading-relaxed mt-2 sm:mt-2.5 font-medium">
            Tenang, barangmu mungkin sudah ditemukan! Yuk, cek barang temuan di sekitar kampus.
          </p>
        </div>
      </section>

      {/* Role Selection Section (Figma: Masuk ke UBL LostnFound) */}
      <RoleSelectionSection />
    </div>
  );
};