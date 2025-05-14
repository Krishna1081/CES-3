import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Loader2, Inbox, Paperclip, Send } from 'lucide-react';
// import { decodeEmailBody } from './utils/decodeEmailBody';
// import DOMPurify from 'dompurify';

const Unibox = () => {
  const [email, setEmail] = useState('');
  const [replies, setReplies] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyBoxIndex, setReplyBoxIndex] = useState(null);
//   const [replyContent, setReplyContent] = useState('');
  const [attachments, setAttachments] = useState({});

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setReplies([]);
    try {
      const response = await axios.get(`http://localhost:5000/api/unibox/${email}`);
      setReplies(response.data);
      console.log(response['data']);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachment = (e, idx) => {
    setAttachments(prev => ({ ...prev, [idx]: e.target.files }));
  };

  const handleSendReply = async (idx) => {
    const content = document.getElementById(`reply-content-${idx}`)?.innerHTML;
    const files = attachments[idx] || [];

    const formData = new FormData();
    formData.append('to', replies[idx].from);
    formData.append('content', content);
    formData.append('email', email);

    // Append each file
    for (let i = 0; i < files.length; i++) {
      formData.append('attachments', files[i]);
    }

    try {
      const res = await axios.post('http://localhost:5000/api/unibox/reply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data' 
        }
      });

      console.log('✅ Reply sent:', res.data);
      alert('Reply sent!');
      setReplyBoxIndex(null);
    } catch (err) {
      console.error('❌ Reply failed:', err);
      alert('Reply failed: ' + (err.response?.data?.error || err.message));
    }
  };


  return (
    <div className="max-w-4xl mx-auto px-6 py-10 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-extrabold text-center mb-8 flex items-center justify-center gap-2">
        <Inbox className="text-blue-600" /> Unibox Mail Replies
      </h1>

      <div className="flex flex-col sm:flex-row gap-4 mb-8 items-center justify-center">
        <input
          type="email"
          placeholder="Enter Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full sm:w-2/3 px-5 py-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-lg"
        />
        <button
          onClick={handleFetch}
          disabled={loading || !email}
          className={`px-6 py-3 rounded-lg text-white font-semibold text-lg transition duration-200 ${
            loading || !email
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 shadow-md'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={18} />
              Fetching...
            </span>
          ) : (
            'Fetch Replies'
          )}
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-center font-medium mb-6">{error}</p>
      )}

      {replies.length > 0 && (
        <div className="space-y-6">
          {replies.map((reply, idx) => (
            <div
              key={idx}
              className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg space-y-3"
            >
              <p><strong>📧 From:</strong> {reply.from}</p>
              <p><strong>📝 Subject:</strong> {reply.subject}</p>
              <p className="text-gray-800 whitespace-pre-line">
                <strong>💬 Body:</strong><br />
                {reply.text
                  ? reply.text
                  : reply.body || 'No preview available.'}
              </p>
              <button
                className="text-sm text-blue-600 hover:underline font-semibold"
                onClick={() => setReplyBoxIndex(idx)}
              >
                Reply
              </button>
              {replyBoxIndex === idx && (
                <div className="mt-4 space-y-2">
                  <div
                    id={`reply-content-${idx}`}
                    contentEditable
                    className="border border-gray-300 rounded-md min-h-[100px] px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Write your reply here..."
                    suppressContentEditableWarning
                  ></div>

                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                      <Paperclip size={16} />
                      <span>Attach files</span>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleAttachment(e, idx)}
                        className="hidden"
                      />
                    </label>

                    <button
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700"
                      onClick={() => handleSendReply(idx)}
                    >
                      <Send size={16} /> Send
                    </button>
                  </div>

                  {attachments[idx] && attachments[idx].length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {Array.from(attachments[idx]).map((file, i) => (
                        <div key={i}>{file.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Unibox;
