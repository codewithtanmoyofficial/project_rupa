import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { attendanceApi, coursesApi, getError, studentsApi } from '../services/api.js';
import usePaginated from '../hooks/usePaginated.js';
import useAddParam from '../hooks/useAddParam.js';
import DataTable, { RowActions } from '../components/DataTable.jsx';
import { OutcomeText } from '../components/StatusBadge.jsx';
import FormModal from '../components/FormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { todayISO } from '../utils/format.js';

const OPTIONS = [{ value: 'Present', label: 'Present' }, { value: 'Absent', label: 'Absent' }];
const filterCls = 'input !w-auto min-w-[9rem] !py-1.5 text-xs bg-slate-50';

export default function Attendance() {
  const { user, can } = useAuth();
  const toast = useToast();
  const isStudent = user.role === 'student';
  const isTeacher = user.role === 'teacher';

  const [student, setStudent] = useState('');
  const [course, setCourse] = useState('');
  const [date, setDate] = useState('');
  const filters = useMemo(() => ({ student, course, date }), [student, course, date]);
  const list = usePaginated(attendanceApi.list, filters, 20);

  const [allStudents, setAllStudents] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [courses, setCourses] = useState([]);
  const [modal, setModal] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    if (isStudent) return;
    studentsApi.list({ limit: 100 }).then((r) => setAllStudents(r.data)).catch(() => {});
    coursesApi.list({ limit: 100 }).then((r) => setCourses(r.data)).catch(() => {});
    // teachers may only mark attendance for students in their assigned courses
    if (isTeacher) studentsApi.list({ limit: 100, assigned: 'true' }).then((r) => setAssigned(r.data)).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useAddParam(can('attendance', 'create'), () => setModal({ item: null }));

  const canEdit = can('attendance', 'update');
  const canDelete = can('attendance', 'delete');
  const editing = modal?.item;
  const formStudents = isTeacher ? assigned : allStudents;

  const fields = [
    { name: 'student', label: 'Student', type: 'select', required: true, disabled: !!editing, full: true, options: formStudents.map((s) => ({ value: s._id, label: `${s.name} (${s.course?.code})` })) },
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'status', label: 'Status', type: 'select', required: true, options: OPTIONS },
  ];
  const initial = editing
    ? { student: editing.student?._id, date: editing.date, status: editing.status }
    : { date: todayISO(), status: 'Present' };

  const save = async (values) => {
    if (editing) await attendanceApi.update(editing._id, { date: values.date, status: values.status });
    else await attendanceApi.create(values);
    toast.success(editing ? 'Attendance updated' : 'Attendance saved');
    setModal(null);
    list.reload();
  };

  const remove = async () => {
    try {
      await attendanceApi.remove(toDelete._id);
      toast.success('Attendance record deleted');
      list.reload();
    } catch (e) {
      toast.error(getError(e).message);
    }
    setToDelete(null);
  };

  const columns = [
    { key: 'date', label: 'Date', cell: 'text-slate-500 whitespace-nowrap' },
    { key: 'student', label: 'Student', render: (r) => <span className="font-medium text-slate-900">{r.student?.name}</span> },
    { key: 'course', label: 'Course', render: (r) => r.course?.name, cell: 'text-slate-500' },
    { key: 'status', label: 'Status', render: (r) => <OutcomeText value={r.status} /> },
    ...(canEdit || canDelete
      ? [{ key: 'actions', label: 'Actions', render: (r) => <RowActions onEdit={canEdit && (() => setModal({ item: r }))} onDelete={canDelete && (() => setToDelete(r))} /> }]
      : []),
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        {!isStudent && (
          <>
            <select className={filterCls} value={student} onChange={(e) => setStudent(e.target.value)} aria-label="Filter by student">
              <option value="">All Students</option>
              {allStudents.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select className={filterCls} value={course} onChange={(e) => setCourse(e.target.value)} aria-label="Filter by course">
              <option value="">All Courses</option>
              {courses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </>
        )}
        <input type="date" className={filterCls} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Filter by date" />
        {can('attendance', 'create') && <button className="btn-primary sm:ml-auto" onClick={() => setModal({ item: null })}>+ Mark Attendance</button>}
      </div>

      <DataTable columns={columns} rows={list.data} loading={list.loading} error={list.error} pagination={list.pagination} onPage={list.setPage} empty="No attendance records found." />

      <FormModal open={!!modal} title={editing ? 'Edit Attendance' : 'Mark Attendance'} fields={fields} initial={initial} submitLabel={editing ? 'Save changes' : 'Save attendance'} onClose={() => setModal(null)} onSubmit={save} />
      <ConfirmDialog open={!!toDelete} message={`Delete the attendance record for ${toDelete?.student?.name} on ${toDelete?.date}?`} onConfirm={remove} onClose={() => setToDelete(null)} />
    </>
  );
}
