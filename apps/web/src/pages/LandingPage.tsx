import React from 'react';
import { RoleSelectionSection } from './landing/RoleSelectionSection';

export const LandingPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 md:py-10 flex flex-col gap-8 md:gap-10">
      {/* Hero Section Container (Figma D | 00.01 Landing) */}
      <section className="bg-gradient-to-r from-[#EFF6FF] via-[#F4F8FD] to-[#E5F0FF] rounded-3xl p-6 sm:p-10 md:p-12 border border-[#E0EAFF] flex flex-col-reverse md:flex-row items-center justify-between gap-6 md:gap-10 shadow-xs">
        <div className="flex-1 flex flex-col text-center md:text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[var(--lf-ink)] tracking-tight leading-tight">
            Barangmu hilang?
          </h1>
          <p className="text-sm sm:text-base text-[var(--lf-muted)] leading-relaxed max-w-lg mt-3">
            Tenang, barangmu mungkin sudah ditemukan! Yuk, cek barang temuan di sekitar kampus.
          </p>
        </div>

        {/* Hero Illustration */}
        <div className="w-full md:w-5/12 max-w-xs md:max-w-sm flex justify-center">
          <img
            src="/assets/illustrations/landing/Kotak Barang Hilang dan Ditemukan.png"
            alt="Ilustrasi Kotak Barang Temuan"
            className="w-full h-auto max-h-[240px] md:max-h-[280px] object-contain select-none"
          />
        </div>
      </section>

      {/* Role Selection Section (Figma: Masuk ke UBL LostnFound) */}
      <RoleSelectionSection />
    </div>
  );
};
