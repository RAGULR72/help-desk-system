import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiPhone, FiMapPin, FiFacebook, FiTwitter, FiLinkedin, FiInstagram } from 'react-icons/fi';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="relative pt-12 pb-8 overflow-hidden bg-gray-900 text-white">
            {/* Background Decoration */}
            <div className="absolute inset-0">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    {/* Company Info */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <h3 className="text-2xl font-bold text-emerald-500 mb-4 tracking-tight flex items-center gap-3">
                                <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center text-emerald-400 font-black border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                                    <span className="text-lg text-emerald-400">P</span>
                                </div>
                                Proserve
                            </h3>
                            <p className="text-gray-400 mb-6">
                                Professional Help Desk Support System. Providing timely and effective solutions for all your IT needs.
                            </p>
                        </motion.div>
                    </div>

                    {/* Contact Info */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <h4 className="text-lg font-semibold mb-4 text-white">Contact Support</h4>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 text-gray-400">
                                    <FiMapPin className="mt-1 flex-shrink-0 text-indigo-400" />
                                    <span className="text-sm">
                                        6B, Ashirwad MIG Flats, P T Rajan Road, KK Nagar, Chennai 600 078
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <FiPhone className="flex-shrink-0 text-indigo-400" />
                                    <a href="tel:04423715214" className="text-sm hover:text-indigo-400 transition-colors">
                                        044 2371 5214 / 9841010256
                                    </a>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <FiMail className="flex-shrink-0 text-indigo-400" />
                                    <a href="mailto:Support@proserve.in" className="text-sm hover:text-indigo-400 transition-colors">
                                        Support@proserve.in
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/10 pt-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-500 text-sm">
                            © {currentYear} Proserve Help Desk. All rights reserved.
                        </p>

                        <div className="flex gap-4">
                            {[<FiFacebook />, <FiTwitter />, <FiLinkedin />, <FiInstagram />].map((icon, index) => (
                                <motion.a
                                    key={index}
                                    href="#"
                                    whileHover={{ scale: 1.1, y: -2 }}
                                    className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 
                                             hover:text-white hover:bg-white/10 transition-all border border-white/10"
                                >
                                    {icon}
                                </motion.a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
