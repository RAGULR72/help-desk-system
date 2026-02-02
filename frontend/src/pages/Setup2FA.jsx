import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiArrowLeft, FiCheck } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Setup2FA = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [setupData, setSetupData] = useState(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchSetupData();
    }, [user, navigate]);

    const fetchSetupData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/auth/2fa/setup-authenticated');
            setSetupData(res.data);
        } catch (err) {
            setError('Failed to initialize 2FA setup');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/api/auth/2fa/confirm-authenticated', { code });
            setSuccess(true);
            setTimeout(() => {
                navigate('/profile');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid verification code');
            setCode('');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center"
                >
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiCheck size={40} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-3">2FA Enabled!</h2>
                    <p className="text-gray-600">Your account is now secured with two-factor authentication.</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8"
            >
                <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
                >
                    <FiArrowLeft />
                    <span className="text-sm font-medium">Back to Profile</span>
                </button>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FiShield size={32} />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Enable 2FA</h2>
                    <p className="text-gray-600">Scan this QR code with Google Authenticator, Authy, or any TOTP app</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {loading && !setupData ? (
                    <div className="flex justify-center py-12">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                ) : (
                    <>
                        <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-indigo-100 inline-block mb-6 mx-auto block">
                            <QRCodeSVG value={setupData?.qr_code_url} size={200} level="H" />
                        </div>

                        <div className="bg-indigo-50 p-4 rounded-xl mb-6">
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">Manual Entry Key</p>
                            <code className="text-sm font-mono text-gray-800 break-all block">{setupData?.secret}</code>
                        </div>

                        <form onSubmit={handleConfirm} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Enter Verification Code</label>
                                <input
                                    type="text"
                                    maxLength="6"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-center text-xl font-bold tracking-[0.5em] focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none"
                                    placeholder="000000"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || code.length < 6}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Enable 2FA'}
                            </button>
                        </form>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default Setup2FA;
