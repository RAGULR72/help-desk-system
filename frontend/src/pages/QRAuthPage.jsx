import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiAlertCircle, FiShield } from 'react-icons/fi';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const QRAuthPage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sid');
    const navigate = useNavigate();
    const { user } = useAuth();

    const [status, setStatus] = useState('confirming'); // confirming, authorizing, success, error, limit_reached
    const [error, setError] = useState('');
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            // Redirect to login if NOT logged in, then they'll come back
            navigate(`/login?redirect=/qr-auth?sid=${sessionId}`);
        }
    }, [user, navigate, sessionId]);

    const handleAuthorize = async () => {
        setStatus('authorizing');
        setLoading(true);
        try {
            await api.post(`/api/auth/qr/authorize/${sessionId}`);
            setStatus('success');
            // Wait 2 seconds then go to dashboard
            setTimeout(() => navigate('/'), 2000);
        } catch (err) {
            if (err.response?.status === 409) {
                setStatus('limit_reached');
                setSessions(err.response.data.detail.sessions);
            } else {
                setStatus('error');
                setError(err.response?.data?.detail || "Authorization failed");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleTerminateFromMobile = async (sessId) => {
        setLoading(true);
        try {
            // We'll need a way for the phone user to authorize termination.
            // Since they are ALREADY logged in on the phone, they can use the normal revoke endpoint
            await api.delete(`/api/auth/sessions/${sessId}`);
            // After revoking, try authorizing the QR again
            handleAuthorize();
        } catch (err) {
            setError("Failed to terminate session.");
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
            >
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                    <FiShield size={32} />
                </div>

                {status === 'confirming' && (
                    <>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authorize Login?</h2>
                        <p className="text-gray-500 mb-8">
                            A browser is requesting access to your Proserve account. Confirm it's you to log in instantly.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleAuthorize}
                                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                            >
                                Yes, Authorize Login
                            </button>
                            <button
                                onClick={() => navigate('/')}
                                className="w-full bg-gray-50 text-gray-600 font-bold py-4 rounded-xl hover:bg-gray-100 transition-all"
                            >
                                No, Cancel
                            </button>
                        </div>
                    </>
                )}

                {status === 'authorizing' && (
                    <div className="py-12">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 font-medium">Authorizing session...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-8">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiCheckCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Success!</h2>
                        <p className="text-gray-500">The browser has been logged in. You can close this window now.</p>
                    </div>
                )}

                {status === 'limit_reached' && (
                    <div className="text-left">
                        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-4">
                            <FiAlertCircle size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Limit Reached</h2>
                        <p className="text-sm text-gray-500 mb-6">
                            Target browser-la login panna, edhavaadhu oru session-ah ippo close pannanum.
                        </p>

                        <div className="space-y-3 mb-8">
                            {sessions.map(s => (
                                <div key={s.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                                    <div className="text-xs">
                                        <div className="font-bold text-gray-800">{s.os} • {s.browser}</div>
                                        <div className="text-gray-400">{s.time}</div>
                                    </div>
                                    <button
                                        onClick={() => handleTerminateFromMobile(s.id)}
                                        disabled={loading}
                                        className="text-[10px] font-black bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                                    >
                                        TERMINATE
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => navigate('/')}
                            className="w-full text-center text-gray-400 text-sm font-bold"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-8">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiAlertCircle size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Authorization Failed</h2>
                        <p className="text-red-500 font-medium mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="text-indigo-600 font-bold hover:underline"
                        >
                            Return to Dashboard
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default QRAuthPage;
