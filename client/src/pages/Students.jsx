import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { coursesApi, getError, studentsApi } from '../services/api.js';
import usePaginated from '../hooks/usePaginated.js';
import useDebounce from '../hooks/useDebounce.js';
import useAddParam from '../hooks/useAddParam.js';
import DataTable, { RowActions } from '../components/DataTable.jsx';
import { StatusBadge } from '../components/StatusBadge.jsx';
import FormModal from '../components/FormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const SEMESTERS = Array.from({ length: 8 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }));
const STATUSES = [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }];

export default function Students() {
  const { user, can } = useAuth();
  const toast = useToast();
  const isStudent = user.role === 'student';
  const [search, setSearch] = useState('');
  const debounced = useDebounce(search);
  const [course, setCourse] = useState('');
  const [courses, setCourses] = useState([]);
  const filters = useMemo(() => ({ search: debounced, course }), [debounced, course]);
  const list = usePaginated(studentsApi.list, filters);
  const [modal, setModal] = useState(null); // { item } -> add (item null) or edit
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    coursesApi.list({ limit: 100 }).then((r) => setCourses(r.data)).catch(() => {});
  }, []);
  useAddParam(can('students', 'create'), () => setModal({ item: null }));

  const canEdit = can('students', 'update');
  const canDelete = can('students', 'delete');
  const editing = modal?.item;

  const fields = [
    { name: 'name', label: 'Full name', required: true, placeholder: 'e.g. Aarav Sharma' },
    { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'name@student.gpc.edu' },
    { name: 'course', label: 'Course', type: 'select', required: true, options: courses.map((c) => ({ value: c._id, label: c.name })) },
    { name: 'semester', label: 'Semester', type: 'select', required: true, options: SEMESTERS },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES },
    ...(editing ? [] : [{ name: 'password', label: 'Temporary password', type: 'password', hint: 'Optional. Leave blank to use the default password.' }]),
  ];
  const initial = editing
    ? { name: editing.name, email: editing.email, course: editing.course?._id, semester: String(editing.semester), status: editing.status }
    : { status: 'Active', semester: '1' };

  const save = async (values) => {
    if (editing) await studentsApi.update(editing._id, values);
    else await studentsApi.create(values);
    toast.success(editing ? 'Student updated' : 'Student added');
    setModal(null);
    list.reload();
  };

  const remove = async () => {
    try {
      await studentsApi.remove(toDelete._id);
      toast.success('Student deleted');
      list.reload();
    } catch (e) {
      toast.error(getError(e).message);
    }
    setToDelete(null);
  };

  const columns = [
    { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
    { key: 'email', label: 'Email' },
    { key: 'course', label: 'Course', render: (r) => r.course?.name },
    { key: 'semester', label: 'Semester' },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    ...(canEdit || canDelete
      ? [{ key: 'actions', label: 'Actions', render: (r) => <RowActions onEdit={canEdit && (() => setModal({ item: r }))} onDelete={canDelete && (() => setToDelete(r))} /> }]
      : []),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {!isStudent && (
          <>
            <input className="input sm:!w-64" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
            <select className="input sm:!w-60" value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Filter by course">
              <option value="">All Courses</option>
              {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </>
        )}
        {can('students', 'create') && <button className="btn-primary sm:ml-auto" onClick={() => setModal({ item: null })}>+ Add Student</button>}
      </div>

      <DataTable columns={columns} rows={list.data} loading={list.loading} error={list.error} pagination={list.pagination} onPage={list.setPage} empty="No students match your search." />

      <FormModal open={!!modal} title={editing ? 'Edit Student' : 'Add Student'} fields={fields} initial={initial} submitLabel={editing ? 'Save changes' : 'Add Student'} onClose={() => setModal(null)} onSubmit={save} />
      <ConfirmDialog open={!!toDelete} message={`Delete ${toDelete?.name}? Their login, attendance and results will also be removed. This can’t be undone.`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
