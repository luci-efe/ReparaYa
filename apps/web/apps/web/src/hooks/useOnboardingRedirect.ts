"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export function useOnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    // No redirigir si ya está en onboarding o en páginas de auth
    if (pathname?.startsWith('/onboarding') || pathname?.startsWith('/sign-')) {
      setIsChecking(false);
      return;
    }

    const checkOnboarding = async () => {
      try {
        // Si el usuario omitió el onboarding, no redirigir
        if (typeof window !== 'undefined' && sessionStorage.getItem('onboarding_skipped') === 'true') {
          setIsChecking(false);
          return;
        }

        const response = await fetch('/api/users/me');

        if (!response.ok) {
          setIsChecking(false);
          return;
        }

        const profile = await response.json();

        // Si es cliente y no tiene direcciones, necesita completar onboarding
        if (profile.role === 'CLIENT' && (!profile.addresses || profile.addresses.length === 0)) {
          router.push('/onboarding/role-selection');
          return;
        }

        setIsChecking(false);
      } catch (error) {
        console.error('Error checking onboarding:', error);
        setIsChecking(false);
      }
    };

    checkOnboarding();
  }, [isLoaded, router, pathname, user]);

  return { isChecking };
}
