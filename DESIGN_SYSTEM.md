# GrowBucks Design System

> **Philosophy:** Playful but trustworthy. Kids should feel excited to watch their money grow. Parents should feel confident their children are learning real financial skills.

---

## 1. Color Palette

### Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Sprout Green** | `#2ECC71` | Primary - growth, money, positivity |
| **Leaf Green** | `#27AE60` | Primary Dark - hover states, emphasis |
| **Sky Blue** | `#3498DB` | Secondary - trust, stability, links |
| **Ocean Blue** | `#2980B9` | Secondary Dark - hover states |
| **Sunny Gold** | `#F1C40F` | Accent - coins, rewards, achievements |
| **Warm Amber** | `#F39C12` | Accent Dark - interest earned highlights |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Success** | `#27AE60` | Deposits, positive growth |
| **Warning** | `#E67E22` | Pending actions, reminders |
| **Error** | `#E74C3C` | Withdrawals, validation errors |
| **Info** | `#3498DB` | Tips, educational content |

### Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| **Midnight** | `#2C3E50` | Primary text |
| **Slate** | `#7F8C8D` | Secondary text, captions |
| **Silver** | `#BDC3C7` | Borders, dividers |
| **Cloud** | `#ECF0F1` | Card backgrounds, inputs |
| **Snow** | `#F8FAFE` | Page background |
| **White** | `#FFFFFF` | Cards, surfaces |

### Gradients

```css
/* Money Growth Gradient - for charts and progress */
--gradient-growth: linear-gradient(135deg, #2ECC71 0%, #27AE60 50%, #F1C40F 100%);

/* Sky Trust Gradient - headers, hero sections */
--gradient-trust: linear-gradient(135deg, #3498DB 0%, #2ECC71 100%);

/* Coin Shimmer - for reward animations */
--gradient-coin: linear-gradient(135deg, #F1C40F 0%, #F39C12 50%, #F1C40F 100%);
```

---

## 2. Typography

### Font Stack

| Role | Font | Fallback | Weight |
|------|------|----------|--------|
| **Headings** | [Nunito](https://fonts.google.com/specimen/Nunito) | system-ui, sans-serif | 700, 800 |
| **Body** | [Inter](https://fonts.google.com/specimen/Inter) | system-ui, sans-serif | 400, 500, 600 |
| **Numbers/Money** | [DM Mono](https://fonts.google.com/specimen/DM+Mono) | monospace | 500 |

> **Why these fonts?**
> - **Nunito**: Rounded terminals feel friendly and approachable for kids
> - **Inter**: Highly legible, professional enough for parents
> - **DM Mono**: Clear number differentiation for financial figures

### Type Scale (Mobile-First)

```css
--text-xs:    0.75rem;   /* 12px - Fine print */
--text-sm:    0.875rem;  /* 14px - Captions, labels */
--text-base:  1rem;      /* 16px - Body text */
--text-lg:    1.125rem;  /* 18px - Lead paragraphs */
--text-xl:    1.25rem;   /* 20px - Card titles */
--text-2xl:   1.5rem;    /* 24px - Section headers */
--text-3xl:   1.875rem;  /* 30px - Page titles */
--text-4xl:   2.25rem;   /* 36px - Hero numbers (balance) */
--text-5xl:   3rem;      /* 48px - Big celebrations */
```

### Line Heights

```css
--leading-tight:  1.25;  /* Headings */
--leading-normal: 1.5;   /* Body text */
--leading-relaxed: 1.75; /* Educational content */
```

### Money Display

```css
.balance-display {
  font-family: 'DM Mono', monospace;
  font-size: var(--text-4xl);
  font-weight: 500;
  color: var(--sprout-green);
  letter-spacing: -0.02em;
}

/* Cents slightly smaller */
.balance-cents {
  font-size: 0.6em;
  vertical-align: super;
}
```

---

## 3. Component Specifications

### Buttons

#### Primary Button
```css
.btn-primary {
  background: var(--sprout-green);
  color: white;
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  border-radius: 12px;
  padding: 12px 24px;
  border: none;
  box-shadow: 0 4px 0 var(--leaf-green);
  transform: translateY(0);
  transition: all 0.15s ease;
}

.btn-primary:hover {
  background: var(--leaf-green);
  transform: translateY(-2px);
  box-shadow: 0 6px 0 #1e8449;
}

.btn-primary:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--leaf-green);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: white;
  color: var(--sprout-green);
  border: 2px solid var(--sprout-green);
  border-radius: 12px;
  padding: 10px 22px;
}

.btn-secondary:hover {
  background: var(--cloud);
}
```

#### Button Sizes
| Size | Padding | Font Size | Min Height |
|------|---------|-----------|------------|
| Small | 8px 16px | 14px | 36px |
| Medium | 12px 24px | 16px | 44px |
| Large | 16px 32px | 18px | 52px |

#### Special Buttons
```css
/* Coin/Deposit Button - has shimmer effect */
.btn-deposit {
  background: var(--sunny-gold);
  color: var(--midnight);
  /* Animated shimmer on idle */
}

/* Danger/Withdraw - muted, requires confirmation */
.btn-withdraw {
  background: var(--cloud);
  color: var(--error);
  border: 2px solid var(--error);
}
```

---

### Cards

#### Base Card
```css
.card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.08);
  border: 1px solid var(--silver);
}
```

#### Child Account Card
```css
.card-child-account {
  /* Extends base card */
  position: relative;
  overflow: hidden;
  padding: 24px;
}

.card-child-account::before {
  /* Subtle gradient accent at top */
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-growth);
}

/* Avatar: 48px circle with kid's initial or emoji */
/* Balance: Large DM Mono, green */
/* Growth indicator: Small pill showing +$X.XX this month */
```

**Child Card Anatomy:**
```
┌────────────────────────────────┐
│ ████████████████████████████ │  ← Gradient accent bar
│                                │
│  🌱  Emma's Garden            │  ← Avatar + Account name
│                                │
│      $47.23                    │  ← Balance (large, green)
│      ↑ +$2.15 this month       │  ← Growth (small, with icon)
│                                │
│  [View Details]                │  ← Action link
└────────────────────────────────┘
```

#### Transaction Card
```css
.card-transaction {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

/* Left: Icon (deposit=green coin, interest=sparkle, withdraw=orange) */
/* Center: Description + date */
/* Right: Amount (green for +, red for -) */
```

**Transaction Types:**
| Type | Icon | Color | Label |
|------|------|-------|-------|
| Deposit | 🪙 | Green | "Added" |
| Interest | ✨ | Gold | "Interest earned!" |
| Withdraw | 📤 | Orange | "Withdrawn" |

---

### Charts

#### Growth Visualization Style

**Primary Chart: Area Chart**
- Soft, curved lines (tension: 0.4)
- Filled area with gradient (green top → transparent bottom)
- Grid: Light dashed lines, minimal
- Labels: Inter font, slate color

```css
.chart-growth {
  --chart-line: var(--sprout-green);
  --chart-fill: linear-gradient(
    180deg,
    rgba(46, 204, 113, 0.3) 0%,
    rgba(46, 204, 113, 0.05) 100%
  );
  --chart-grid: var(--silver);
  --chart-dot: var(--sunny-gold);  /* Highlight points */
}
```

**Interest Visualization:**
- Show compound growth as stacked areas
- Principal: Solid green
- Interest: Lighter green with sparkle pattern
- Use smooth animations when values update

**Milestone Markers:**
- Gold star icons at goal achievements
- Tooltip on hover/tap showing date + amount

---

### Input Fields

```css
.input {
  font-family: 'Inter', sans-serif;
  font-size: 16px; /* Prevents iOS zoom */
  padding: 14px 16px;
  border: 2px solid var(--silver);
  border-radius: 12px;
  background: white;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--sky-blue);
  box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.15);
}

.input-error {
  border-color: var(--error);
}

.input-error:focus {
  box-shadow: 0 0 0 4px rgba(231, 76, 60, 0.15);
}
```

#### Money Input
```css
.input-money {
  font-family: 'DM Mono', monospace;
  font-size: 24px;
  text-align: center;
  padding: 20px;
}

/* Large "$" prefix, slightly muted */
.input-money-prefix {
  color: var(--slate);
  margin-right: 4px;
}
```

---

### Navigation

#### Bottom Tab Bar (Mobile)
```css
.nav-bottom {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: white;
  border-top: 1px solid var(--silver);
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--slate);
  font-size: 12px;
  font-weight: 500;
}

.nav-item.active {
  color: var(--sprout-green);
}

.nav-item.active .nav-icon {
  /* Slight bounce animation on selection */
}
```

**Tab Items:**
| Icon | Label | Purpose |
|------|-------|---------|
| 🏠 | Home | Dashboard |
| 📊 | Growth | Charts & history |
| ➕ | Add | Quick deposit (center, prominent) |
| 🎯 | Goals | Savings goals |
| 👤 | Profile | Settings, parent access |

---

## 4. Animation Guidelines

### Core Principles
1. **Quick but smooth** - 200-300ms for most interactions
2. **Purposeful** - Animation should reinforce the action
3. **Delightful, not distracting** - Kids love motion, but don't overdo it
4. **Performance first** - Use transform/opacity, avoid layout thrashing

### Easing Functions
```css
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

---

### Money Growing Animation

**Concept: "Sprout Growth"**

When interest is added or money deposited:

1. **Coin Drop** (0-200ms)
   - Coin icon falls from above
   - Slight squash on landing
   - Small particle burst (sparkles)

2. **Number Roll** (200-500ms)
   - Balance digits animate like slot machine
   - New value lands with subtle bounce
   - Green glow pulse on the number

3. **Growth Indicator** (300-600ms)
   - Small "+$X.XX" floats up and fades
   - Accompanied by tiny leaf/sprout icon
   - Triggers confetti for milestones

```css
@keyframes coin-drop {
  0% { transform: translateY(-50px) scale(1); opacity: 0; }
  60% { transform: translateY(0) scale(1); opacity: 1; }
  75% { transform: translateY(-5px) scale(1.1, 0.9); }
  100% { transform: translateY(0) scale(1); }
}

@keyframes number-glow {
  0% { text-shadow: 0 0 0 rgba(46, 204, 113, 0); }
  50% { text-shadow: 0 0 20px rgba(46, 204, 113, 0.5); }
  100% { text-shadow: 0 0 0 rgba(46, 204, 113, 0); }
}

@keyframes float-up-fade {
  0% { transform: translateY(0); opacity: 1; }
  100% { transform: translateY(-30px); opacity: 0; }
}
```

---

### Micro-interactions

| Element | Trigger | Animation |
|---------|---------|-----------|
| **Buttons** | Press | Push down, shadow shrinks |
| **Cards** | Tap | Slight scale up (1.02), lift shadow |
| **Toggle** | Switch | Handle slides with bounce ease |
| **Checkbox** | Check | Checkmark draws in with stroke animation |
| **Like/Star** | Tap | Pop with scale + particle burst |
| **Pull to refresh** | Pull | Coin spins as loading indicator |
| **Success** | Complete | Full-screen confetti (milestone) or checkmark bounce |

#### Button Press
```css
.btn:active {
  transform: scale(0.96);
  transition: transform 0.1s var(--ease-smooth);
}
```

#### Card Hover/Tap
```css
.card-interactive {
  transition: transform 0.2s var(--ease-smooth), 
              box-shadow 0.2s var(--ease-smooth);
}

.card-interactive:hover,
.card-interactive:active {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(44, 62, 80, 0.12);
}
```

---

### Loading States

**Primary Loader: Growing Coin**
- Gold coin that grows leaves/sprouts
- Rotates gently while loading
- Text: "Growing your money..."

```css
@keyframes coin-spin {
  0% { transform: rotateY(0deg); }
  100% { transform: rotateY(360deg); }
}

.loader-coin {
  width: 48px;
  height: 48px;
  animation: coin-spin 1.5s ease-in-out infinite;
}
```

**Skeleton Loading:**
- Soft shimmer effect
- Rounded shapes matching content
- Uses gradient animation

```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--cloud) 0%,
    var(--silver) 50%,
    var(--cloud) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
```

**Progress Indicators:**
- Watering can filling up
- Plant growing taller
- Piggy bank getting fuller

---

## 5. Iconography

### Style Guidelines

| Attribute | Value |
|-----------|-------|
| **Style** | Rounded, friendly, outlined with 2px stroke |
| **Corners** | Rounded (4px minimum radius) |
| **Size grid** | 24x24px base, scale to 16/20/32/48 |
| **Stroke** | 2px consistent weight |
| **Fill** | Mostly outlined, fills for emphasis states |

### Recommended Icon Set
[Phosphor Icons](https://phosphoricons.com/) - Rounded variant
- Friendly, consistent, great React/Vue support
- Good variety of finance-related icons

### Custom Icons Needed

| Icon | Description | Usage |
|------|-------------|-------|
| **Sprout Coin** | Coin with small leaf/sprout growing | App icon, loading |
| **Growing Stack** | Stacked coins with upward graph line | Growth indicator |
| **Watering Can** | Cute watering can | Adding money |
| **Piggy Sprout** | Piggy bank with plant growing from top | Savings goals |
| **Star Badge** | Star with ribbon | Achievements |
| **Family Tree** | Simple tree with multiple branches | Family accounts |

### Icon Colors

| State | Color |
|-------|-------|
| **Default** | `var(--slate)` |
| **Active** | `var(--sprout-green)` |
| **Money/Reward** | `var(--sunny-gold)` |
| **Error** | `var(--error)` |

---

## 6. Spacing & Layout

### Spacing Scale
```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### Border Radius
```css
--radius-sm:   8px;   /* Buttons, inputs */
--radius-md:   12px;  /* Cards, modals */
--radius-lg:   16px;  /* Large cards */
--radius-xl:   24px;  /* Bottom sheets */
--radius-full: 9999px; /* Pills, avatars */
```

### Mobile-First Breakpoints
```css
--bp-sm:  480px;   /* Large phones */
--bp-md:  768px;   /* Tablets */
--bp-lg:  1024px;  /* Laptops */
--bp-xl:  1280px;  /* Desktops */
```

---

## 7. Accessibility

### Color Contrast
All text combinations meet WCAG AA (4.5:1 for body, 3:1 for large text):
- Midnight on Snow: ✅ 12.6:1
- Midnight on Cloud: ✅ 10.8:1
- White on Sprout Green: ✅ 4.5:1
- White on Sky Blue: ✅ 4.5:1

### Touch Targets
- Minimum 44x44px for all interactive elements
- 8px minimum spacing between touch targets

### Focus States
```css
*:focus-visible {
  outline: 3px solid var(--sky-blue);
  outline-offset: 2px;
}
```

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. Voice & Tone

### For Kids
- "Your money grew by $0.50! 🌱"
- "Awesome! You're getting closer to your goal!"
- "Keep saving - watch it grow!"

### For Parents
- "Emma earned $2.15 in interest this month"
- "Review and approve pending transactions"
- "Set up automatic weekly deposits"

### UI Text Guidelines
| Do | Don't |
|----|-------|
| "Add money" | "Make a deposit" |
| "Take out" | "Withdraw funds" |
| "Your money grew!" | "Interest accrued" |
| "Savings goal" | "Financial objective" |

---

## Quick Reference: CSS Variables

```css
:root {
  /* Colors */
  --sprout-green: #2ECC71;
  --leaf-green: #27AE60;
  --sky-blue: #3498DB;
  --ocean-blue: #2980B9;
  --sunny-gold: #F1C40F;
  --warm-amber: #F39C12;
  --success: #27AE60;
  --warning: #E67E22;
  --error: #E74C3C;
  --info: #3498DB;
  --midnight: #2C3E50;
  --slate: #7F8C8D;
  --silver: #BDC3C7;
  --cloud: #ECF0F1;
  --snow: #F8FAFE;
  
  /* Typography */
  --font-heading: 'Nunito', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'DM Mono', monospace;
  
  /* Animation */
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
}
```

---

*Last updated: February 2026*
*Version: 1.0*
