'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GoogleOAuthProvider,
  GoogleLogin,
  CredentialResponse,
} from '@react-oauth/google';
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/auth-store';
import { AuthResponse } from '@/types/api';
import { getErrorMessage } from '@/lib/utils';

interface GoogleLoginButtonProps {
  onErrorMessage?: (msg: string) => void;
}

export default function GoogleLoginButton({
  onErrorMessage,
}: GoogleLoginButtonProps) {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  const reportError = (msg: string) => {
    setLocalError(msg);
    if (onErrorMessage) {
      onErrorMessage(msg);
    }
  };

  const handleGoogleSuccess = async (
    credentialResponse: CredentialResponse
  ) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      reportError('Token Google (credential) tidak ditemukan.');
      return;
    }

    setLocalError(null);
    setIsLoading(true);

    try {
      const response = await api.post<AuthResponse>('/api/auth/google', {
        idToken,
      });

      const authData = response.data;
      login(authData);

      if (authData.tipeAkun === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/');
      }
    } catch (error) {
      const msg = getErrorMessage(
        error,
        'Autentikasi Google gagal atau token tidak valid.'
      );
      reportError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!clientId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 text-center">
        <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> belum diatur di <code>.env.local</code>.
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="w-full space-y-2.5">
        <div className="flex flex-col items-center justify-center w-full overflow-hidden">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() =>
              reportError('Gagal membuka jendela autentikasi Google.')
            }
            shape="pill"
            size="large"
            text="continue_with"
            width="360"
          />
        </div>

        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 pt-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#174634]" />
            <span>Memverifikasi akun Google...</span>
          </div>
        )}

        {localError && !onErrorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{localError}</span>
          </div>
        )}
      </div>
    </GoogleOAuthProvider>
  );
}