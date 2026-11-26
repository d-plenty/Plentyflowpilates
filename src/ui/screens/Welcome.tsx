// The first open: welcome, privacy, your name. Everything else is set up as it's needed.
import { useRef, useState } from 'react';
import { FileProblem, readIncoming, restoreBackup } from '../../lib/files';
import { setSettings } from '../../lib/store';
import { toast } from '../bits';
import { Picture, useTheme } from '../Picture';
import { Wordmark } from '../Reformer';

export function Welcome() {
  const [step, setStep] = useState<'hello' | 'privacy' | 'name'>('hello');
  const [name, setName] = useState('');
  const [problem, setProblem] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const { key, night } = useTheme();
  const restore = async (f: File) => {
    try {
      const inc = readIncoming(await f.text());
      if (inc.kind !== 'backup') throw new FileProblem("That file isn't a backup. A backup's name starts with plentyflow-backup.");
      restoreBackup(inc, 'replace');
      setSettings({ welcomed: true });
      toast('Backup restored.');
    } catch (err) { toast(err instanceof Error ? err.message : "That file couldn't be read."); }
  };
  return (
    <div className="screen welcome">
      <div className="body" style={{ paddingTop: 'calc(var(--safe-top) + 20px)' }}>
        <div className="stack" style={{ maxWidth: 460, width: '100%', margin: '0 auto' }}>
          {step === 'hello' ? <>
            <div className="welcome-card"><Picture className="art" theme={key} night={night} mode="panel" /></div>
            <Wordmark badge={52} />
            <p style={{ fontSize: 'calc(17px * var(--scale))', lineHeight: 1.5 }}>Plan your mat and reformer classes, see what each one works, and teach from your phone.</p>
            <p className="m">Free. No account, no ads. Everything stays on this device.</p>
            <button type="button" className="btn p" onClick={() => setStep('privacy')}>Set up</button>
            <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void restore(f); }} />
            <button type="button" className="btn" onClick={() => file.current?.click()}>Restore from a backup</button>
          </> : null}
          {step === 'privacy' ? <>
            <div className="tiny">Step 1 of 2</div>
            <h1>Your work stays yours</h1>
            <div className="card stack-sm">
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="dot sun" /><p><b>On your device.</b> Your flows, studios and notes are kept on this phone or iPad, nowhere else.</p></div>
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="dot sun" /><p><b>No account.</b> Nothing to sign up for, no ads, no tracking. The app never sends your work anywhere.</p></div>
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="dot sun" /><p><b>You share it.</b> A flow leaves the device only when you share it, or save a backup somewhere yourself.</p></div>
              <div className="row" style={{ alignItems: 'flex-start' }}><span className="dot sun" /><p><b>Keep a backup.</b> If the app is deleted, a backup file is the only copy of your work. The app will remind you.</p></div>
            </div>
            <div className="card stack-sm">
              <b>The fine print</b>
              <p className="m">Plenty Flow is a planning aid for qualified instructors, not teaching or medical advice. The movement library is a draft written for this app: check anything before you teach from it.</p>
              <p className="m">The camera is used only to scan a sharing code, and your Wi-Fi only while sharing. Plenty Flow is free software (GPL-3.0).</p>
            </div>
            <div className="row"><button type="button" className="btn grow" onClick={() => setStep('hello')}>Back</button><button type="button" className="btn p grow" onClick={() => setStep('name')}>I understand</button></div>
          </> : null}
          {step === 'name' ? <>
            <div className="tiny">Step 2 of 2</div>
            <h1>What's your name?</h1>
            <p className="m">For your welcome, and so people know who a shared flow is from. You can change it in Settings.</p>
            <input type="text" autoFocus maxLength={40} placeholder="Your first name" aria-label="Your first name" value={name} autoComplete="given-name" onChange={(e) => { setName(e.target.value); setProblem(''); }} onKeyDown={(e) => { if (e.key === 'Enter') (document.getElementById('start') as HTMLButtonElement | null)?.click(); }} />
            {problem ? <div className="warn-text tiny" role="alert">{problem}</div> : null}
            <div className="row"><button type="button" className="btn grow" onClick={() => setStep('privacy')}>Back</button>
              <button id="start" type="button" className="btn p grow" onClick={() => { const n = name.trim(); if (!n) { setProblem('Type your name first.'); return; } setSettings({ deviceName: n, welcomed: true }); }}>Start</button></div>
          </> : null}
        </div>
      </div>
    </div>
  );
}
