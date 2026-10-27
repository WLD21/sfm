import React, { useEffect, useRef, useState } from 'react';
import { siteConfig } from './site.config.js';

export function TrainingRequest({ request, copy: c, onClose }) {
  const dialog = useRef(null);
  const [values, setValues] = useState({ goal: request.goal || 'strength', setting: 'gym', name: '', email: '', phone: '', town: '', notes: '' });
  const [review, setReview] = useState(false);
  const [status, setStatus] = useState('');
  useEffect(() => {
    dialog.current.showModal();
    return () => { if (request.trigger?.isConnected) request.trigger.focus({ preventScroll: true }); };
  }, [request]);
  const update = event => {
    event.target.setCustomValidity('');
    setStatus('');
    setValues(previous => ({ ...previous, [event.target.name]: event.target.value }));
  };
  const goalName = c.programs.find(program => program.id === values.goal)?.title || c.programs[0].title;
  const settingName = c.places[['gym', 'home', 'discuss'].indexOf(values.setting)] || c.places[2];
  const rows = [[c.goal, goalName], [c.place, settingName], [c.name, values.name.trim()], [c.email, values.email.trim()], [c.phone, values.phone.trim()], [c.town, values.town.trim()], [c.notes, values.notes.trim()]].filter(([, value]) => value);
  const exportText = () => [c.requestHeading, '', ...rows.map(([label, value]) => label + ': ' + value), '', c.quote, c.unsent].join('\n');
  function close() { dialog.current?.close(); onClose(); }
  function submit(event) {
    event.preventDefault();
    for (const name of ['name', 'email', 'town']) {
      const field = event.currentTarget.elements.namedItem(name);
      if (!field.value.trim()) field.setCustomValidity(field.labels?.[0]?.textContent || c.name);
    }
    if (!event.currentTarget.reportValidity()) return;
    setReview(true);
    setStatus('');
    requestAnimationFrame(() => document.querySelector('#training-request-title')?.focus({ preventScroll: true }));
  }
  async function copyRequest() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(exportText());
      setStatus(c.copied);
    } catch {
      const area = document.createElement('textarea');
      area.value = exportText();
      area.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
      dialog.current.append(area);
      area.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } catch { /* Saving is still available. */ }
      area.remove();
      setStatus(copied ? c.copied : c.copyFailed);
    }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([exportText()], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Supreme-personal-training-enquiry.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(c.saved);
  }
  return <dialog ref={dialog} id="training-request-dialog" className="training-request-dialog" aria-labelledby="training-request-title" onCancel={event => { event.preventDefault(); close(); }}>
    <button type="button" className="dialog-close" aria-label={c.close} onClick={close}>×</button>
    <p className="eyebrow">{c.trainingKicker}</p>
    <h2 id="training-request-title" tabIndex={-1}>{review ? c.reviewTitle : c.formTitle}</h2>
    <p className="training-form-intro">{review ? c.quote : c.formIntro}</p>
    {!review ? <form onSubmit={submit} className="training-form">
      <label htmlFor="training-goal">{c.goal}</label>
      <select id="training-goal" name="goal" value={values.goal} onChange={update}>{c.programs.map(program => <option key={program.id} value={program.id}>{program.title}</option>)}</select>
      <div className="training-fields">
        <div><label htmlFor="training-name">{c.name}</label><input id="training-name" name="name" value={values.name} onChange={update} maxLength={100} autoComplete="name" required /></div>
        <div><label htmlFor="training-email">{c.email}</label><input id="training-email" name="email" type="email" value={values.email} onChange={update} maxLength={150} autoComplete="email" required /></div>
        <div><label htmlFor="training-phone">{c.phone}</label><input id="training-phone" name="phone" type="tel" value={values.phone} onChange={update} maxLength={40} autoComplete="tel" /></div>
        <div><label htmlFor="training-town">{c.town}</label><input id="training-town" name="town" value={values.town} onChange={update} maxLength={100} autoComplete="address-level2" required /></div>
      </div>
      <label htmlFor="training-setting">{c.place}</label>
      <select id="training-setting" name="setting" value={values.setting} onChange={update}>{['gym', 'home', 'discuss'].map((setting, i) => <option key={setting} value={setting}>{c.places[i]}</option>)}</select>
      <label htmlFor="training-notes">{c.notes}</label><textarea id="training-notes" name="notes" value={values.notes} onChange={update} maxLength={600} rows={3} aria-describedby="training-notes-hint" />
      <p className="training-field-hint" id="training-notes-hint">{c.notesHint}</p>
      <button type="submit" className="button">{c.review} <span aria-hidden="true">↗</span></button>
    </form> : <div className="training-review">
      <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="training-unsent">{c.unsent}</p>
      <div className="training-review-actions"><button type="button" className="button secondary" onClick={copyRequest}>{c.copy}</button><button type="button" className="button secondary" onClick={download}>{c.save}</button></div>
      <a className="button training-contact" href={siteConfig.contactUrl} target="_blank" rel="noopener noreferrer">{c.contact} <span aria-hidden="true">↗</span></a>
      <button type="button" className="text-link" onClick={() => setReview(false)}>{c.back}</button>
    </div>}
    <p className="training-status" role="status">{status}</p>
  </dialog>;
}
