"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, RotateCcw, ShieldCheck, WifiOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";

/** Um passeio ilustrativo pelo fluxo documentado, sem telas ou dados do cliente. */
export function RegistraInterativo({
  aberto,
  aoAlternar,
}: {
  aberto: boolean;
  aoAlternar: () => void;
}) {
  const { registraPreview: copy } = useTranslations().projects;
  const [etapa, setEtapa] = useState(0);
  const reduzirMovimento = useReducedMotion();
  const alternar = () => {
    setEtapa(0);
    aoAlternar();
  };

  return (
    <div
      data-registra-preview
      className="min-w-0 overflow-clip rounded-[1.6rem] border border-line bg-[#0b0d12] text-[#e6e8ee]"
    >
      <div className="flex h-48 items-center justify-between border-b border-white/15 px-16">
        <span className="flex items-center gap-8 type-sub uppercase tracking-[0.2em]">
          <Image src="/projects/registra-mark.png" alt="" width={25} height={25} />
          Registra
        </span>
        <button
          type="button"
          onClick={alternar}
          className="type-button uppercase text-[#e6e8ee] transition-colors hover:text-[#e0a82e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e0a82e] motion-reduce:transition-none"
        >
          {aberto ? copy.close : copy.open}
        </button>
      </div>

      <div className="relative isolate aspect-[4/3] overflow-hidden md:aspect-[16/10]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-75"
          style={{
            backgroundImage:
              "linear-gradient(rgba(154,163,181,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(154,163,181,.07) 1px, transparent 1px), radial-gradient(circle at 82% 36%, rgba(224,168,46,.19), transparent 49%)",
            backgroundSize: "32px 32px, 32px 32px, 100% 100%",
          }}
        />

        {!aberto ? (
          <button
            type="button"
            onClick={alternar}
            className="group absolute inset-0 w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-6px] focus-visible:outline-[#e0a82e]"
          >
            <div
              aria-hidden
              className="absolute right-[5%] top-[7%] h-[72%] w-[52%] rotate-[9deg] rounded-[1.3rem] border border-[#e0a82e]/35 bg-[#1a1e27]/85 shadow-[0_25px_70px_#0009] md:right-[10%] md:h-[78%] md:w-[42%]"
            >
              <div className="absolute inset-[8%] rounded-[.7rem] border border-white/10" />
              <Image
                src="/projects/registra-mark.png"
                alt=""
                fill
                sizes="(min-width: 768px) 280px, 190px"
                className="object-contain p-[16%] drop-shadow-[0_0_35px_#e0a82e55] transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
              />
              <span className="absolute bottom-[9%] left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-[#e0a82e] to-transparent" />
            </div>

            <div className="absolute bottom-[9%] left-[7%] z-10 w-[62%] md:bottom-[11%] md:left-[8%] md:w-[53%]">
              <p className="type-sub uppercase tracking-[0.18em] text-[#f4c46b]">
                {copy.eyebrow}
              </p>
              <h4 className="mt-12 max-w-[13ch] text-[clamp(1.45rem,3.2vw,2.8rem)] font-semibold leading-[1.04] tracking-[-0.055em] text-white">
                {copy.coverTitle}
              </h4>
              <p className="mt-12 max-w-[30ch] text-[clamp(.72rem,1.2vw,.95rem)] leading-snug text-[#c7ccd6]">
                {copy.coverBody}
              </p>
              <span className="mt-16 inline-flex items-center gap-8 border-b border-[#e0a82e] pb-4 type-button uppercase text-[#f4c46b]">
                {copy.open} <ArrowRight aria-hidden size={15} />
              </span>
            </div>
          </button>
        ) : (
          <>
            <div className="absolute left-[7%] top-[7%] z-20 flex items-center gap-10 md:left-[8%]">
              <span className="size-6 rounded-full bg-[#e0a82e] shadow-[0_0_15px_#e0a82e80]" aria-hidden />
              <span className="type-sub uppercase tracking-[0.15em] text-[#c7ccd6]">
                {copy.illustration}
              </span>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={etapa}
                initial={reduzirMovimento ? false : { opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduzirMovimento ? undefined : { opacity: 0, x: -18 }}
                transition={{ duration: reduzirMovimento ? 0 : 0.28, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <div className="absolute left-[7%] top-[24%] z-10 w-[46%] md:left-[8%] md:w-[44%]">
                  <p className="type-sub uppercase tracking-[0.2em] text-[#f4c46b]">
                    0{etapa + 1} / 03 · {copy.stages[etapa]}
                  </p>
                  <h4 className="mt-10 max-w-[11ch] text-[clamp(1.35rem,3vw,2.6rem)] font-semibold leading-[1.05] tracking-[-0.055em] text-white">
                    {copy.titles[etapa]}
                  </h4>
                  <p aria-live="polite" className="mt-12 max-w-[29ch] text-[clamp(.72rem,1.15vw,.91rem)] leading-snug text-[#c7ccd6]">
                    {copy.captions[etapa]}
                  </p>
                </div>

                <div aria-hidden className="absolute right-[5%] top-[21%] h-[57%] w-[42%] md:right-[9%] md:h-[59%] md:w-[36%]">
                  {etapa === 0 && (
                    <>
                      <div className="absolute left-0 top-[5%] h-[88%] w-[72%] -rotate-[10deg] rounded-[3px] bg-[#ede7db] p-[7%] shadow-[0_20px_50px_#0009]">
                        <div className="text-[clamp(.4rem,.8vw,.6rem)] font-bold uppercase tracking-[.1em] text-[#463d2e]">{copy.paper}</div>
                        <div className="mt-[10%] h-px bg-[#aba08c]" />
                        <div className="mt-[14%] space-y-[10%]">
                          <div className="h-7 w-[83%] bg-[#ccc2b1]" /><div className="h-7 w-[68%] bg-[#ccc2b1]" /><div className="h-7 w-[78%] bg-[#ccc2b1]" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 right-0 h-[94%] w-[77%] rotate-[4deg] rounded-[1rem] border-[5px] border-[#4a5261] bg-[#12151c] p-[6%] shadow-[0_25px_55px_#000b]">
                        <div className="flex justify-between border-b border-white/15 pb-[7%] text-[clamp(.35rem,.7vw,.55rem)] uppercase tracking-[.1em] text-[#f4c46b]"><span>Registra</span><span>●</span></div>
                        <div className="mt-[10%] text-[clamp(.42rem,.85vw,.67rem)] font-semibold text-white">{copy.form}</div>
                        <div className="mt-[8%] rounded-[3px] border border-white/15 bg-[#1a1e27] px-[6%] py-[5%] text-[clamp(.36rem,.7vw,.55rem)] text-[#c7ccd6]">{copy.field}</div>
                        <div className="mt-[6%] rounded-[3px] border border-white/15 bg-[#1a1e27] px-[6%] py-[5%] text-[clamp(.36rem,.7vw,.55rem)] text-[#c7ccd6]">{copy.note}</div>
                        <div className="mt-[8%] h-[7%] rounded-[3px] bg-[#e0a82e]" />
                      </div>
                    </>
                  )}

                  {etapa === 1 && (
                    <div className="absolute inset-x-[7%] inset-y-0 rotate-[-3deg] rounded-[1.1rem] border-[5px] border-[#4a5261] bg-[#12151c] p-[8%] shadow-[0_25px_55px_#000b]">
                      <div className="flex items-center gap-6 border-b border-white/15 pb-[8%] text-[clamp(.45rem,.8vw,.65rem)] font-semibold uppercase tracking-[.12em] text-[#f4c46b]"><WifiOff size={13} /> Offline</div>
                      <div className="mt-[10%] text-[clamp(.65rem,1.2vw,1rem)] font-semibold text-white">{copy.local}</div>
                      <div className="mt-[9%] flex items-center gap-7 rounded-[5px] border border-white/10 bg-[#1a1e27] px-[7%] py-[6%]"><span className="size-7 rounded-full bg-[#e0a82e]" /><span className="h-6 w-[65%] bg-[#566070]" /></div>
                      <div className="mt-[6%] flex items-center gap-7 rounded-[5px] border border-white/10 bg-[#1a1e27] px-[7%] py-[6%]"><span className="size-7 rounded-full bg-[#e0a82e]" /><span className="h-6 w-[51%] bg-[#566070]" /></div>
                      <div className="mt-[10%] border-t border-white/15 pt-[7%] text-[clamp(.4rem,.7vw,.58rem)] uppercase tracking-[.09em] text-[#c7ccd6]">{copy.pending}</div>
                    </div>
                  )}

                  {etapa === 2 && (
                    <div className="absolute inset-x-[8%] inset-y-0 rotate-[3deg] rounded-[4px] border border-[#d7cbb6] bg-[#f3f0e9] p-[9%] text-[#27231d] shadow-[0_25px_55px_#000b]">
                      <div className="border-b border-[#c2b6a3] pb-[8%] text-[clamp(.42rem,.85vw,.68rem)] font-bold uppercase tracking-[.1em]">{copy.final}</div>
                      <div className="mt-[11%] space-y-[8%]"><div className="h-7 w-[85%] bg-[#d4ccbe]"/><div className="h-7 w-[70%] bg-[#d4ccbe]"/><div className="h-7 w-[78%] bg-[#d4ccbe]"/></div>
                      <div className="mt-[11%] flex items-center gap-7 border-t border-[#c2b6a3] pt-[9%] text-[clamp(.42rem,.8vw,.65rem)] font-bold uppercase tracking-[.07em] text-[#74540c]"><ShieldCheck size={20} /> {copy.verified}</div>
                      <div className="mt-[8%] flex gap-7 text-[clamp(.37rem,.72vw,.55rem)] uppercase tracking-[.08em] text-[#655e54]"><span>ECDSA P-256</span><span>SHA-256</span></div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="absolute bottom-[6%] left-[7%] right-[7%] z-20 flex items-center gap-10 md:left-[8%] md:right-[8%]">
              <span className="type-sub tracking-[.12em] text-[#c7ccd6]">0{etapa + 1} / 03</span>
              <span className="flex min-w-0 flex-1 gap-4" aria-hidden>
                {copy.stages.map((_, index) => (
                  <span key={index} className={`h-2 min-w-0 flex-1 rounded-full ${index <= etapa ? "bg-[#e0a82e]" : "bg-white/20"}`} />
                ))}
              </span>
              <button
                type="button"
                onClick={() => setEtapa((atual) => (atual + 1) % copy.stages.length)}
                className="inline-flex min-h-40 items-center justify-center gap-7 rounded-[5px] bg-[#e0a82e] px-10 type-button uppercase text-[#1a1300] transition-colors hover:bg-[#f4c46b] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#f4c46b] motion-reduce:transition-none"
              >
                {copy.actions[etapa]}
                {etapa === 2 ? <RotateCcw aria-hidden size={14} /> : <ArrowRight aria-hidden size={14} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
