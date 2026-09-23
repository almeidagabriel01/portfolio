"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  CloudOff,
  FileText,
  History,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "@/hooks/useTranslations";

type Copy = ReturnType<typeof useTranslations>["projects"]["registraPreview"];

/** Ilustração das telas Compose, sem dados do cliente. O produto é tablet-first. */
function TelaAndroid({ etapa, copy }: { etapa: number; copy: Copy }) {
  return (
    <div
      aria-hidden="true"
      className="relative h-[432px] w-[218px] shrink-0 rounded-[2.25rem] border-[5px] border-[#343a43] bg-[#050609] p-[5px] shadow-[0_28px_65px_#000b,0_0_0_1px_#ffffff24]"
    >
      <div className="absolute left-1/2 top-[10px] z-10 size-[8px] -translate-x-1/2 rounded-full bg-[#030407] ring-2 ring-[#252a32]" />
      <div className="relative flex size-full flex-col overflow-hidden rounded-[1.7rem] bg-[#0b0d12] font-sans text-[#e6e8ee]">
        <div className="flex h-[26px] shrink-0 items-center justify-between px-16 pt-4 text-[9px] font-semibold">
          <span>09:41</span>
          <span className="flex items-center gap-3">
            <Wifi size={11} />
            <span className="h-[6px] w-[12px] rounded-[2px] border border-[#e6e8ee] before:block before:m-[1px] before:h-[2px] before:w-[7px] before:bg-[#e6e8ee]" />
          </span>
        </div>
        <div className="flex h-[42px] shrink-0 items-center justify-between border-b border-[#2a2f3b] bg-[#1f232e] px-12">
          <span className="flex items-center gap-7">
            <ArrowLeft size={13} />
            <Image
              src="/projects/registra-mark.png"
              alt=""
              width={18}
              height={18}
            />
            <span className="text-[11px] font-semibold">Registra</span>
          </span>
          <History size={14} className="text-[#9aa3b5]" />
        </div>

        {etapa === 0 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="px-14 pt-11">
              <p className="text-[8px] font-medium uppercase tracking-[.16em] text-[#e0a82e]">
                01 / 03 · {copy.stages[0]}
              </p>
              <h5 className="mt-5 text-[15px] font-bold leading-tight">
                {copy.form}
              </h5>
              <div className="mt-9 h-[3px] overflow-hidden rounded-full bg-[#2a2f3b]">
                <div className="h-full w-[35%] rounded-full bg-[#e0a82e]" />
              </div>
              <div className="mt-8 flex gap-4 text-[8px] font-medium">
                <span className="rounded-full bg-[#3d2a00] px-8 py-5 text-[#ffdea8]">
                  1 {copy.phoneData}
                </span>
                <span className="rounded-full bg-[#1a1e27] px-8 py-5 text-[#9aa3b5]">
                  2 {copy.phoneReview}
                </span>
              </div>
            </div>
            <div className="mx-10 mt-10 rounded-[12px] border border-[#2a2f3b] bg-[#12151c] p-8">
              <p className="text-[10px] font-semibold">{copy.field}</p>
              <div className="mt-8 flex items-center justify-between rounded-[8px] border border-[#2a2f3b] bg-[#1a1e27] px-9 py-7 text-[9px]">
                <span>{copy.phoneConform}</span>
                <CircleCheck size={12} className="text-[#22c55e]" />
              </div>
              <p className="mt-8 text-[9px] font-medium">{copy.note}</p>
              <div className="mt-5 min-h-[38px] rounded-[8px] border border-[#2a2f3b] bg-[#1a1e27] px-9 py-7 text-[9px] text-[#9aa3b5]">
                {copy.phoneOptional}
              </div>
            </div>
            <div className="mt-auto border-t border-[#2a2f3b] bg-[#12151c] p-8">
              <div className="flex items-center justify-between text-[8px] text-[#9aa3b5]">
                <span>{copy.phoneDraft}</span>
                <span>01 / 03</span>
              </div>
              <div className="mt-6 flex h-[27px] items-center justify-center gap-5 rounded-[8px] bg-[#e0a82e] text-[9px] font-semibold text-[#1a1300]">
                {copy.phoneNext}
                <ArrowRight size={11} />
              </div>
            </div>
          </div>
        )}

        {etapa === 1 && (
          <div className="flex min-h-0 flex-1 flex-col px-11 pt-13">
            <p className="text-[8px] font-medium uppercase tracking-[.16em] text-[#e0a82e]">
              02 / 03 · {copy.stages[1]}
            </p>
            <h5 className="mt-5 text-[16px] font-bold">{copy.phoneRecords}</h5>
            <div className="-mx-11 mt-12 flex gap-11 overflow-hidden border-b border-[#2a2f3b] px-11 text-[8px] text-[#9aa3b5]">
              {copy.phoneTabs.map((tab, index) => (
                <span
                  key={tab}
                  className={
                    index === 2
                      ? "shrink-0 border-b-2 border-[#e0a82e] pb-8 font-semibold text-[#e0a82e]"
                      : "shrink-0 pb-8"
                  }
                >
                  {tab}
                </span>
              ))}
            </div>
            <div className="mt-15 rounded-[13px] border border-[#2a2f3b] bg-[#12151c] p-11">
              <div className="flex items-start justify-between gap-6">
                <span className="flex size-27 items-center justify-center rounded-[8px] bg-[#3d2a00] text-[#e0a82e]">
                  <FileText size={14} />
                </span>
                <span className="rounded-full bg-[#3d2a00] px-7 py-4 text-[7px] font-semibold text-[#ffdea8]">
                  {copy.phoneDraft}
                </span>
              </div>
              <p className="mt-11 text-[10px] font-semibold">{copy.form}</p>
              <p className="mt-4 text-[8px] text-[#9aa3b5]">{copy.local}</p>
              <div className="mt-11 flex items-center gap-5 border-t border-[#2a2f3b] pt-9 text-[8px] text-[#e0a82e]">
                <CloudOff size={11} />
                {copy.pending}
              </div>
            </div>
            <div className="mt-auto -mx-11 flex h-[47px] shrink-0 items-center justify-around border-t border-[#2a2f3b] bg-[#12151c] text-[8px] text-[#9aa3b5]">
              <span className="flex flex-col items-center gap-3 text-[#e0a82e]">
                <FileText size={14} />
                {copy.phoneRecords}
              </span>
              <span className="flex flex-col items-center gap-3">
                <CircleCheck size={14} />
                {copy.phoneNew}
              </span>
            </div>
          </div>
        )}

        {etapa === 2 && (
          <div className="flex min-h-0 flex-1 flex-col px-13 pt-14">
            <p className="text-[8px] font-medium uppercase tracking-[.16em] text-[#e0a82e]">
              03 / 03 · {copy.stages[2]}
            </p>
            <div className="mt-12 flex size-[37px] items-center justify-center rounded-[12px] bg-[#052e16] text-[#22c55e]">
              <LockKeyhole size={18} />
            </div>
            <h5 className="mt-10 text-[15px] font-bold leading-tight">
              {copy.final}
            </h5>
            <p className="mt-5 text-[9px] text-[#9aa3b5]">{copy.form}</p>
            <div className="mt-16 rounded-[13px] border border-[#215c37] bg-[#052e16] p-11">
              <div className="flex items-center gap-7 text-[#22c55e]">
                <ShieldCheck size={17} />
                <span className="text-[10px] font-semibold">
                  {copy.verified}
                </span>
              </div>
              <p className="mt-7 text-[8px] leading-relaxed text-[#a8d8b7]">
                {copy.phoneSignature}
              </p>
            </div>
            <div className="mt-17 space-y-10 border-t border-[#2a2f3b] pt-13 text-[9px]">
              <div className="flex justify-between">
                <span className="text-[#9aa3b5]">{copy.phoneStatus}</span>
                <span className="flex items-center gap-4 text-[#22c55e]">
                  <Check size={10} />
                  {copy.phoneSigned}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#9aa3b5]">{copy.phoneProtection}</span>
                <span>SHA-256</span>
              </div>
            </div>
            <div className="mb-13 mt-auto rounded-[8px] border border-[#2a2f3b] py-9 text-center text-[9px] font-semibold">
              {copy.phoneDetails}
            </div>
          </div>
        )}
        <div className="absolute bottom-[4px] left-1/2 h-[3px] w-[64px] -translate-x-1/2 rounded-full bg-[#e6e8ee]/80" />
      </div>
    </div>
  );
}

export function RegistraInterativo({
  aberto,
  aoAlternar,
}: {
  aberto: boolean;
  aoAlternar: () => void;
}) {
  const { registraPreview: copy } = useTranslations().projects;
  const [etapa, setEtapa] = useState(0);
  const alternar = () => {
    setEtapa(0);
    aoAlternar();
  };

  return (
    <div
      data-registra-preview
      className="min-w-0 overflow-clip rounded-[1.6rem] border border-line bg-[#0b0d12] text-[#e6e8ee]"
    >
      <div className="flex items-center justify-between gap-16 border-b border-white/15 bg-[#141414] px-16 py-12">
        <span className="flex min-w-0 items-center gap-12">
          <span aria-hidden className="size-8 shrink-0 bg-accent" />
          <span className="truncate type-sub uppercase text-white/55">
            {copy.windowLabel}
          </span>
        </span>
        <button
          type="button"
          onClick={alternar}
          className="shrink-0 type-button uppercase text-white transition-colors hover:text-[#e0a82e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e0a82e] motion-reduce:transition-none"
        >
          {aberto ? copy.close : copy.open}
        </button>
      </div>

      <div className="relative isolate overflow-hidden lg:aspect-[16/10]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 74% 52%, rgba(224,168,46,.13), transparent 38%), linear-gradient(120deg, #151820, #0b0d12 62%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(154,163,181,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(154,163,181,.09) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative grid grid-rows-[auto_1fr] gap-20 px-24 py-28 lg:absolute lg:inset-0 lg:grid-cols-[minmax(0,1fr)_minmax(210px,.7fr)] lg:grid-rows-1 lg:items-center lg:gap-16 lg:px-[7%] lg:py-[6%]">
          <div className="relative z-10 flex max-w-[390px] flex-col items-start lg:pr-12">
            <p className="flex items-center gap-8 type-sub uppercase tracking-[.15em] text-[#f4c46b]">
              <span aria-hidden className="size-6 rounded-full bg-[#e0a82e]" />
              {copy.eyebrow}
            </p>
            <div
              aria-live={aberto ? "polite" : "off"}
              className="mt-16 lg:mt-22"
            >
              {aberto && (
                <p className="type-sub uppercase tracking-[.17em] text-[#f4c46b]">
                  0{etapa + 1} / 03 · {copy.stages[etapa]}
                </p>
              )}
              <h4 className="mt-8 max-w-[12ch] text-[clamp(28px,3vw,42px)] font-semibold leading-[1.07] tracking-[-.05em] text-white">
                {aberto ? copy.titles[etapa] : copy.coverTitle}
              </h4>
              <p className="mt-13 max-w-[32ch] text-[clamp(14px,1.15vw,16px)] leading-relaxed text-[#c7ccd6]">
                {aberto ? copy.captions[etapa] : copy.coverBody}
              </p>
            </div>
            {aberto && (
              <div className="mt-22 flex flex-wrap items-center gap-14 lg:mt-30">
                <button
                  type="button"
                  onClick={() =>
                    setEtapa((atual) => (atual + 1) % copy.stages.length)
                  }
                  className="inline-flex min-h-42 items-center gap-8 rounded-[8px] bg-[#e0a82e] px-14 type-button uppercase text-[#1a1300] transition-colors hover:bg-[#f4c46b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f4c46b] motion-reduce:transition-none"
                >
                  {copy.actions[etapa]}
                  {etapa === 2 ? (
                    <RotateCcw aria-hidden size={15} />
                  ) : (
                    <ArrowRight aria-hidden size={15} />
                  )}
                </button>
                <span className="type-sub text-[#9aa3b5]">
                  0{etapa + 1} / 03
                </span>
              </div>
            )}
            {aberto && (
              <p className="mt-16 max-w-[34ch] type-sub leading-relaxed text-[#9aa3b5]">
                {copy.illustration}
              </p>
            )}
          </div>
          <div className="relative flex min-h-0 items-center justify-center lg:size-full">
            <TelaAndroid etapa={aberto ? etapa : 0} copy={copy} />
          </div>
        </div>
        {!aberto && (
          <button
            type="button"
            data-registra-cover
            aria-label={`${copy.open} · Registra`}
            onClick={alternar}
            className="group/janela absolute inset-0 z-20 flex flex-col items-start justify-end bg-black/30 p-16 text-left transition-colors duration-300 hover:bg-black/35 focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:outline-[#e0a82e] motion-reduce:transition-none"
          >
            <span className="flex max-w-[240px] flex-col gap-10 rounded-[0.6rem] border border-white/20 bg-[#111]/95 px-16 py-14 text-white shadow-[0_12px_32px_#0005] transition-transform duration-300 group-hover/janela:translate-y-[-2px] motion-reduce:transition-none">
              <span className="text-[15px] font-medium leading-[1.35] text-white">
                {copy.previewNotice}
              </span>
              <span className="flex items-center gap-8 type-button uppercase text-white">
                {copy.open}
                <span aria-hidden>→</span>
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
