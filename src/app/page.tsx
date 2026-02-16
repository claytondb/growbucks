'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sprout, TrendingUp, Sparkles, PiggyBank, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#ECF0F1]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#2ECC71] rounded-xl flex items-center justify-center">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-[#2C3E50]">GrowBucks</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#2ECC71]/10 rounded-full text-[#27AE60] text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              A teaching tool for families — no real money stored!
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold text-[#2C3E50] leading-tight mb-6">
              Teach Your Kids the{' '}
              <span className="text-gradient">Magic of Saving</span>
            </h1>
            
            <p className="text-lg md:text-xl text-[#7F8C8D] max-w-2xl mx-auto mb-8">
              GrowBucks helps parents teach kids about compound interest. 
              You "bank" your child's allowance and they watch it grow daily. 
              <span className="text-[#2C3E50] font-medium">No real money enters the app — you're the bank!</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8">
                  Start Growing Today
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="secondary" size="lg" className="text-lg px-8">
                  How It Works
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 relative"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md mx-auto border border-[#ECF0F1]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#3498DB] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  E
                </div>
                <div>
                  <p className="font-bold text-[#2C3E50]">Emma&apos;s Garden</p>
                  <p className="text-sm text-[#7F8C8D]">Growing at 1%/day</p>
                </div>
              </div>
              
              <div className="text-center py-6">
                <p className="text-sm text-[#7F8C8D] mb-2">Current Balance</p>
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="font-mono text-5xl font-bold text-[#2ECC71]"
                >
                  $147.23
                </motion.div>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <TrendingUp className="w-4 h-4 text-[#27AE60]" />
                  <span className="text-[#27AE60] font-medium">+$12.47 this month</span>
                </div>
              </div>

              <div className="h-20 bg-gradient-to-t from-[#2ECC71]/10 to-transparent rounded-lg flex items-end justify-center pb-2">
                <div className="flex items-end gap-1">
                  {[40, 50, 45, 60, 55, 70, 65, 80, 75, 90, 85, 100].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className="w-3 bg-[#2ECC71] rounded-t"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#2C3E50] mb-4">
            How It Works
          </h2>
          <p className="text-center text-[#7F8C8D] mb-12 max-w-2xl mx-auto">
            Turn allowance into a learning experience. <strong className="text-[#2C3E50]">You keep the real money</strong> — 
            kids see virtual GrowBucks that grow daily, teaching them compound interest is magical!
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: PiggyBank,
                title: '1. Add GrowBucks',
                description: 'When your child earns allowance, add GrowBucks to their account. You keep the real cash — you\'re their bank!',
                color: '#F1C40F',
              },
              {
                icon: TrendingUp,
                title: '2. Watch It Grow',
                description: 'Set an interest rate (default 1%/day) and watch their balance grow in real-time. Kids love seeing the numbers tick up!',
                color: '#2ECC71',
              },
              {
                icon: Sparkles,
                title: '3. Cash Out Anytime',
                description: 'When they want to spend, they withdraw GrowBucks and you give them real money. They\'ll see what they\'re giving up!',
                color: '#3498DB',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon className="w-8 h-8" style={{ color: item.color }} />
                </div>
                <h3 className="font-bold text-xl text-[#2C3E50] mb-2">{item.title}</h3>
                <p className="text-[#7F8C8D]">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-[#2C3E50] mb-12">
            Built for Families
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Users,
                title: 'Multiple Children',
                description: 'Add up to 10 kids, each with their own account, interest rate, and goals.',
              },
              {
                icon: Shield,
                title: 'Parent Controls',
                description: 'Set withdrawal limits, pause interest, and approve all transactions.',
              },
              {
                icon: TrendingUp,
                title: 'Real-Time Growth',
                description: 'Kids watch their balance grow second by second. It\'s mesmerizing!',
              },
              {
                icon: Sparkles,
                title: 'Fun Animations',
                description: 'Coins rain down on deposits, sparkles for interest. Kids love it!',
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex gap-4 p-6 bg-white rounded-2xl border border-[#ECF0F1]"
              >
                <div className="w-12 h-12 bg-[#2ECC71]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-[#2ECC71]" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#2C3E50] mb-1">{feature.title}</h3>
                  <p className="text-[#7F8C8D]">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Example calculation */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#2ECC71]/5 to-[#F1C40F]/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2C3E50] mb-4">
            See the Magic of Compound Interest
          </h2>
          <p className="text-[#7F8C8D] mb-8">
            At 1% daily interest, here&apos;s how $100 grows:
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Day 1', amount: '$101.00' },
              { label: 'Week 1', amount: '$107.21' },
              { label: 'Month 1', amount: '$134.78' },
              { label: '3 Months', amount: '$244.69' },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <p className="text-sm text-[#7F8C8D] mb-1">{item.label}</p>
                <p className="font-mono text-2xl font-bold text-[#2ECC71]">{item.amount}</p>
              </motion.div>
            ))}
          </div>

          <p className="text-sm text-[#7F8C8D] mt-6">
            That&apos;s the power of compound interest! Start teaching today.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#2C3E50] mb-4">
            Ready to Start Growing?
          </h2>
          <p className="text-[#7F8C8D] mb-8">
            Create your free family account and start teaching your kids 
            the value of saving today.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[#ECF0F1]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2ECC71] rounded-lg flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[#2C3E50]">GrowBucks</span>
          </div>
          <p className="text-sm text-[#7F8C8D]">
            © 2026 GrowBucks. Teaching kids about money, one cent at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}
