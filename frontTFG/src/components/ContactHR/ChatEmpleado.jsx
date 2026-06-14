import { useEffect, useRef, useState } from 'react';
import { MdSend, MdPeople, MdContactSupport } from 'react-icons/md';
import api from '../../api';
import { parseDate } from '../../utils/dates';

function formatHour(dateTimeStr) {
  if (!dateTimeStr) return '';
  try {
    const date = parseDate(dateTimeStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch { return ''; }
}

export default function ChatEmpleado({ user, companyId }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chat-messages?employee_id=${user.id}&company_id=${companyId}`);
        setMessages(res.data.data ?? []);
      } catch { /* ignorar */ }
    };

    fetchMessages().finally(() => setLoading(false));
    // Marcar como leídos los mensajes de RRHH al abrir
    api.post('/chat-messages/mark-read', { employee_id: user.id, reader: 'employee' }).catch(() => {});
    // Polling cada 10 s
    const timer = setInterval(fetchMessages, 10000);
    return () => clearInterval(timer);
  }, [user.id, companyId]);

  // Automaticamente hace un scroll al último mensaje cuando cambian los mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/chat-messages', {
        company_id: Number(companyId),
        employee_id: user.id,
        sender_id: user.id,
        message: text.trim(),
      });
      setMessages((prev) => [...prev, res.data.data]);
      setText('');
    } catch { /* ignorar */ } finally { setSending(false); }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      {/* Cabecera */}
      <div className="bg-white rounded-t-xl border border-gray-200 px-5 py-4 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
          <MdPeople size={20} className="text-indigo-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-800 text-sm">Recursos Humanos</p>
          <p className="text-xs text-gray-400">El equipo de RRHH responderá en cuanto pueda</p>
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 bg-gray-50 border-x border-gray-200 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <MdContactSupport size={40} />
            <p className="mt-2 text-sm">Escríbenos, estaremos encantados de ayudarte</p>
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.sender_id === user.id;
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>
                  {!mine && <p className="text-[11px] font-semibold text-indigo-500 mb-1">Recursos Humanos</p>}
                  <p className="leading-relaxed">{message.message}</p>
                  <p className={`text-[10px] mt-1 ${mine ? 'text-indigo-200' : 'text-gray-400'}`}>{formatHour(message.created_at)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="bg-white rounded-b-xl border border-t-0 border-gray-200 px-4 py-3 flex gap-3 items-end shrink-0">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
          rows={1}
          maxLength={1000}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition shrink-0"
        >
          <MdSend size={16} />
          {sending ? 'Enviando...' : 'Enviar'}
        </button>
      </form>
    </div>
  );
}
