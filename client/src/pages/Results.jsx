import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { getError, resultsApi, studentsApi } from '../services/api.js';
import usePaginated from '../hooks/usePaginated.js';
import useAddParam from '../hooks/useAddParam.js';
import DataTable, { RowActions } from '../components/DataTable.jsx';
import { OutcomeText } from '../components/StatusBadge.jsx';
import FormModal from '../components/FormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const SUBJECTS = [
  'Data Structures', 'Digital Electronics', 'Programming in C', 'Database Systems',
  'Computer Networks', 'Communication Skills', 'Applied Mathematics', 'Web Technologies',
];

export default function Results() {
  const { user, can } = useAuth();
  const toast = useToast();
  const list = usePaginated(resultsApi.list, undefined, 20);
  const [students, setStudents] = useState([]);
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    if (user.role === 'student') return;
    // teachers only get students from their assigned courses
    studentsApi.list({ limit: 100, assigned: user.role === 'teacher' ? 'true' : undefined }).then((r) => setStudents(r.data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useAddParam(can('results', 'create'), () => setModal({ item: null }));

  const canEdit = can('results', 'update');
  const canDelete = can('results', 'delete');
  const editing = modal?.item;

  const fields = [
    { name: 'student', label: 'Student', type: 'select', required: true, disabled: !!editing, full: true, options: students.map((s) => ({ value: s._id, label: `${s.name} (${s.course?.code})` })) },
    { name: 'subject', label: 'Subject', required: true, suggestions: SUBJECTS, placeholder: 'e.g. Data Structures' },
    { name: 'marks', label: 'Marks (out of 100)', type: 'number', required: true, min: 0, max: 100, hint: 'Grade and Pass/Fail are calculated automatically.' },
  ];
  const initial = editing ? { student: editing.student?._id, subject: editing.subject, marks: editing.marks } : {};

  const save = async (values) => {
    if (editing) await resultsApi.update(editing._id, { subject: values.subject, marks: values.marks });
    else await resultsApi.create(values);
    toast.success(editing ? 'Result updated' : 'Result added');
    setModal(null);
    list.reload();
  };

  const remove = async () => {
    try {
      await resultsApi.remove(toDelete._id);
      toast.success('Result deleted');
      list.reload();
    } catch (e) {
      toast.error(getError(e).message);
    }
    setToDelete(null);
  };

  const columns = [
    { key: 'student', label: 'Student', render: (r) => <span className="font-medium text-slate-900">{r.student?.name}</span> },
    { key: 'subject', label: 'Subject', cell: 'text-slate-500' },
    { key: 'marks', label: 'Marks', render: (r) => `${r.marks}/100`, cell: 'text-slate-500' },
    { key: 'grade', label: 'Grade', render: (r) => <span className="font-semibold text-slate-800">{r.grade}</span> },
    { key: 'result', label: 'Result', render: (r) => <OutcomeText value={r.result} /> },
    ...(canEdit || canDelete
      ? [{ key: 'actions', label: 'Actions', render: (r) => <RowActions onEdit={canEdit && (() => setModal({ item: r }))} onDelete={canDelete && (() => setToDelete(r))} /> }]
      : []),
  ];

  return (
    <>
      {can('results', 'create') && (
        <div className="flex justify-end mb-4">
          <button className="btn-primary" onClick={() => setModal({ item: null })}>+ Add Result</button>
        </div>
      )}

      <DataTable columns={columns} rows={list.data} loading={list.loading} error={list.error} pagination={list.pagination} onPage={list.setPage} empty="No results found." />

      <FormModal open={!!modal} title={editing ? 'Edit Result' : 'Add Result'} fields={fields} initial={initial} submitLabel={editing ? 'Save changes' : 'Save result'} onClose={() => setModal(null)} onSubmit={save} />
      <ConfirmDialog open={!!toDelete} message={`Delete ${toDelete?.student?.name}’s result for ${toDelete?.subject}?`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
