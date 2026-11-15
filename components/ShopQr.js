"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

export default function ShopQr({ url, businessName }) {
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  const fileName =
    businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") ||
    "shop";

  useEffect(() => {
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(console.error);
  }, [url]);

  function downloadPng() {
    const a = document.createElement("a");
    a.href = qr;
    a.download = `${fileName}-qr.png`;
    a.click();
  }

  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const w = pdf.internal.pageSize.getWidth();

    pdf.setFontSize(28);
    pdf.text(businessName, w / 2, 40, { align: "center" });
    pdf.setFontSize(16);
    pdf.text("Scan to view the menu and order", w / 2, 52, { align: "center" });
    pdf.addImage(qr, "PNG", (w - 120) / 2, 65, 120, 120);
    pdf.setFontSize(10);
    pdf.text(url, w / 2, 195, { align: "center" });
    pdf.save(`${fileName}-qr.pdf`);
  }

  function printQr() {
    const win = window.open("", "_blank");
    if (!win) return;
    const name = escapeHtml(businessName);
    win.document.write(
      `<html><head><title>${name}</title></head>
       <body style="font-family:Arial,sans-serif;text-align:center;padding:40px">
         <h1>${name}</h1>
         <p>Scan to view the menu and order</p>
         <img src="${qr}" style="width:360px" />
         <p style="font-size:12px;color:#555">${escapeHtml(url)}</p>
       </body></html>`
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const btn =
    "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50";

  return (
    <div className="space-y-3">
      {qr ? (
        <img src={qr} alt="Shop QR code" className="mx-auto w-48 rounded-lg border" />
      ) : (
        <p className="text-sm text-gray-500">Generating QR...</p>
      )}
      <p className="break-all text-center text-xs text-gray-500">{url}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={downloadPng} disabled={!qr} className={btn}>Download PNG</button>
        <button onClick={downloadPdf} disabled={!qr} className={btn}>Download PDF</button>
        <button onClick={printQr} disabled={!qr} className={btn}>Print</button>
        <button onClick={copyLink} className={btn}>{copied ? "Copied!" : "Copy link"}</button>
      </div>
    </div>
  );
}