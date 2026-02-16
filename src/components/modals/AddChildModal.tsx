'use client';

import * as React from 'react';
import { UserPlus } from 'lucide-react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, PinInput } from '@/components/ui/input';
import { validatePin } from '@/lib/utils';

interface AddChildModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; pin: string; interest_rate_daily: number }) => Promise<void>;
}

export default function AddChildModal({ open, onOpenChange, onSubmit }: AddChildModalProps) {
  const [name, setName] = React.useState('');
  const [pin, setPin] = React.useState('');
  const [interestRate, setInterestRate] = React.useState('1.0');
  const [errors, setErrors] = React.useState<{ name?: string; pin?: string; rate?: string }>({});
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate
    const newErrors: typeof errors = {};
    
    if (!name.trim() || name.length < 1 || name.length > 50) {
      newErrors.name = 'Name must be 1-50 characters';
    }

    const pinValidation = validatePin(pin);
    if (!pinValidation.valid) {
      newErrors.pin = pinValidation.error;
    }

    const rate = parseFloat(interestRate);
    if (isNaN(rate) || rate < 0.1 || rate > 5) {
      newErrors.rate = 'Rate must be between 0.1% and 5%';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        pin,
        interest_rate_daily: rate / 100, // Convert percentage to decimal
      });
      // Reset form
      setName('');
      setPin('');
      setInterestRate('1.0');
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding child:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#2ECC71]/10 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-[#2ECC71]" />
            </div>
            <div>
              <ModalTitle>Add a Child</ModalTitle>
              <ModalDescription>
                Create a savings account for your child
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            {/* Name */}
            <Input
              label="Child's Name"
              placeholder="Enter their name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoFocus
            />

            {/* PIN */}
            <div>
              <label className="block text-sm font-medium text-[#2C3E50] mb-3 text-center">
                Create a 4-6 digit PIN
              </label>
              <PinInput
                value={pin}
                onChange={setPin}
                length={6}
                error={errors.pin}
              />
              <p className="text-xs text-[#7F8C8D] text-center mt-2">
                They&apos;ll use this to log in
              </p>
            </div>

            {/* Interest Rate */}
            <div>
              <label className="block text-sm font-medium text-[#2C3E50] mb-1.5">
                Daily Interest Rate
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.1"
                  max="5"
                  step="0.1"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="flex-1 h-2 bg-[#ECF0F1] rounded-full appearance-none cursor-pointer accent-[#2ECC71]"
                />
                <span className="w-16 text-center font-mono font-bold text-[#2ECC71]">
                  {parseFloat(interestRate).toFixed(1)}%
                </span>
              </div>
              {errors.rate && (
                <p className="mt-1.5 text-sm text-[#E74C3C]">{errors.rate}</p>
              )}
              <p className="text-xs text-[#7F8C8D] mt-2">
                At 1%/day, $100 becomes $107.21 after one week!
              </p>
            </div>
          </div>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Child
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
