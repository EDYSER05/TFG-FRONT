import { MdApartment, MdPerson, MdEdit } from 'react-icons/md';

export default function DepartmentCard({ dept, canManageDepts, onClick, onEdit }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-indigo-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
          <MdApartment size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{dept.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{dept.company?.name ?? '—'}</p>
          {dept.manager && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
              <MdPerson size={13} />
              <span>{dept.manager.name} {dept.manager.last_name}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${dept.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {dept.active ? 'Activo' : 'Inactivo'}
          </span>
          {canManageDepts && (
            <button onClick={onEdit} className="p-1 text-gray-400 hover:text-indigo-600 transition" title="Editar">
              <MdEdit size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
