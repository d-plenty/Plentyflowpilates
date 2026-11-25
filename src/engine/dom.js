// Makes one SVG element. Children can be elements, null or arrays of them.
const NS = 'http://www.w3.org/2000/svg';
export function s(tag, attrs = {}, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined && v !== false) el.setAttribute(k, String(v));
  const add = (k) => { if (k === null || k === undefined || k === false) return; if (Array.isArray(k)) k.forEach(add); else el.append(k); };
  kids.forEach(add);
  return el;
}
