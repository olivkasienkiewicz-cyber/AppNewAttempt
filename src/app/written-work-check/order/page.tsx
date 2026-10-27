"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { upload } from "@vercel/blob/client";
import { CheckCircle2, FileText, Upload } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { useLanguage } from "@/context/LanguageContext";
import { BANK_DETAILS } from "@/lib/payment";
import {
  WORK_CHECK_ACCEPT_ATTR,
  WORK_CHECK_ALLOWED_TYPES,
  WORK_CHECK_CONFIG,
  WORK_CHECK_MAX_FILE_BYTES,
  WORK_CHECK_PRODUCTS,
  workCheckPrice,
  type WorkCheck,
  type WorkCheckProduct,
} from "@/lib/work-check";

const serif = "font-[family-name:var(--font-instrument-serif)]";
const inputCls =
  "w-full rounded-md border border-[#0E2A47]/15 bg-white px-3 py-2.5 text-sm text-[#12202B] outline-none focus:border-[#16B8A7] focus:ring-2 focus:ring-[#16B8A7]/20";

export default function WorkCheckOrderPage() {
  const { t, locale } = useLanguage();
  const w = t.workCheck;
  const { data: session, status } = useSession();

  const [product, setProduct] = useState<WorkCheckProduct>("tok_essay");
  const [subject, setSubject] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [secondCheck, setSecondCheck] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [phase, setPhase] = useState<"idle" | "uploading" | "submitting">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ check: WorkCheck; discountError: string | null } | null>(null);

  const cfg = WORK_CHECK_CONFIG[product];
  const total = workCheckPrice(product, { secondCheck });
  const role = session?.user?.role;

  const pickFile = (f: File | null) => {
    setError(null);
    if (!f) return setFile(null);
    if (!(WORK_CHECK_ALLOWED_TYPES as readonly string[]).includes(f.type)) return setError(w.fileTypeError);
    if (f.size > WORK_CHECK_MAX_FILE_BYTES) return setError(w.fileSizeError);
    setFile(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!session?.user?.id) return;
    if (cfg.needsSubject && !subject.trim()) return setError(w.subjectRequired);
    if (!file) return setError(w.fileRequired);

    setPhase("uploading");
    let draftUrl: string;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await upload(`work-checks/${session.user.id}/draft-${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/work-checks/upload",
      });
      draftUrl = blob.url;
    } catch (err) {
      console.error("Draft upload failed", err);
      setPhase("idle");
      return setError(w.uploadError);
    }

    setPhase("submitting");
    try {
      const res = await fetch("/api/work-checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product,
          subject: cfg.needsSubject ? subject : null,
          secondCheck,
          note,
          draftUrl,
          draftName: file.name,
          discountCode: discountCode.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      setResult(await res.json());
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Work check order failed", err);
      setError(w.genericError);
    } finally {
      setPhase("idle");
    }
  };

  return (
    <main className="min-h-screen bg-[#F7F5F0] text-[#12202B]">
      <SiteHeader />

      <section className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#16B8A7]">{w.eyebrow}</p>

        {status === "loading" ? null : status !== "authenticated" ? (
          <div className="mt-4">
            <h1 className={`${serif} text-4xl text-[#0E2A47]`}>{w.orderTitle}</h1>
            <p className="mt-4 text-[#12202B]/70">{w.loginRequired}</p>
            <Link
              href="/login"
              className="mt-6 inline-block rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#129888]"
            >
              {w.loginCta}
            </Link>
          </div>
        ) : role === "tutor" ? (
          <div className="mt-4">
            <h1 className={`${serif} text-4xl text-[#0E2A47]`}>{w.orderTitle}</h1>
            <p className="mt-4 text-[#12202B]/70">
              This page is for students and parents. Checks assigned to you are under{" "}
              <Link href="/tutor/checks" className="text-[#16B8A7] underline">
                Work checks
              </Link>
              .
            </p>
          </div>
        ) : result ? (
          <SuccessView result={result} />
        ) : (
          <>
            <h1 className={`${serif} mt-3 text-4xl text-[#0E2A47]`}>{w.orderTitle}</h1>
            <p className="mt-3 text-[#12202B]/70">{w.orderSubtitle}</p>

            <form onSubmit={submit} className="mt-10 space-y-8">
              {/* Product */}
              <fieldset>
                <legend className="mb-3 text-sm font-semibold text-[#0E2A47]">{w.productLabel}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {WORK_CHECK_PRODUCTS.map((p) => {
                    const c = WORK_CHECK_CONFIG[p];
                    const selected = p === product;
                    return (
                      <label
                        key={p}
                        className={`cursor-pointer rounded-md border p-4 transition-colors ${
                          selected ? "border-[#16B8A7] bg-white ring-2 ring-[#16B8A7]/20" : "border-[#0E2A47]/10 bg-white/60 hover:bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="product"
                          value={p}
                          checked={selected}
                          onChange={() => setProduct(p)}
                          className="sr-only"
                        />
                        <span className="block text-sm font-semibold text-[#0E2A47]">{c.label[locale]}</span>
                        <span className="mt-1 block text-sm text-[#12202B]/65">
                          {c.fromPrice ? `${w.from} ` : ""}
                          {c.price} PLN
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {cfg.needsSubject && (
                <div>
                  <label htmlFor="wc-subject" className="mb-2 block text-sm font-semibold text-[#0E2A47]">
                    {w.subjectLabel}
                  </label>
                  <input
                    id="wc-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={w.subjectPlaceholder}
                    maxLength={80}
                    className={inputCls}
                  />
                </div>
              )}

              {/* File */}
              <div>
                <p className="mb-2 text-sm font-semibold text-[#0E2A47]">{w.fileLabel}</p>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-[#0E2A47]/25 bg-white px-4 py-5 hover:border-[#16B8A7]">
                  {file ? (
                    <FileText className="h-6 w-6 shrink-0 text-[#16B8A7]" />
                  ) : (
                    <Upload className="h-6 w-6 shrink-0 text-[#0E2A47]/50" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#0E2A47]">
                      {file ? file.name : w.fileLabel}
                    </span>
                    <span className="block text-xs text-[#12202B]/55">{file ? w.fileChange : w.fileHint}</span>
                  </span>
                  <input
                    type="file"
                    accept={WORK_CHECK_ACCEPT_ATTR}
                    className="sr-only"
                    onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              <div>
                <label htmlFor="wc-note" className="mb-2 block text-sm font-semibold text-[#0E2A47]">
                  {w.noteLabel}
                </label>
                <textarea
                  id="wc-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={w.notePlaceholder}
                  maxLength={1000}
                  rows={3}
                  className={inputCls}
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={secondCheck}
                    onChange={(e) => setSecondCheck(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#16B8A7]"
                  />
                  {w.secondOption}
                </label>
              </div>

              <div>
                <label htmlFor="wc-code" className="mb-2 block text-sm font-semibold text-[#0E2A47]">
                  {w.discountLabel}
                </label>
                <input
                  id="wc-code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                  placeholder={w.discountPlaceholder}
                  className={`${inputCls} max-w-xs uppercase`}
                />
              </div>

              {/* Total */}
              <div className="rounded-md border border-[#0E2A47]/10 bg-white p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-[#0E2A47]">{w.totalLabel}</span>
                  <span className={`${serif} text-3xl text-[#0E2A47]`}>
                    {cfg.fromPrice && <span className="mr-1 text-lg text-[#0E2A47]/60">{w.from}</span>}
                    {total.toFixed(0)} PLN
                  </span>
                </div>
                {cfg.fromPrice && <p className="mt-2 text-xs text-[#12202B]/60">{w.totalFromNote}</p>}
              </div>

              <label className="flex items-start gap-3 text-sm text-[#12202B]/80">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#16B8A7]"
                />
                <span>
                  {w.integrityConfirm}{" "}
                  <Link href="/regulamin" className="underline">
                    Regulamin
                  </Link>
                </span>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={!confirmed || phase !== "idle"}
                className="w-full rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#129888] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {phase === "uploading" ? w.uploading : phase === "submitting" ? w.submitting : w.submit}
              </button>
            </form>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

function SuccessView({ result }: { result: { check: WorkCheck; discountError: string | null } }) {
  const { t, locale } = useLanguage();
  const w = t.workCheck;
  const { check } = result;
  const awaitingQuote = check.status === "awaiting_quote";

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 text-[#16B8A7]" />
        <h1 className={`${serif} text-4xl text-[#0E2A47]`}>{w.successTitle}</h1>
      </div>
      <p className="mt-2 text-sm font-medium text-[#0E2A47]">
        {WORK_CHECK_CONFIG[check.product].label[locale]}
        {check.subject ? ` – ${check.subject}` : ""}
      </p>
      <p className="mt-4 text-[#12202B]/75">{awaitingQuote ? w.successQuote : w.successPay}</p>
      {result.discountError && <p className="mt-2 text-sm text-amber-700">{w.discountError}</p>}

      {!awaitingQuote && (
        <div className="mt-8 rounded-md border border-[#0E2A47]/10 bg-white p-5">
          <p className="mb-3 text-sm font-semibold text-[#0E2A47]">{w.paymentHeading}</p>
          <dl className="space-y-2 text-sm">
            <Row label={w.accountHolderLabel} value={BANK_DETAILS.accountHolder} />
            <Row label="IBAN" value={BANK_DETAILS.iban} />
            <Row label={w.amountLabel} value={`${(check.amount ?? 0).toFixed(2)} PLN`} />
            <Row label={w.referenceLabel} value={check.referenceCode} bold />
          </dl>
          <p className="mt-3 text-xs text-[#12202B]/60">{w.referenceHint}</p>
        </div>
      )}

      <Link
        href="/checks"
        className="mt-8 inline-block rounded-full bg-[#16B8A7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#129888]"
      >
        {w.myChecks}
      </Link>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[#12202B]/60">{label}</dt>
      <dd className={`text-right ${bold ? "font-semibold text-[#0E2A47]" : ""}`}>{value}</dd>
    </div>
  );
}
