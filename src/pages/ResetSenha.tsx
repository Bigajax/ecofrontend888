import React from 'react';

export default function ResetSenha() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Redefinir senha</h1>
        <p className="mt-4 text-sm text-gray-600">
          Este link de redefinição de senha é inválido ou já foi utilizado. Solicite um novo link e tente
          novamente.
        </p>
      </div>
    </div>
  );
}
