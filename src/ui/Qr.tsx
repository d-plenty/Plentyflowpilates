// Drawing a QR code and reading one with the camera. Both use zxing (bundled in the app); no picture
// leaves the device.
import { useEffect, useRef, useState } from 'react';

type Reader = typeof import('zxing-wasm/reader');
let reader: Promise<Reader> | undefined;
const loadReader = () => (reader ??= (async () => {
  const [mod, { default: wasmUrl }] = await Promise.all([import('zxing-wasm/reader'), import('zxing-wasm/reader/zxing_reader.wasm?url')]);
  mod.prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } });
  return mod;
})());

export function qrSvg(symbol: { data: ArrayLike<number>; width: number; height: number }): string {
  const q = 4;
  let d = '';
  for (let y = 0; y < symbol.height; y++) for (let x = 0; x < symbol.width; x++) if (symbol.data[y * symbol.width + x] < 128) d += `M${x + q} ${y + q}h1v1h-1z`;
  const w = symbol.width + q * 2;
  const h = symbol.height + q * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%" shape-rendering="crispEdges"><rect width="${w}" height="${h}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}

export function Qr({ text, label }: { text: string; label: string }) {
  const [svg, setSvg] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setSvg(undefined);
    void (async () => {
      const [mod, { default: wasmUrl }] = await Promise.all([import('zxing-wasm/writer'), import('zxing-wasm/writer/zxing_writer.wasm?url')]);
      mod.prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } });
      const r = await mod.writeBarcode(text, { format: 'QRCode', options: 'ecLevel=M' });
      if (alive && r.symbol?.width) setSvg(qrSvg(r.symbol));
      else if (alive) setFailed(true);
    })().catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [text]);
  return <div className="qr" role="img" aria-label={label}>{svg ? <span dangerouslySetInnerHTML={{ __html: svg }} /> : failed ? <p className="m">Couldn't draw the code.</p> : null}</div>;
}

/** The camera, looking for a QR code that `accept` says is the right kind. */
export function Scanner({ accept, onCode, wrong }: { accept: (text: string) => boolean; onCode: (text: string) => void; wrong: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let stream: MediaStream | undefined;
    let stopped = false;
    let busy = false;
    let done = false;
    const canvas = document.createElement('canvas');
    void loadReader();
    const tick = async () => {
      const video = videoRef.current;
      if (stopped || done || busy || !video || video.readyState < 2 || !video.videoWidth) return;
      busy = true;
      try {
        // A code on another screen: the middle of the picture at full detail.
        const side = Math.round(Math.min(video.videoWidth, video.videoHeight) * 0.9);
        canvas.width = side; canvas.height = side;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(video, (video.videoWidth - side) / 2, (video.videoHeight - side) / 2, side, side, 0, 0, side, side);
        const { readBarcodes } = await loadReader();
        const results = await readBarcodes(ctx.getImageData(0, 0, side, side), { formats: ['QRCode'], tryHarder: true });
        const text = results.find((r) => r.text)?.text;
        if (text && accept(text)) { done = true; onCode(text); } else if (text) setNotice(wrong);
      } catch { /* a frame that couldn't be read: try the next */ } finally { busy = false; }
    };
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        const video = videoRef.current;
        if (video) { video.srcObject = stream; await video.play().catch(() => undefined); }
      } catch {
        setError("Plenty Flow can't use the camera. Allow it in Settings → Plenty Flow → Camera, or ask for the class as a file instead.");
      }
    })();
    const timer = window.setInterval(() => void tick(), 300);
    return () => { stopped = true; window.clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="scan stack-sm">
      {error ? <p className="warn-text">{error}</p> : <video ref={videoRef} playsInline muted aria-label="Camera" />}
      {notice ? <p className="m" role="status">{notice}</p> : null}
    </div>
  );
}
