'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Sprout, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PinInput } from '@/components/ui/input';
import { SelectableAvatar } from '@/components/ui/avatar';
import { Child } from '@/types/database';

export default function ChildLoginPage() {
  const router = useRouter();
  const { status } = useSession();
  
  const [step, setStep] = useState<'select' | 'pin'>('select');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);

  // Fetch children for the parent (this is a public endpoint for child login)
  const fetchChildren = useCallback(async () => {
    try {
      // In a real app, this would be a public endpoint that gets children by parent email/code
      // For demo, we'll just show this is where it would go
      setLoadingChildren(false);
    } catch (err) {
      setLoadingChildren(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
    fetchChildren();
  }, [status, router, fetchChildren]);

  const handleChildSelect = (child: Child) => {
    setSelectedChild(child);
    setStep('pin');
    setPin('');
    setError(null);
  };

  const handlePinSubmit = async () => {
    if (!selectedChild || pin.length < 4) return;

    setLoading(true);
    setError(null);

    try {
      const result = await signIn('child-pin', {
        childId: selectedChild.id,
        pin,
        redirect: false,
      });

      if (result?.error) {
        setError('Wrong PIN. Try again!');
        setPin('');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pin.length >= 4) {
      handlePinSubmit();
    }
  }, [pin]);

  if (status === 'loading' || loadingChildren) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#F8FAFE] to-[#ECF0F1]">
      {/* Header */}
      <header className="p-4">
        <Link href="/login" className="flex items-center gap-2 text-[#7F8C8D] hover:text-[#2C3E50] transition-colors w-fit">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#2ECC71] rounded-3xl mx-auto mb-4 flex items-center justify-center">
              <Sprout className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#2C3E50]">
              {step === 'select' ? 'Who are you?' : `Hi, ${selectedChild?.name}!`}
            </h1>
            <p className="text-[#7F8C8D] mt-2">
              {step === 'select' 
                ? 'Choose your picture to log in'
                : 'Enter your secret PIN'
              }
            </p>
          </div>

          {step === 'select' && (
            <>
              {children.length > 0 ? (
                <div className="grid grid-cols-2 gap-6 justify-items-center">
                  {children.map((child) => (
                    <motion.div
                      key={child.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
                    >
                      <SelectableAvatar
                        name={child.name}
                        src={child.avatar_url}
                        size="xl"
                        selected={selectedChild?.id === child.id}
                        onSelect={() => handleChildSelect(child)}
                      />
                      <p className="mt-2 font-medium text-[#2C3E50]">{child.name}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-24 h-24 bg-[#ECF0F1] rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-4xl">👋</span>
                  </div>
                  <h3 className="font-bold text-lg text-[#2C3E50] mb-2">
                    Ask Your Parent
                  </h3>
                  <p className="text-[#7F8C8D] max-w-xs mx-auto mb-6">
                    Your parent needs to add you to GrowBucks first. 
                    Ask them to create your account!
                  </p>
                  <Link href="/login">
                    <Button variant="secondary">Parent Login</Button>
                  </Link>
                </div>
              )}
            </>
          )}

          {step === 'pin' && selectedChild && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg">
                <PinInput
                  value={pin}
                  onChange={setPin}
                  length={selectedChild.pin_hash?.length === 6 ? 6 : 4}
                  error={error || undefined}
                />

                {loading && (
                  <div className="flex justify-center mt-6">
                    <div className="animate-spin w-6 h-6 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setStep('select');
                    setSelectedChild(null);
                    setPin('');
                    setError(null);
                  }}
                  className="w-full mt-6 text-[#7F8C8D] hover:text-[#2C3E50] transition-colors text-sm"
                >
                  Not {selectedChild.name}? Choose someone else
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>

      {/* Footer tip */}
      <footer className="p-4 text-center">
        <p className="text-sm text-[#BDC3C7]">
          🔒 Your money is safe! Only you know your PIN.
        </p>
      </footer>
    </div>
  );
}
