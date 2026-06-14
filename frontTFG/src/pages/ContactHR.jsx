import { MdPeople } from 'react-icons/md';
import ChatEmpleado from '../components/ContactHR/ChatEmpleado';
import ChatRRHH from '../components/ContactHR/ChatRRHH';

export default function ContactHR() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const companyId = localStorage.getItem('company_id');
  const role = user?.role?.name ?? '';

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <MdPeople size={48} className="mb-3" />
        <p className="text-sm">No estás asignado a ninguna empresa.</p>
      </div>
    );
  }

  if (role === 'hr') return <ChatRRHH user={user} companyId={companyId} />;
  return <ChatEmpleado user={user} companyId={companyId} />;
}
