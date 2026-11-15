import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { coursesApi, getError } from '../services/api.js';
import usePaginated from '../hooks/usePaginated.js';
import useAddParam from '../hooks/useAddParam.js';
import DataTable, { RowActions } from '../components/DataTable.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import FormModal from '../components/FormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { durationLabel } from '../utils/format.js';

const STATUSES = [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }];

export default function Courses() {
  const { can } = useAuth();
  const toast = useToast();
  const list = usePaginated(coursesApi.list);
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  useAddParam(can('courses', 'create'), () => setModal({ item: null }));

  const canEdit = can('courses', 'update');
  const canDelete = can('courses', 'delete');
  const editing = modal?.item;

  const fields = [
    { name: 'name', label: 'Course name', required: true, full: true, placeholder: 'e.g. Diploma in Computer Science' },
    { name: 'code', label: 'Course code', required: true, placeholder: 'e.g. C101' },
    { name: 'durationYears', label: 'Duration (years)', type: 'number', required: true, min: 1, max: 6 },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES },
  ];
  const initial = editing
    ? { name: editing.name, code: editing.code, durationYears: editing.durationYears, status: editing.status }
    : { status: 'Active', durationYears: 3 };

  const save = async (values) => {
    if (editing) await coursesApi.update(editing._id, values);
    else await coursesApi.create(values);
    toast.success(editing ? 'Course updated' : 'Course added');
    setModal(null);
    list.reload();
  };

  const remove = async () => {
    try {
      await coursesApi.remove(toDelete._id);
      toast.success('Course deleted');
      list.reload();
    } catch (e) {
      toast.error(getError(e).message);
    }
    setToDelete(null);
  };

  const columns = [
    { key: 'name', label: 'Course Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'code', label: 'Code' },
    { key: 'durationYears', label: 'Duration', render: (r) => durationLabel(r.durationYears) },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ...(canEdit || canDelete
      ? [{ key: 'actions', label: 'Actions', render: (r) => <RowActions onEdit={canEdit && (() => setModal({ item: r }))} onDelete={canDelete && (() => setToDelete(r))} /> }]
      : []),
  ];

  return (
    <>
      {can('courses', 'create') && (
        <div className="flex justify-end mb-4">
          <button className="btn-primary" onClick={() => setModal({ item: null })}>+ Add Course</button>
        </div>
      )}

      <DataTable columns={columns} rows={list.data} loading={list.loading} error={list.error} pagination={list.pagination} onPage={list.setPage} />

      <FormModal open={!!modal} title={editing ? 'Edit Course' : 'Add Course'} fields={fields} initial={initial} submitLabel={editing ? 'Save changes' : 'Add Course'} onClose={() => setModal(null)} onSubmit={save} />
      <ConfirmDialog open={!!toDelete} message={`Delete “${toDelete?.name}”? This can’t be undone.`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
