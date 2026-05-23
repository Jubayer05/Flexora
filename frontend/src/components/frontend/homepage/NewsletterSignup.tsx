'use client'

export default function NewsletterSignup() {
  return (
    <section className="w-full py-6 sm:py-8 px-4">
      <div className="glass-card rounded-xl p-4 sm:p-5 flex flex-col md:flex-row items-center gap-4 border border-[var(--primary)]/20">
        <div className="flex-1 text-center md:text-left">
          <h2
            className="mb-1"
            style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(22px, 3vw, 28px)', lineHeight: '1', letterSpacing: '0.02em', fontWeight: 700 }}
          >
            JOIN THE ELITE LIST
          </h2>
          <p
            className="text-[var(--on-surface-variant)]"
            style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', lineHeight: '1.4' }}
          >
            Get early access to drops, exclusive training programs, and elite athlete insights.
          </p>
        </div>
        <div className="flex-shrink-0 w-full md:w-auto">
          <form className="flex flex-col sm:flex-row gap-2">
            <input
              className="rounded-lg px-3 py-2 focus:outline-none focus:ring-2 w-full sm:w-40 md:w-48 bg-[var(--surface-container)] border border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:ring-[var(--primary)] focus:border-[var(--primary)]"
              style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px' }}
              placeholder="Enter your email"
              type="email"
            />
            <button
              className="fire-gradient px-4 py-2 rounded-lg text-white shadow-lg shadow-[var(--primary-fixed-dim)]/20 hover:scale-105 transition-all whitespace-nowrap min-w-[100px]"
              style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '18px', lineHeight: '1', letterSpacing: '0.02em', fontWeight: 700 }}
            >
              Sign Up
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}