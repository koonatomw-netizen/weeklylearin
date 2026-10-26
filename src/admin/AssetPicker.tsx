import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { MAX_IMAGE_BYTES } from "../shared/imageInfo";
import type { Language } from "../shared/types";
import { Notice, t } from "../ui";
import { adminApi, type AdminAsset } from "./adminApi";

/** Choose an uploaded image or upload a new one (PNG, JPEG or WebP, up to 5 MB). */
export function AssetPicker({ language, onPick, onClose, title }: { language: Language; onPick: (asset: AdminAsset) => void; onClose: () => void; title: string }) {
  const [assets, setAssets] = useState<AdminAsset[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = () => adminApi.assets().then((result) => setAssets(result.assets)).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load images."));
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function upload(file: File) {
    setError("");
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError(t(language, "Choose a PNG, JPEG or WebP image. SVG is not allowed.", "เลือกไฟล์ PNG, JPEG หรือ WebP (ไม่รองรับ SVG)")); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError(t(language, "Images must be 5 MB or smaller.", "ไฟล์ต้องไม่เกิน 5 MB")); return; }
    setBusy(true);
    try {
      const { asset } = await adminApi.uploadAsset(file);
      onPick(asset);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Upload failed."); }
    finally { setBusy(false); }
  }

  async function remove(asset: AdminAsset) {
    if (!window.confirm(t(language, "Delete this image from the library?", "ลบรูปนี้ออกจากคลัง?"))) return;
    setError("");
    try { await adminApi.deleteAsset(asset.id); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete the image."); }
  }

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
      <div className="modal-head"><span className="grow">{title}</span><button className="icon-button" onClick={onClose} aria-label="Close"><X size={16} /></button></div>
      <div className="modal-body">
        <div className="button-row">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
          <button className="btn btn--accent" disabled={busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle className="spin" size={15} /> : <Upload size={15} />}{t(language, "Upload image", "อัปโหลดรูป")}</button>
          <span className="hint">PNG · JPEG · WebP · ≤ 5 MB</span>
        </div>
        {error && <Notice>{error}</Notice>}
        {assets === null ? <p className="mono-dim">{t(language, "loading images…", "กำลังโหลดรูป…")}</p>
          : assets.length ? <div className="asset-grid">
            {assets.map((asset) => <div key={asset.id} className="asset-card">
              <button className="asset-thumb" onClick={() => onPick(asset)} aria-label={t(language, "Use this image", "ใช้รูปนี้")}><img src={`/api/assets/${asset.id}`} alt="" loading="lazy" /></button>
              <div className="asset-meta"><span className="mono-dim">{asset.width && asset.height ? `${asset.width}×${asset.height}` : asset.mime.replace("image/", "")} · {Math.ceil(asset.bytes / 1024)} KB</span>
                <button className="icon-button" onClick={() => void remove(asset)} aria-label={t(language, "Delete image", "ลบรูป")} title={t(language, "Delete image", "ลบรูป")}><Trash2 size={13} /></button></div>
            </div>)}
          </div> : <p className="mono-dim">{t(language, "> no images yet — upload one", "> ยังไม่มีรูป อัปโหลดได้เลย")}</p>}
      </div>
    </div>
  </div>;
}
