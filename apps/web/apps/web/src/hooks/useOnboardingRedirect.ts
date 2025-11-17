"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

export function useOnboardingRedirect() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    const checkOnboarding = async () => {
      try {
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
  }, [isLoaded, router, user]);

  return { isChecking };
}
