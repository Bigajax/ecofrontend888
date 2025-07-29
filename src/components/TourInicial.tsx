import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GlassBubble from './GlassBubble';
import Sequence from './Sequence';
import { X, ArrowRight } from 'lucide-react';

interface TourInicialProps {
    onClose: () => void;
}

const loginGradient = "linear-gradient(to bottom right, #eff6ff, #ede7f6, #fce4ec)";

const TourInicial: React.FC<TourInicialProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const [showSequence, setShowSequence] = useState(false);

    const handleIniciarSequence = () => {
        setShowSequence(true);
    };

    const handleSequenceClosed = () => {
        onClose();
        navigate('/chat');
    };

    return (
        <div
            className="fixed top-0 left-0 w-full h-full z-50 flex items-center justify-center"
            style={{ background: loginGradient }} // Aplicando o gradiente ao container principal
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl shadow-lg max-w-md w-full h-[500px] relative overflow-hidden"
            >
                {!showSequence ? (
                    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        {/* Botão de fechar (ícone de X) */}
                        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-sm z-10">
                            <X size={20} />
                        </button>
                        <h2 className="text-2xl font-bold mb-4">Bem-vindo ao ECO!</h2>
                        <p className="text-gray-700 mb-6">Explore uma breve introdução.</p>
                        <div className="mb-8">
                            <GlassBubble color="#a78bfa" />
                        </div>
                        <button
                            onClick={handleIniciarSequence}
                            className="px-6 py-3 bg-black text-white rounded-full
                                     hover:bg-gray-800 transition-colors
                                     font-medium shadow-md hover:shadow-lg
                                     flex items-center gap-2"
                        >
                            Próximo
                            <ArrowRight size={16} />
                        </button>
                    </div>
                ) : (
                    <Sequence onClose={handleSequenceClosed} />
                )}
                {/* Botão de fechar (ícone de X) - Mantido aqui para o componente Sequence */}
                {showSequence && (
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-sm z-10">
                        <X size={20} />
                    </button>
                )}
            </motion.div>
        </div>
    );
};

export default TourInicial;
