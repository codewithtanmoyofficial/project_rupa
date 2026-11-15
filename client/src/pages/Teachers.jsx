import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { coursesApi, getError, teachersApi } from '../services/api.js';
import usePaginated from '../hooks/usePaginated.js';
import useDebounce from '../hooks/useDebounce.js';
import useAddParam from '../hooks/useAddParam.js';
import DataTable, { RowActions } from '../components/DataTable.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import FormModal from '../components/FormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const STATUSES = [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }];

export default function Teachers() {
  const { can } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [courses, setCourses] = useState([]);
  const filters = useMemo(() => ({ search: debounced }), [debounced]);
  const list = usePaginated(teachersApi.list, filters);
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    coursesApi.list({ limit: 100 }).then((r) => setCourses(r.data)).catch(() => {});
  }, []);
  useAddParam(can('teachers', 'create'), () => setModal({ item: null }));

  const canEdit = can('teachers', 'update');
  const canDelete = can('teachers', 'delete');
  const editing = modal?.item;

  const fields = [
    { name: 'name', label: 'Full name', required: true, placeholder: 'e.g. Dr. Sanjay Kulkarni' },
    { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'name@gpc.edu' },
    { name: 'department', label: 'Department / Subject', required: true, placeholder: 'e.g. Computer Science' },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES },
    { name: 'courses', label: 'Assigned courses', type: 'checklist', options: courses.map((c) => ({ value: c._id, label: `${c.name} (${c.code})` })), hint: 'Teachers can mark attendance and enter results only for these courses.' },
    ...(editing ? [] : [{ name: 'password', label: 'Temporary password', type: 'password', hint: 'Optional. Leave blank to use the default password.' }]),
  ];
  const initial = editing
    ? { name: editing.name, email: editing.email, department: editing.department, status: editing.status, courses: (editing.courses || []).map((c) => c._id) }
    : { status: 'Active', courses: [] };

  const save = async (values) => {
    if (editing) await teachersApi.update(editing._id, values);
    else await teachersApi.create(values);
    toast.success(editing ? 'Teacher updated' : 'Teacher added');
    setModal(null);
    list.reload();
  };

  const remove = async () => {
    try {
      await teachersApi.remove(toDelete._id);
      toast.success('Teacher deleted');
      list.reload();
    } catch (e) {
      toast.error(getError(e).message);
    }
    setToDelete(null);
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'department', label: 'Department / Subject' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ...(canEdit || canDelete
      ? [{ key: 'actions', label: 'Actions', render: (r) => <RowActions onEdit={canEdit && (() => setModal({ item: r }))} onDelete={canDelete && (() => setToDelete(r))} /> }]
      : []),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input className="input sm:!w-64" placeholder="Search by name, email or department" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search teachers" />
        {can('teachers', 'create') && <button className="btn-primary sm:ml-auto" onClick={() => setModal({ item: null })}>+ Add Teacher</button>}
      </div>

      <DataTable columns={columns} rows={list.data} loading={list.loading} error={list.error} pagination={list.pagination} onPage={list.setPage} empty="No teachers match your search." />

      <FormModal open={!!modal} title={editing ? 'Edit Teacher' : 'Add Teacher'} fields={fields} initial={initial} submitLabel={editing ? 'Save changes' : 'Add Teacher'} onClose={() => setModal(null)} onSubmit={save} />
      <ConfirmDialog open={!!toDelete} message={`Delete ${toDelete?.name}? Their login account will also be removed. This can’t be undone.`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
