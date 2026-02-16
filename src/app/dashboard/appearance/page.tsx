'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor, Palette, Check, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'green' | 'blue' | 'purple' | 'orange' | 'pink';

const accentColors: { id: AccentColor; name: string; color: string; gradient: string }[] = [
  { id: 'green', name: 'Sprout Green', color: '#2ECC71', gradient: 'from-[#2ECC71] to-[#27AE60]' },
  { id: 'blue', name: 'Sky Blue', color: '#3498DB', gradient: 'from-[#3498DB] to-[#2980B9]' },
  { id: 'purple', name: 'Royal Purple', color: '#9B59B6', gradient: 'from-[#9B59B6] to-[#8E44AD]' },
  { id: 'orange', name: 'Sunset Orange', color: '#F39C12', gradient: 'from-[#F39C12] to-[#E67E22]' },
  { id: 'pink', name: 'Blossom Pink', color: '#E91E63', gradient: 'from-[#E91E63] to-[#C2185B]' },
];

export default function AppearancePage() {
  const { status } = useSession();
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('light');
  const [accent, setAccent] = useState<AccentColor>('green');
  const [animations, setAnimations] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin w-8 h-8 border-4 border-[#2ECC71] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-[#2C3E50] mb-2">Appearance</h1>
        <p className="text-[#7F8C8D] mb-6">Customize how GrowBucks looks</p>

        {/* Theme Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="w-5 h-5 text-[#2ECC71]" />
              Theme
            </CardTitle>
            <CardDescription>Choose your preferred color scheme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light' as Theme, icon: Sun, label: 'Light', desc: 'Bright & cheerful' },
                { id: 'dark' as Theme, icon: Moon, label: 'Dark', desc: 'Easy on the eyes' },
                { id: 'system' as Theme, icon: Monitor, label: 'System', desc: 'Match device' },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setTheme(option.id)}
                  className={`relative p-4 rounded-xl border-2 transition-all ${
                    theme === option.id
                      ? 'border-[#2ECC71] bg-[#2ECC71]/5'
                      : 'border-[#ECF0F1] hover:border-[#BDC3C7]'
                  }`}
                >
                  {theme === option.id && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-[#2ECC71] rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <option.icon className={`w-8 h-8 mx-auto mb-2 ${
                    theme === option.id ? 'text-[#2ECC71]' : 'text-[#7F8C8D]'
                  }`} />
                  <p className="font-medium text-[#2C3E50] text-center">{option.label}</p>
                  <p className="text-xs text-[#7F8C8D] text-center">{option.desc}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accent Color */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Accent Color</CardTitle>
            <CardDescription>Pick your favorite color for highlights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setAccent(color.id)}
                  className={`relative group`}
                >
                  <div 
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color.gradient} shadow-lg transition-transform ${
                      accent === color.id ? 'scale-110 ring-2 ring-offset-2 ring-current' : 'hover:scale-105'
                    }`}
                    style={{ color: accent === color.id ? color.color : undefined }}
                  >
                    {accent === color.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-6 h-6 text-white drop-shadow" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#7F8C8D] text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {color.name}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Animations */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#F39C12]" />
              Animations
            </CardTitle>
            <CardDescription>Control motion and visual effects</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#F8FAFE] rounded-xl">
              <div>
                <p className="font-medium text-[#2C3E50]">Enable Animations</p>
                <p className="text-sm text-[#7F8C8D]">Smooth transitions and effects</p>
              </div>
              <button
                onClick={() => setAnimations(!animations)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  animations ? 'bg-[#2ECC71]' : 'bg-[#BDC3C7]'
                }`}
              >
                <div 
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    animations ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F8FAFE] rounded-xl">
              <div>
                <p className="font-medium text-[#2C3E50]">Celebration Effects</p>
                <p className="text-sm text-[#7F8C8D]">Confetti on deposits and achievements</p>
              </div>
              <button
                className="w-12 h-6 rounded-full bg-[#2ECC71]"
              >
                <div className="w-5 h-5 bg-white rounded-full shadow translate-x-6" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#F8FAFE] rounded-xl">
              <div>
                <p className="font-medium text-[#2C3E50]">Growing Balance Animation</p>
                <p className="text-sm text-[#7F8C8D]">See numbers tick up in real-time</p>
              </div>
              <button
                className="w-12 h-6 rounded-full bg-[#2ECC71]"
              >
                <div className="w-5 h-5 bg-white rounded-full shadow translate-x-6" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
            <CardDescription>See how your choices look</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 bg-gradient-to-br from-white to-[#F8FAFE] rounded-xl border border-[#ECF0F1]">
              <div className="flex items-center gap-3 mb-4">
                <div 
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                    accentColors.find(c => c.id === accent)?.gradient
                  } flex items-center justify-center`}
                >
                  <span className="text-white font-bold">E</span>
                </div>
                <div>
                  <p className="font-bold text-[#2C3E50]">Emma&apos;s Garden</p>
                  <p className="text-sm" style={{ color: accentColors.find(c => c.id === accent)?.color }}>
                    Growing at 1%/day
                  </p>
                </div>
              </div>
              <div className="text-center py-4">
                <p className="text-3xl font-mono font-bold" style={{ color: accentColors.find(c => c.id === accent)?.color }}>
                  $147.23
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
