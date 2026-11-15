import { useState } from 'react';
import Modal from './Modal.jsx';

export default function ConfirmDialog({ open, title = 'Delete record?', message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      title={title}
      onClose={busy ? () => {} : onClose}
      size="max-w-sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn-danger" onClick={run} disabled={busy}>{busy ? 'Deleting…' : confirmLabel}</button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
