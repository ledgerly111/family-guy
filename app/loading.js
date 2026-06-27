export default function Loading() {
  return (
    <main className="min-h-screen bg-[#06040d] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-[430px] place-items-center overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(176,40,255,.42),transparent_34%),radial-gradient(circle_at_90%_18%,rgba(240,44,166,.28),transparent_30%),linear-gradient(180deg,#170624_0%,#07030d_100%)] px-6">
        <section className="w-full max-w-[280px] text-center">
          <div className="relative mx-auto grid h-24 w-24 place-items-center">
            <div className="finance-loader-ring absolute inset-0 rounded-full" />
            <div className="finance-shimmer relative grid h-16 w-16 place-items-center rounded-[22px] bg-[linear-gradient(135deg,#8e22ff,#ec2b9d)] shadow-[0_20px_46px_rgba(151,48,255,.38)]">
              <svg
                aria-hidden="true"
                className="h-8 w-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  d="M6.5 19V8.6L12 5l5.5 3.6V19h-3.7v-5.2h-3.6V19H6.5Z"
                  stroke="currentColor"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          <p className="mt-7 text-sm font-black uppercase tracking-[0.22em] text-[#d9c8ff]/68">
            Loading Ledger
          </p>
          <h1 className="mt-3 text-[30px] font-black leading-tight">
            Family Guy
          </h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#d9c8ff]/54">
            Syncing your family finances
          </p>

          <div
            aria-hidden="true"
            className="finance-loader-progress mx-auto mt-7 grid w-full grid-cols-4 gap-2"
          >
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>
      </div>
    </main>
  )
}
