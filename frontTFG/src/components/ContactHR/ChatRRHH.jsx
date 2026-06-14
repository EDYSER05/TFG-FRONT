import { useEffect, useRef, useState } from 'react';
import { MdSend, MdPeople, MdArrowBack, MdContactSupport } from 'react-icons/md';
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

export default function ChatRRHH({ user, companyId }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // empleado cuya conversación está abierta
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Carga todas las conversaciones de la empresa agrupadas por empleado
  const fetchConversations = async () => {
    try {
      const res = await api.get(`/chat-messages?company_id=${companyId}`);
      const messages = res.data.data ?? [];

      // Agrupamos los mensajes por empleado para tener una conversación por cada uno
      const byEmployee = {};
      for (const message of messages) {
        const employeeId = message.employee_id;
        const sentByEmployee = message.sender_id === employeeId;

        if (!byEmployee[employeeId]) {
          byEmployee[employeeId] = { employeeId, employeeName: '', lastMessage: '', lastAt: '', unread: 0 };
        }
        const conv = byEmployee[employeeId];

        if (sentByEmployee && message.sender?.name) {
          conv.employeeName = `${message.sender.name} ${message.sender.last_name}`;
        }
        conv.lastMessage = message.message;
        conv.lastAt = message.created_at;
        if (!message.is_read && sentByEmployee) conv.unread++;
      }

      // Ordenamos las conversaciones por el mensaje más reciente
      setConversations(Object.values(byEmployee).sort((a, b) => (b.lastAt > a.lastAt ? 1 : -1)));
    } catch { /* ignorar */ }
  };

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
    const timer = setInterval(fetchConversations, 10000);
    return () => clearInterval(timer);
  }, []);

  // Carga mensajes de la conversación seleccionada
  const openConversation = async (conv) => {
    setSelected(conv);
    setLoadingMsgs(true);
    try {
      const res = await api.get(`/chat-messages?employee_id=${conv.employeeId}&company_id=${companyId}`);
      setMessages(res.data.data ?? []);
      await api.post('/chat-messages/mark-read', { employee_id: conv.employeeId, reader: 'hr' }).catch(() => {});
      setConversations((prev) => prev.map((c) => c.employeeId === conv.employeeId ? { ...c, unread: 0 } : c));
    } catch { /* ignorar */ } finally { setLoadingMsgs(false); }
  };

  // Polling de mensajes cuando hay conversación abierta
  useEffect(() => {
    if (!selected) return;
    const timer = setInterval(async () => {
      const res = await api.get(`/chat-messages?employee_id=${selected.employeeId}&company_id=${companyId}`).catch(() => null);
      if (res) setMessages(res.data.data ?? []);
    }, 10000);
    return () => clearInterval(timer);
  }, [selected]);

  // Automaticamente hace un scroll al último mensaje cuando cambian los mensajes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      const res = await api.post('/chat-messages', {
        company_id: Number(companyId),
        employee_id: selected.employeeId,
        sender_id: user.id,
        message: text.trim(),
      });
      setMessages((prev) => [...prev, res.data.data]);
      setText('');
      fetchConversations();
    } catch { /* ignorar */ } finally { setSending(false); }
  };

  // Si hay una conversación abierta mostramos el chat en lugar de la bandeja
  if (selected) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-120px)]">
        <div className="bg-white rounded-t-xl border border-gray-200 px-5 py-4 flex items-center gap-3 shrink-0">
          <button onClick={() => { setSelected(null); setMessages([]); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition shrink-0">
            <MdArrowBack size={18} />
          </button>
          <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
            {selected.employeeName.charAt(0)}
          </div>
          <p className="font-semibold text-gray-800 text-sm">{selected.employeeName || `Empleado #${selected.employeeId}`}</p>
        </div>

        <div className="flex-1 bg-gray-50 border-x border-gray-200 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {loadingMsgs ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
          ) : messages.map((message) => {
            const fromHR = message.sender_id !== message.employee_id;
            return (
              <div key={message.id} className={`flex ${fromHR ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${fromHR ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm'}`}>
                  {!fromHR && <p className="text-[11px] font-semibold text-indigo-500 mb-1">{selected.employeeName}</p>}
                  <p className="leading-relaxed">{message.message}</p>
                  <p className={`text-[10px] mt-1 ${fromHR ? 'text-indigo-200' : 'text-gray-400'}`}>{formatHour(message.created_at)}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="bg-white rounded-b-xl border border-t-0 border-gray-200 px-4 py-3 flex gap-3 items-end shrink-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
            rows={1}
            maxLength={1000}
            placeholder="Responder..."
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

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
          <MdPeople size={20} className="text-indigo-600" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-800">Bandeja RRHH</h2>
          <p className="text-xs text-gray-400">Conversaciones con empleados de la empresa</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-gray-400">
            <MdContactSupport size={40} />
            <p className="mt-2 text-sm">Ningún empleado ha escrito todavía</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.employeeId}
              onClick={() => openConversation(conv)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition text-left"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                {conv.employeeName.charAt(0) || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium text-gray-800 ${conv.unread > 0 ? 'font-semibold' : ''}`}>
                  {conv.employeeName || `Empleado #${conv.employeeId}`}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{conv.lastMessage}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <p className="text-[11px] text-gray-400">{formatHour(conv.lastAt)}</p>
                {conv.unread > 0 && (
                  <span className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {conv.unread}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
