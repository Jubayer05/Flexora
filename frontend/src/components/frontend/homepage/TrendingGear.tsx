import { cn } from '@/lib/utils'

export default function TrendingGear() {
  return (
    <section className="py-20 max-w-[1440px] mx-auto px-20">
      <h2
        className={cn(
          'font-[Bebas_Neue] text-[48px] leading-[48px] tracking-[0.02em] font-bold mb-12 text-[var(--foreground)]'
        )}
      >
        TRENDING GEAR
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            category: 'Supplements',
            name: 'ISOLATE ELITE PRO',
            price: '$59.99',
            oldPrice: '$75.00',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSwYdpdNSdaDAMvpBcWrhstJjM2fj9wjCz1c3woBFuPEJoX4meplh2RRaYrPnX02g7Gw9-O1ZvVc2jEXI223I9YQUHbpOSwJQbUBjNpiYFk0WIB0VrwX18QswjHd6pK2SnVVFapHvY1nSApq4dL2iHa6gj2NjbO819KVeKSP6bk7DkGr-l-5OhvCZwI4EHHcigF1AYubUR9aDB1XvY0FAnS40mEl08VIG_8xJkLNWOHRG897DM5scz7vT2H6VUiaumTGXV-2xKrroR'
          },
          {
            category: 'Apparel',
            name: 'TECH-FLUX PERFORMANCE TEE',
            price: '$34.99',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxbYOdEiDc4ujUOW37dZbs2gQessA2EVAgBfIGW75Ia8Cg6AXTFgA494DgCynGsbP0pQOTYrWR2l6Xt9ByB_f-GXMkzfnzi_oa9-6CXI5-jiZY0gcMOYTAwYMTbjO8D8c1VckuOmnKAh87gD0FtuxdEc5hTpMpDRBBB7EB07iPHiPaniCd0RIwRmYINvDo7GqsY6cqy38i9Urq6C1cZNG5xPi4uahf9psPy_0fc1mlLRNgERBjmDiwlaTh5o0lt1phLBeeDDwNrGPB',
            isActive: true
          },
          {
            category: 'Recovery',
            name: 'DEEP RECOVERY BUNDLE',
            price: '$129.99',
            oldPrice: '$150.00',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1qD45EUVLaeTy2hVwY9bLGyBiaUkXUC2PBQ1hhQ8PEOuGzhQ7laABfQFas9HARx6SEYuea9wSgqJy06Sc_N0wmcKu9lxaqWF7qBPbs_ixjLMSubNHdE3jQQUbPxVpTslgPSM9iFg0MNLORs3AeWGk4bUcSLW8ICKkAUMvYrHpzbMOOm4w3C6sJW4HFXuUmYdlIfrBON7dKNDE0m3X_3sTvRD3lxdMqqJvkRXkc7fT9--b1XgX4Jb2sbLsEyigfQhtSaPiCXZ_fUht'
          },
          {
            category: 'Equipment',
            name: 'HEX-BOLT DUMBBELLS (25KG)',
            price: '$199.99',
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSAEFA8Ln2URHdhpMcYL1SBl_xww_BKN800O10O86fF9dbEpkw-ald_up0dYS9Z3uWnsAPpT3VkjQlO704b8JJDaCfGZSUQNleklItLkHv7JRpH8KJqfZ94hnB86DwnSnHZB_xN-gKef4DRC63V4PVbaUlYmJU1kvQx01djApRNBt1eG9B4mMGFEIr89r76lF4bJCtdpV4PY6NWsB16EoifeQMnFh64YR7H9rsKncDZoy_xtzEBrp3-c3bY3srMTp5xmOdZyzpShC8'
          }
        ].map((product, index) => (
          <div
            key={index}
            className={cn(
              'glass-card p-3 rounded-xl relative group',
              product.isActive && 'border-[var(--primary-fixed-dim)]/40 ring-1 ring-[var(--primary-fixed-dim)]/20'
            )}
          >
            <div
              className={cn(
                'aspect-square rounded-lg bg-[var(--surface-container-high)] overflow-hidden mb-3 relative'
              )}
            >
              <img
                alt="Product"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                src={product.image}
              />
              <button
                className={cn(
                  'absolute top-3 right-3 w-10 h-10 rounded-full',
                  'flex items-center justify-center transition-colors',
                  product.isActive
                    ? 'fire-gradient text-white'
                    : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-[var(--foreground)] hover:text-[var(--primary)]'
                )}
              >
                <span
                  className="material-symbols-outlined"
                  data-icon="favorite"
                  style={product.isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                >
                  favorite
                </span>
              </button>
            </div>
            <div className="px-1">
              <p
                className={cn(
                  'font-[JetBrains_Mono] text-[14px] leading-[18px] tracking-[-0.01em] font-medium uppercase mb-1 tracking-tight text-[var(--primary)]'
                )}
              >
                {product.category}
              </p>
              <h5
                className={cn(
                  'font-[Outfit] text-[18px] leading-[28px] font-bold mb-1 truncate text-[var(--foreground)]'
                )}
              >
                {product.name}
              </h5>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'font-[JetBrains_Mono] text-[20px] leading-[24px] tracking-[-0.02em] font-semibold text-[var(--primary)]'
                  )}
                >
                  {product.price}
                </span>
                {product.oldPrice && (
                  <span
                    className={cn(
                      'font-[JetBrains_Mono] text-[14px] leading-[18px] tracking-[-0.01em] font-medium text-[var(--on-surface-variant)] line-through'
                    )}
                  >
                    {product.oldPrice}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}