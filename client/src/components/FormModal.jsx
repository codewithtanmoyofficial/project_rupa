import { useEffect, useState } from 'react';
import Modal from './Modal.jsx';
import { getError } from '../services/api.js';

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmpty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);

/**
 * Generic add/edit form. `fields` = [{ name, label, type, required, options, hint, disabled, full, suggestions, min, max }]
 * Types: text | email | password | number | date | select | checklist
 * Client-side validation (required / email / number range) runs first; API field errors (e.g. duplicate email) are shown under the field.
 */
export default function FormModal({ open, title, fields, initial, submitLabel = 'Save', onClose, onSubmit }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initial || {});
      setErrors({});
      setFormError('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const validate = () => {
    const e = {};
    for (const f of fields) {
      const v = values[f.name];
      if (f.required && isEmpty(v)) e[f.name] = `${f.label} is required`;
      else if (f.type === 'email' && !isEmpty(v) && !EMAIL_RX.test(v)) e[f.name] = 'Enter a valid email address';
      else if (f.type === 'number' && !isEmpty(v)) {
        const n = Number(v);
        if (Number.isNaN(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
          e[f.name] = `Enter a number between ${f.min} and ${f.max}`;
        }
      } else if (f.type === 'password' && !isEmpty(v) && String(v).length < 6) e[f.name] = 'Use at least 6 characters';
    }
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setFormError('');
    try {
      await onSubmit(values);
    } catch (err) {
      const { message, fields: apiFields } = getError(err);
      setErrors(apiFields);
      setFormError(Object.keys(apiFields).length ? '' : message);
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (f) => {
    const v = values[f.name] ?? '';
    const cls = `input ${errors[f.name] ? 'input-error' : ''}`;
    const common = { id: `f-${f.name}`, disabled: f.disabled, 'aria-invalid': !!errors[f.name] };

    if (f.type === 'select') {
      return (
        <select {...common} className={cls} value={v} onChange={(e) => set(f.name, e.target.value)}>
          <option value="">{f.placeholder || `Select ${f.label.toLowerCase()}`}</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (f.type === 'checklist') {
      const selected = values[f.name] || [];
      return (
        <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
          {f.options.length === 0 && <p className="text-xs text-slate-400 p-3">No options available</p>}
          {f.options.map((o) => (
            <label key={o.value} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
                checked={selected.includes(o.value)}
                onChange={(e) => set(f.name, e.target.checked ? [...selected, o.value] : selected.filter((x) => x !== o.value))}
              />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
    return (
      <>
        <input
          {...common}
          className={cls}
          type={f.type || 'text'}
          value={v}
          min={f.min}
          max={f.max}
          list={f.suggestions ? `dl-${f.name}` : undefined}
          placeholder={f.placeholder}
          autoComplete="off"
          onChange={(e) => set(f.name, e.target.value)}
        />
        {f.suggestions && <datalist id={`dl-${f.name}`}>{f.suggestions.map((s) => <option key={s} value={s} />)}</datalist>}
      </>
    );
  };

  return (
    <Modal
      open={open}
      title={title}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" form="crud-form" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : submitLabel}</button>
        </>
      }
    >
      <form id="crud-form" onSubmit={submit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {formError && <p className="sm:col-span-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{formError}</p>}
        {fields.map((f) => (
          <div key={f.name} className={f.full || f.type === 'checklist' ? 'sm:col-span-2' : ''}>
            <label className="label" htmlFor={`f-${f.name}`}>{f.label}{f.required && <span className="text-red-500"> *</span>}</label>
            {renderInput(f)}
            {errors[f.name] ? <p className="text-xs text-red-600 mt-1">{errors[f.name]}</p> : f.hint && <p className="text-xs text-slate-400 mt-1">{f.hint}</p>}
          </div>
        ))}
      </form>
    </Modal>
  );
}
