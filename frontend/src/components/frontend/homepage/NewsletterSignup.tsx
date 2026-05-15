'use client'

export default function NewsletterSignup() {
  return (
    <section className="w-full py-16 px-4 md:px-8 lg:px-12 xl:px-20">
      <div className="glass-card rounded-2xl p-6 md:p-10 flex flex-col md:flex-row items-center gap-8 border border-[var(--primary)]/20">
        <div className="flex-1 text-center md:text-left">
          <h2
            className="mb-2 text-[var(--foreground)]"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(36px, 5vw, 56px)', lineHeight: '1', letterSpacing: '0.02em', fontWeight: 700 }}
          >
            JOIN THE ELITE LIST
          </h2>
          <p
            className="text-[var(--on-surface-variant)]"
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px', lineHeight: '22px' }}
          >
            Get early access to drops, exclusive training programs, and elite athlete insights.
          </p>
        </div>
        <div className="flex-shrink-0 w-full md:w-auto">
          <form className="flex flex-col sm:flex-row gap-2">
            <input
              className="rounded-lg px-4 py-3 focus:outline-none focus:ring-2 w-full sm:w-64 bg-[var(--surface-container)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}
              placeholder="Enter your email address"
              type="email"
            />
            <button
              className="fire-gradient px-6 py-3 rounded-lg text-white shadow-lg shadow-[var(--primary-fixed-dim)]/20 hover:scale-105 transition-all whitespace-nowrap"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '24px', lineHeight: '1', letterSpacing: '0.02em', fontWeight: 700 }}
            >
              Sign Up
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}