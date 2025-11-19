import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { assets } from '../assets/assets';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const { axios } = useAppContext();
  const chatRef = useRef(null);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setHistory(h => [...h, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/chat', { message: userMsg });
      setHistory(h => [...h, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error('Chat send error', err);
      const message = err?.response?.data?.error || err?.message || 'Error contacting server.'
      setHistory(h => [...h, { role: 'assistant', content: message }]);
    } finally {
      setLoading(false);
    }
  }

  // Close when clicking outside the chat box
  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(e) {
      if (chatRef.current && !chatRef.current.contains(e.target)) {
        setOpen(false);
        setHistory([]);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 1000 }}>
      {!open && <button onClick={() => setOpen(true)} style={{ padding: '10px 16px', borderRadius: 8 }}><img className='h-15 w-13 top-0' src={assets.robot}></img></button>}
      {open && (
        <div ref={chatRef} style={{ width: 340, height: 460, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', borderRadius: 8, background: '#fff', display:'flex', flexDirection:'column' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <strong>CarZilla Assistant</strong>
            <div>
              <button onClick={() => { setOpen(false); setHistory([]); }} style={{ marginLeft: 8 }}>Close</button>
            </div>
          </div>

          <div style={{ flex:1, padding: 12, overflowY: 'auto' }}>
            {history.map((m, i) => (
              <div key={i} style={{ marginBottom: 8, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                <div style={{ display: 'inline-block', padding: '8px 10px', borderRadius: 8, background: m.role === 'user' ? '#e6f7ff' : '#f5f5f5' }}>
                  <small style={{ fontWeight:700 }}>{m.role}</small><br/>
                  <span>{m.content}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ padding: 10, borderTop: '1px solid #eee', display:'flex', gap:8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about cars, bookings..." style={{ flex:1, padding:8 }} onKeyDown={(e)=>{ if(e.key==='Enter') send(); }} />
            <button onClick={send} disabled={loading} style={{ padding: '8px 12px' }}>{loading ? '...' : 'Send'}</button>
          </div>
        </div>
      )}
    </div>
  );
}