'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FiArrowDownLeft,
  FiArrowUpRight,
  FiBell,
  FiChevronDown,
  FiCreditCard,
  FiDownload,
  FiEdit3,
  FiGrid,
  FiHome,
  FiList,
  FiMoreHorizontal,
  FiPieChart,
  FiPlus,
  FiRefreshCcw,
  FiSettings,
  FiShoppingBag,
  FiTrash2,
  FiTruck,
  FiX,
} from 'react-icons/fi'
import { motion, useReducedMotion } from 'framer-motion'
import { MdFastfood } from 'react-icons/md'
import { TbPigMoney } from 'react-icons/tb'

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'AED',
  maximumFractionDigits: 0,
})

const categoryConfig = [
  { id: 'home', label: 'Home', color: '#8f43ff', icon: FiHome },
  { id: 'food', label: 'Food', color: '#fb2f7f', icon: MdFastfood },
  { id: 'transport', label: 'Transport', color: '#19c7a7', icon: FiTruck },
  { id: 'shopping', label: 'Shopping', color: '#ff6845', icon: FiShoppingBag },
  { id: 'others', label: 'Others', color: '#ffbd3d', icon: FiGrid },
]

const incomeCategories = [
  { id: 'salary', label: 'Salary' },
  { id: 'business', label: 'Business' },
  { id: 'rental', label: 'Rental' },
  { id: 'others', label: 'Others' },
]

const periods = ['This Month', 'Last Month', 'All Time']
const dashboardContainerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.055,
    },
  },
}
const dashboardItemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
}
const modalFieldClass =
  'finance-field mt-2 w-full rounded-2xl border border-white/12 px-4 py-3 font-bold outline-none transition focus:border-[#d65cff] focus:ring-2 focus:ring-[#d65cff]/30'
const modalSelectClass =
  'finance-select mt-2 w-full rounded-2xl border border-white/12 px-3 py-3 text-sm font-bold outline-none transition focus:border-[#d65cff] focus:ring-2 focus:ring-[#d65cff]/30'

const createDate = (offsetDays = 0) => {
  const date = new Date()
  date.setDate(date.getDate() - offsetDays)
  return date.toISOString().slice(0, 10)
}

const createMemberPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = new Uint8Array(10)

  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(bytes)
  } else {
    bytes.fill(Date.now() % 255)
  }

  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

const initialTransactions = []
const initialCards = []

const initialSettings = {
  openingBalance: 0,
  monthlyTarget: 0,
}

const getMonthKey = date => {
  const parsed = new Date(date)
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(
    2,
    '0',
  )}`
}

const getPeriodKey = period => {
  const now = new Date()

  if (period === 'Last Month') {
    now.setMonth(now.getMonth() - 1)
  }

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const formatMoney = value => moneyFormatter.format(Math.round(value || 0))
const parseAmount = value => Number(String(value || '').replace(/,/g, ''))

const sumBy = (items, predicate) =>
  items.reduce((total, item) => total + (predicate(item) ? item.amount : 0), 0)

const getCategory = id =>
  categoryConfig.find(category => category.id === id) || categoryConfig[4]

const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

const getLastMonthKey = () => {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const filterByMonthKey = (items, monthKey) =>
  items.filter(item => getMonthKey(item.date) === monthKey)

const formatChange = (current, previous) => {
  if (!previous && !current) {
    return { label: '0% vs Last Month', tone: 'neutral' }
  }

  if (!previous) {
    return { label: 'New this month', tone: 'neutral' }
  }

  const delta = ((current - previous) / previous) * 100
  const rounded = Math.abs(delta).toFixed(1)
  const tone = delta >= 0 ? 'up' : 'down'

  return {
    label: `${delta >= 0 ? '+' : '-'}${rounded}% vs Last Month`,
    tone,
  }
}

export default function FinanceTracker() {
  const [auth, setAuth] = useState(null)
  const [members, setMembers] = useState([])
  const [transactions, setTransactions] = useState(initialTransactions)
  const [cards, setCards] = useState(initialCards)
  const [settings, setSettings] = useState(initialSettings)
  const [activeTab, setActiveTab] = useState('home')
  const [period, setPeriod] = useState('This Month')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [memberFilter, setMemberFilter] = useState('all')
  const [transactionModal, setTransactionModal] = useState(null)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installHelpOpen, setInstallHelpOpen] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [stateLoaded, setStateLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState('')
  const [memberForm, setMemberForm] = useState({
    email: '',
    password: createMemberPassword(),
  })
  const [memberInvite, setMemberInvite] = useState(null)

  const [form, setForm] = useState({
    title: '',
    amount: '',
    category: 'home',
    incomeCategory: 'salary',
    member: 'Family',
    date: createDate(),
    cardId: '',
    accountId: 'cash',
  })

  const [cardForm, setCardForm] = useState({
    name: '',
    limit: '',
    balance: '',
  })

  useEffect(() => {
    let cancelled = false

    const loadSession = async () => {
      try {
        const authResponse = await fetch('/api/auth/me', { cache: 'no-store' })
        if (!authResponse.ok) {
          if (!cancelled) {
            setHydrated(true)
          }
          return
        }

        const authData = await authResponse.json()
        if (!authData.authenticated || !authData.user) {
          if (!cancelled) {
            setHydrated(true)
          }
          return
        }

        const stateResponse = await fetch('/api/finance/state', { cache: 'no-store' })
        const stateData = stateResponse.ok ? await stateResponse.json() : {}

        if (cancelled) return

        setAuth(authData)
        setMembers(stateData.members || authData.members || [])
        setTransactions(stateData.transactions || initialTransactions)
        setCards(stateData.cards || initialCards)
        setSettings({ ...initialSettings, ...(stateData.settings || {}) })
        setStateLoaded(true)
      } catch {
        if (!cancelled) {
          setSyncStatus('Backend connection unavailable')
        }
      } finally {
        if (!cancelled) {
          setHydrated(true)
        }
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    setIsInstalled(standalone)

    const handleBeforeInstallPrompt = event => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      setInstallHelpOpen(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    if (!hydrated || !auth || !stateLoaded) return undefined

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        setSyncStatus('Saving...')
        const response = await fetch('/api/finance/state', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions, cards, settings }),
          signal: controller.signal,
        })
        setSyncStatus(response.ok ? 'Saved to family database' : 'Save failed')
      } catch {
        if (!controller.signal.aborted) {
          setSyncStatus('Save failed')
        }
      }
    }, 350)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [auth, cards, hydrated, settings, stateLoaded, transactions])

  const familyMembers = useMemo(() => {
    const names = members
      .map(member => member.displayName || member.email)
      .filter(Boolean)
    return ['Family', ...Array.from(new Set(names))]
  }, [members])

  const periodTransactions = useMemo(() => {
    if (period === 'All Time') return transactions

    const key = getPeriodKey(period)
    return transactions.filter(transaction => getMonthKey(transaction.date) === key)
  }, [period, transactions])

  const filteredTransactions = useMemo(() => {
    return periodTransactions.filter(transaction => {
      const categoryMatches =
        categoryFilter === 'all' || transaction.category === categoryFilter
      const memberMatches =
        memberFilter === 'all' || transaction.member === memberFilter

      return categoryMatches && memberMatches
    })
  }, [categoryFilter, memberFilter, periodTransactions])

  const totals = useMemo(() => {
    const income = sumBy(
      periodTransactions,
      item => item.type === 'income' && !item.cardId,
    )
    const cardPayments = sumBy(
      periodTransactions,
      item => item.type === 'income' && Boolean(item.cardId),
    )
    const expense = sumBy(periodTransactions, item => item.type === 'expense')
    const cardSpend = sumBy(periodTransactions, item => item.type === 'card')
    const cardOutstanding = cards.reduce(
      (total, card) => total + Number(card.balance || 0),
      0,
    )
    const balance = settings.openingBalance + income - expense - cardPayments
    const spendTotal = expense + cardSpend

    const lastMonthItems = filterByMonthKey(transactions, getLastMonthKey())
    const lastMonthIncome = sumBy(
      lastMonthItems,
      item => item.type === 'income' && !item.cardId,
    )
    const lastMonthCardPayments = sumBy(
      lastMonthItems,
      item => item.type === 'income' && Boolean(item.cardId),
    )
    const lastMonthExpense = sumBy(lastMonthItems, item => item.type === 'expense')
    const lastMonthCardSpend = sumBy(lastMonthItems, item => item.type === 'card')
    const lastMonthBalance =
      settings.openingBalance + lastMonthIncome - lastMonthExpense - lastMonthCardPayments

    return {
      income,
      expense,
      cardSpend,
      cardOutstanding,
      balance,
      spendTotal,
      cardPayments,
      incomeChange: formatChange(income, lastMonthIncome),
      expenseChange: formatChange(expense + cardSpend, lastMonthExpense + lastMonthCardSpend),
      cardSpendChange: formatChange(cardSpend, lastMonthCardSpend),
      balanceChange: formatChange(balance, lastMonthBalance),
    }
  }, [cards, periodTransactions, settings.openingBalance, transactions])

  const categoryTotals = useMemo(() => {
    return categoryConfig.map(category => {
      const total = periodTransactions.reduce((sum, item) => {
        const isSpend = item.type === 'expense' || item.type === 'card'
        if (!isSpend || item.category !== category.id) return sum
        return sum + item.amount
      }, 0)

      return {
        ...category,
        total,
        percentage: totals.spendTotal
          ? Math.round((total / totals.spendTotal) * 1000) / 10
          : 0,
      }
    })
  }, [periodTransactions, totals.spendTotal])

  const memberTotals = useMemo(() => {
    return familyMembers.map(member => {
      const total = periodTransactions.reduce((sum, item) => {
        if (
          item.type === 'income' ||
          (item.type !== 'expense' && item.type !== 'card') ||
          item.member !== member
        ) {
          return sum
        }
        return sum + item.amount
      }, 0)

      return { member, total }
    })
  }, [familyMembers, periodTransactions])

  const donutGradient = useMemo(() => {
    if (totals.spendTotal === 0) {
      return 'conic-gradient(#8b2cff 0deg 260deg, #f02ca6 260deg 360deg)'
    }

    let cursor = 0
    const segments = categoryTotals.map(category => {
      const start = cursor
      const width = totals.spendTotal
        ? (category.total / totals.spendTotal) * 360
        : 0
      cursor += width
      return `${category.color} ${start}deg ${cursor}deg`
    })

    return `conic-gradient(${segments.join(', ') || '#1f2a24 0deg 360deg'})`
  }, [categoryTotals, totals.spendTotal])

  const openTransactionModal = (type, preferredAccountId = 'cash') => {
    setForm(current => ({
      ...current,
      title: '',
      amount: '',
      category: type === 'income' ? current.category : 'home',
      incomeCategory: 'salary',
      member: 'Family',
      date: createDate(),
      cardId: preferredAccountId === 'cash' ? cards[0]?.id || '' : preferredAccountId,
      accountId: preferredAccountId,
    }))
    setTransactionModal(type)
  }

  const closeTransactionModal = () => setTransactionModal(null)

  const handleAddTransaction = event => {
    event.preventDefault()

    const amount = parseAmount(form.amount)
    if (!amount || amount <= 0) return
    const selectedCardId =
      form.accountId && form.accountId !== 'cash' ? form.accountId : ''
    const isCardExpense = transactionModal === 'expense' && selectedCardId
    const isCardIncome = transactionModal === 'income' && selectedCardId
    const transactionType =
      transactionModal === 'card' || isCardExpense ? 'card' : transactionModal

    const newTransaction = {
      id: `${transactionType}-${Date.now()}`,
      type: transactionType,
      title:
        form.title.trim() ||
        (transactionModal === 'income'
          ? isCardIncome
            ? 'Credit card payment'
            : 'Family income'
          : transactionModal === 'card'
            ? 'Credit card spend'
            : isCardExpense
              ? 'Credit card expense'
              : 'Family expense'),
      amount,
      category:
        transactionModal === 'income' ? form.incomeCategory : form.category,
      member: form.member,
      date: form.date,
      accountId: form.accountId,
      cardId: selectedCardId || (transactionModal === 'card' ? form.cardId : undefined),
    }

    setTransactions(current => [newTransaction, ...current])

    if ((transactionModal === 'card' || isCardExpense) && newTransaction.cardId) {
      setCards(current =>
        current.map(card =>
          card.id === newTransaction.cardId
            ? { ...card, balance: Number(card.balance || 0) + amount }
            : card,
        ),
      )
    }

    if (isCardIncome && newTransaction.cardId) {
      setCards(current =>
        current.map(card =>
          card.id === newTransaction.cardId
            ? {
                ...card,
                balance: Math.max(0, Number(card.balance || 0) - amount),
              }
            : card,
        ),
      )
    }

    closeTransactionModal()
  }

  const handleDeleteTransaction = transaction => {
    setTransactions(current => current.filter(item => item.id !== transaction.id))

    if (transaction.type === 'card' && transaction.cardId) {
      setCards(current =>
        current.map(card =>
          card.id === transaction.cardId
            ? {
                ...card,
                balance: Math.max(0, Number(card.balance || 0) - transaction.amount),
              }
            : card,
        ),
      )
    }

    if (transaction.type === 'income' && transaction.cardId) {
      setCards(current =>
        current.map(card =>
          card.id === transaction.cardId
            ? { ...card, balance: Number(card.balance || 0) + transaction.amount }
            : card,
        ),
      )
    }
  }

  const handleAddCard = event => {
    event.preventDefault()

    if (!cardForm.name.trim()) return

    setCards(current => [
      ...current,
      {
        id: `card-${Date.now()}`,
        name: cardForm.name.trim(),
        limit: parseAmount(cardForm.limit),
        balance: parseAmount(cardForm.balance),
        color: '#a855f7',
      },
    ])
    setCardForm({ name: '', limit: '', balance: '' })
  }

  const resetData = () => {
    setTransactions(initialTransactions)
    setCards(initialCards)
    setSettings(initialSettings)
    setCategoryFilter('all')
    setMemberFilter('all')
    setPeriod('This Month')
  }

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
      return
    }

    setInstallHelpOpen(current => !current)
  }

  const loadFinanceState = async authData => {
    const stateResponse = await fetch('/api/finance/state', { cache: 'no-store' })
    const stateData = stateResponse.ok ? await stateResponse.json() : {}

    setAuth(authData)
    setMembers(stateData.members || authData.members || [])
    setTransactions(stateData.transactions || initialTransactions)
    setCards(stateData.cards || initialCards)
    setSettings({ ...initialSettings, ...(stateData.settings || {}) })
    setStateLoaded(true)
    setSyncStatus('Loaded from family database')
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setAuth(null)
    setMembers([])
    setStateLoaded(false)
    setTransactions(initialTransactions)
    setCards(initialCards)
    setSettings(initialSettings)
    setActiveTab('home')
    setSyncStatus('')
  }

  const handleAddMember = async event => {
    event.preventDefault()
    setMemberInvite(null)

    const response = await fetch('/api/family/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memberForm),
    })
    const payload = await response.json()

    if (!response.ok) {
      setMemberInvite({ error: payload.error || 'Could not add family member.' })
      return
    }

    setMembers(payload.members || [])
    setMemberInvite({
      email: payload.member.email,
      password: payload.password,
    })
    setMemberForm({ email: '', password: createMemberPassword() })
  }

  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[#06040d] text-white">
        <div className="mx-auto grid min-h-screen w-full max-w-[430px] place-items-center bg-[radial-gradient(circle_at_18%_0%,rgba(176,40,255,.42),transparent_34%),linear-gradient(180deg,#170624_0%,#050409_100%)]">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-[linear-gradient(135deg,#8e22ff,#ec2b9d)]" />
            <p className="mt-4 text-sm font-black uppercase tracking-[0.22em] text-white/60">
              Loading ledger
            </p>
          </div>
        </div>
      </main>
    )
  }

  if (!auth) {
    return <AuthScreen onAuthenticated={loadFinanceState} syncStatus={syncStatus} />
  }

  return (
    <main className="min-h-screen bg-[#06040d] text-white">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-[radial-gradient(circle_at_18%_0%,rgba(176,40,255,.42),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(236,43,157,.24),transparent_28%),linear-gradient(180deg,#170624_0%,#080410_46%,#050409_100%)] shadow-2xl shadow-black/60">
        <div className="relative min-h-screen pb-36">
          <Header />

          <section className="px-5">
            {activeTab === 'home' && (
              <HomeView
                cards={cards}
                categoryTotals={categoryTotals}
                donutGradient={donutGradient}
                openCardModal={() => setCardModalOpen(true)}
                openTransactionModal={openTransactionModal}
                period={period}
                setPeriod={setPeriod}
                totals={totals}
              />
            )}

            {activeTab === 'transactions' && (
              <TransactionsView
                categoryFilter={categoryFilter}
                familyMembers={familyMembers}
                filteredTransactions={filteredTransactions}
                handleDeleteTransaction={handleDeleteTransaction}
                memberFilter={memberFilter}
                period={period}
                setCategoryFilter={setCategoryFilter}
                setMemberFilter={setMemberFilter}
                setPeriod={setPeriod}
                totals={totals}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                categoryTotals={categoryTotals}
                memberTotals={memberTotals}
                period={period}
                setPeriod={setPeriod}
                totals={totals}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                auth={auth}
                familyMembers={familyMembers}
                handleAddMember={handleAddMember}
                handleInstallApp={handleInstallApp}
                handleLogout={handleLogout}
                installHelpOpen={installHelpOpen}
                installPromptAvailable={Boolean(installPrompt)}
                isInstalled={isInstalled}
                memberForm={memberForm}
                memberInvite={memberInvite}
                resetData={resetData}
                setMemberForm={setMemberForm}
                setSettings={setSettings}
                settings={settings}
                syncStatus={syncStatus}
              />
            )}
          </section>

          <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>

      {transactionModal && (
        <TransactionModal
          cards={cards}
          closeTransactionModal={closeTransactionModal}
          familyMembers={familyMembers}
          form={form}
          handleAddTransaction={handleAddTransaction}
          setForm={setForm}
          type={transactionModal}
        />
      )}

      {cardModalOpen && (
        <CardModal
          cardForm={cardForm}
          cards={cards}
          close={() => setCardModalOpen(false)}
          handleAddCard={handleAddCard}
          onAddSpend={() => {
            setCardModalOpen(false)
            openTransactionModal('expense', cards[0]?.id || 'cash')
          }}
          onAddIncome={() => {
            setCardModalOpen(false)
            openTransactionModal('income', cards[0]?.id || 'cash')
          }}
          setCardForm={setCardForm}
        />
      )}
    </main>
  )
}

function Header() {
  return (
    <header className="px-5 pb-2 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8e22ff,#ec2b9d)] text-2xl text-white shadow-[0_8px_24px_rgba(142,34,255,.35)]">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />
            </svg>
          </span>
          <h1 className="text-[26px] font-black leading-none tracking-tight">
            Family Guy
          </h1>
        </div>
        <button
          aria-label="Notifications"
          className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[.055] text-[22px] text-white/90"
        >
          <FiBell />
        </button>
      </div>
    </header>
  )
}

function AuthScreen({ onAuthenticated, syncStatus }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    email: '',
    password: '',
    familyName: 'Family Guy',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isLogin = mode === 'login'

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(isLogin ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const payload = await response.json()

      if (!response.ok) {
        setError(payload.error || 'Could not continue.')
        return
      }

      await onAuthenticated(payload)
    } catch {
      setError('Backend connection unavailable.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#06040d] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] items-center px-5 py-8 bg-[radial-gradient(circle_at_18%_0%,rgba(176,40,255,.42),transparent_34%),radial-gradient(circle_at_86%_14%,rgba(236,43,157,.24),transparent_28%),linear-gradient(180deg,#170624_0%,#080410_46%,#050409_100%)]">
        <section className="w-full rounded-[30px] border border-white/[.14] bg-[linear-gradient(145deg,rgba(42,12,78,.78),rgba(12,7,23,.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_24px_80px_rgba(0,0,0,.35)] backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8e22ff,#ec2b9d)] text-2xl shadow-[0_14px_34px_rgba(151,48,255,.35)]">
              <FiHome />
            </span>
            <div>
              <h1 className="text-2xl font-black">Family Guy</h1>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#d9c8ff]/60">
                AED Ledger
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[.045] p-1">
            {[
              ['login', 'Login'],
              ['register', 'Create Family'],
            ].map(([id, label]) => (
              <button
                className={`rounded-xl px-3 py-2 text-sm font-black transition ${
                  mode === id
                    ? 'bg-[linear-gradient(135deg,#8b2cff,#f02ca6)] text-white'
                    : 'text-[#d9c8ff]/70'
                }`}
                key={id}
                onClick={() => {
                  setMode(id)
                  setError('')
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            {!isLogin && (
              <label className="block">
                <span className="text-sm font-bold text-[#c7d6ce]/70">
                  Family Name
                </span>
                <input
                  className={`${modalFieldClass} text-base font-bold`}
                  onChange={event =>
                    setForm(current => ({ ...current, familyName: event.target.value }))
                  }
                  type="text"
                  value={form.familyName}
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-bold text-[#c7d6ce]/70">Mail ID</span>
              <input
                className={`${modalFieldClass} text-base font-bold`}
                onChange={event =>
                  setForm(current => ({ ...current, email: event.target.value }))
                }
                placeholder="you@email.com"
                type="email"
                value={form.email}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#c7d6ce]/70">Password</span>
              <input
                className={`${modalFieldClass} text-base font-bold`}
                onChange={event =>
                  setForm(current => ({ ...current, password: event.target.value }))
                }
                placeholder={isLogin ? 'Your password' : 'Minimum 8 characters'}
                type="password"
                value={form.password}
              />
            </label>

            {error && (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm font-bold text-rose-100">
                {error}
              </div>
            )}
            {syncStatus && !error && (
              <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-sm font-bold text-amber-100">
                {syncStatus}
              </div>
            )}

            <button
              className="w-full rounded-2xl bg-[linear-gradient(135deg,#8b2cff,#f02ca6)] py-3.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(151,48,255,.28)] disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Family Account'}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

function HomeView({
  cards,
  categoryTotals,
  donutGradient,
  openCardModal,
  openTransactionModal,
  period,
  setPeriod,
  totals,
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      animate="show"
      className="space-y-5"
      initial={reduceMotion ? false : 'hidden'}
      variants={dashboardContainerVariants}
    >
      <motion.div
        className="flex items-end justify-between gap-4"
        variants={dashboardItemVariants}
      >
        <div>
          <h2 className="text-[30px] font-extrabold leading-tight">
            {getGreeting()}
          </h2>
          <p className="mt-1.5 text-[15px] text-[#d9c8ff]/72">
            Here&apos;s your family financial overview.
          </p>
        </div>
        <PeriodSelect period={period} setPeriod={setPeriod} />
      </motion.div>

      <motion.div className="grid grid-cols-3 gap-3" variants={dashboardItemVariants}>
        <MetricCard
          accent="emerald"
          change={totals.incomeChange}
          icon={<FiArrowDownLeft />}
          label="Income"
          sublabel="This Month"
          value={formatMoney(totals.income)}
        />
        <MetricCard
          accent="rose"
          change={totals.expenseChange}
          icon={<FiArrowUpRight />}
          label="Expense"
          sublabel="This Month"
          value={formatMoney(totals.spendTotal)}
        />
        <MetricCard
          accent="violet"
          icon={<FiCreditCard />}
          label="Credit Card"
          meta={`${formatMoney(totals.cardSpend)} This Month Spend`}
          sublabel="Outstanding"
          value={formatMoney(totals.cardOutstanding ? -totals.cardOutstanding : 0)}
        />
      </motion.div>

      <BalanceCard totals={totals} />

      <motion.section variants={dashboardItemVariants}>
        <h3 className="mb-3 text-xl font-extrabold">Quick Add</h3>
        <div className="grid grid-cols-[1fr_112px_1fr] items-center gap-3">
          <QuickButton
            icon={<FiArrowDownLeft />}
            label="Income"
            tone="income"
            onClick={() => openTransactionModal('income')}
          />
          <motion.button
            onClick={() => openTransactionModal('expense')}
            aria-label="Add transaction"
            className="grid aspect-square place-items-center rounded-full bg-[radial-gradient(circle_at_32%_24%,#f58bff,#a735ff_50%,#ef2da4)] text-6xl text-white shadow-[0_18px_42px_rgba(195,47,255,.45)] transition active:scale-95"
            whileTap={{ scale: 0.94 }}
          >
            <FiPlus />
          </motion.button>
          <QuickButton
            icon={<FiArrowUpRight />}
            label="Expense"
            tone="expense"
            onClick={() => openTransactionModal('expense')}
          />
        </div>
      </motion.section>

      <motion.button
        aria-label="Manage credit cards"
        onClick={openCardModal}
        className="group flex w-full items-center gap-4 rounded-[22px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.035))] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_18px_46px_rgba(0,0,0,.22)] backdrop-blur-xl transition"
        variants={dashboardItemVariants}
        whileTap={{ scale: 0.985 }}
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8e22ff,#ec2b9d)] text-3xl text-white">
          <FiCreditCard />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-extrabold">Credit Card</span>
          <span className="block text-sm text-[#d9c8ff]/65">Manage your cards</span>
        </span>
        <FiChevronDown className="-rotate-90 text-2xl text-white/70 transition group-active:translate-x-1" />
      </motion.button>

      <SpendingSummary
        categoryTotals={categoryTotals}
        donutGradient={donutGradient}
        period={period}
        setPeriod={setPeriod}
        totals={totals}
      />
    </motion.div>
  )
}

function MetricCard({ accent, change, icon, label, meta, sublabel, value }) {
  const tone = {
    emerald: 'from-[#17e7a4] to-[#097c83] text-emerald-100',
    rose: 'from-[#fb2f7f] to-[#9e1c6d] text-pink-100',
    violet: 'from-[#a72dff] to-[#6323ff] text-violet-100',
  }[accent]

  const changeToneClass = {
    up: accent === 'emerald' ? 'text-[#17e7a4]' : 'text-[#fb2f7f]',
    down: accent === 'emerald' ? 'text-[#fb2f7f]' : 'text-[#17e7a4]',
    neutral: 'text-[#d9c8ff]/58',
  }[change?.tone || 'neutral']

  return (
    <motion.article
      className="min-h-[168px] rounded-[22px] border border-white/12 bg-[linear-gradient(155deg,rgba(47,12,77,.72),rgba(16,7,27,.84))] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_14px_34px_rgba(0,0,0,.18)] backdrop-blur-xl transition will-change-transform"
      variants={dashboardItemVariants}
      whileTap={{ scale: 0.985 }}
    >
      <div className="flex items-start justify-between">
        <span
          className={`grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-2xl`}
        >
          {icon}
        </span>
        <FiMoreHorizontal className="text-xl text-white/58" />
      </div>
      <p className="mt-5 text-[15px] font-bold text-white/86">{label}</p>
      <p className="mt-2 text-[19px] font-black leading-tight tracking-normal">
        {value}
      </p>
      <p className="mt-3 text-[13px] font-semibold text-[#d9c8ff]/64">{sublabel}</p>
      <div
        className={`mt-4 border-t border-white/[.055] pt-3 text-[12px] font-bold ${meta ? 'text-[#d9c8ff]/76' : changeToneClass}`}
      >
        {meta || (
          <span className="inline-flex items-center gap-1">
            {change?.label || '0% vs Last Month'}
          </span>
        )}
      </div>
    </motion.article>
  )
}

function BalanceCard({ totals }) {
  const reduceMotion = useReducedMotion()
  const change = totals.balanceChange
  const changeClass =
    change?.tone === 'up'
      ? 'text-[#17e7a4]'
      : change?.tone === 'down'
        ? 'text-[#fb2f7f]'
        : 'text-[#d9c8ff]/58'

  return (
    <motion.article
      className="relative min-h-[220px] overflow-hidden rounded-[26px] border border-white/[.14] bg-[linear-gradient(145deg,rgba(55,8,91,.9),rgba(18,7,34,.96)_46%,rgba(8,5,18,.98))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,.12),0_20px_60px_rgba(128,40,255,.2)] backdrop-blur-xl"
      variants={dashboardItemVariants}
      whileTap={{ scale: 0.992 }}
    >
      <div className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#ef2da4]/[.24] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-[#8b2cff]/[.18] blur-3xl" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[160px]">
          <p className="font-extrabold text-white/86">Total Balance</p>
          <p className="mt-2 text-[clamp(30px,9vw,42px)] font-black leading-tight tracking-normal">
            {formatMoney(totals.balance)}
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[.055] px-3 py-2 text-right backdrop-blur-xl">
          <p className={`text-[15px] font-black ${changeClass}`}>
            {change?.label || '0% vs Last Month'}
          </p>
        </div>
      </div>
      <svg
        aria-hidden="true"
        className="relative z-10 mt-4 h-[104px] w-full overflow-visible"
        viewBox="0 0 360 96"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="balanceLine" x1="0" x2="1" y1="0" y2="0">
            <stop stopColor="#8e2cff" />
            <stop offset=".5" stopColor="#f12fff" />
            <stop offset="1" stopColor="#b737ff" />
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <motion.path
          d="M0 65 C38 42 68 40 103 61 S169 36 210 57 S278 36 313 48 S340 56 360 25"
          fill="none"
          filter="url(#lineGlow)"
          initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={reduceMotion ? undefined : { pathLength: 1, opacity: 1 }}
          stroke="url(#balanceLine)"
          strokeLinecap="round"
          strokeWidth="4"
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />
        <motion.circle
          animate={reduceMotion ? undefined : { scale: [1, 1.28, 1] }}
          cx="360"
          cy="25"
          fill="#f6a1ff"
          r="5"
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </motion.article>
  )
}

function QuickButton({ icon, label, onClick, tone }) {
  const isIncome = tone === 'income'

  return (
    <motion.button
      onClick={onClick}
      className={`grid h-[86px] place-items-center rounded-[21px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.06)] backdrop-blur-xl transition ${
        isIncome
          ? 'border-emerald-300/18 bg-emerald-950/20'
          : 'border-pink-300/16 bg-pink-950/22'
      }`}
      whileTap={{ scale: 0.96 }}
    >
      <span
        className={`grid h-12 w-12 place-items-center rounded-full text-2xl ${
          isIncome
            ? 'bg-[linear-gradient(135deg,#11dca3,#066b68)]'
            : 'bg-[linear-gradient(135deg,#ff3e8d,#9e1c71)]'
        }`}
      >
        {icon}
      </span>
      <span className="text-sm font-extrabold text-white/88">{label}</span>
    </motion.button>
  )
}

function SpendingSummary({
  categoryTotals,
  donutGradient,
  period,
  setPeriod,
  totals,
}) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section variants={dashboardItemVariants}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xl font-extrabold">Spending Summary</h3>
        <PeriodSelect period={period} setPeriod={setPeriod} compact />
      </div>
      <div className="relative overflow-hidden rounded-[26px] border border-white/[.14] bg-[linear-gradient(145deg,rgba(42,12,78,.72),rgba(12,7,23,.9))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.1),0_18px_48px_rgba(0,0,0,.24)] backdrop-blur-xl">
        <div className="pointer-events-none absolute -left-12 -top-16 h-32 w-32 rounded-full bg-[#8b2cff]/[.20] blur-3xl" />
        <div className="pointer-events-none absolute -right-14 bottom-4 h-32 w-32 rounded-full bg-[#ef2da4]/[.16] blur-3xl" />
        <div className="relative grid grid-cols-[112px_1fr] items-center gap-3 min-[390px]:grid-cols-[132px_1fr] min-[390px]:gap-4">
          <motion.div
            animate={reduceMotion ? undefined : { rotate: 0, scale: 1 }}
            className="relative grid aspect-square place-items-center rounded-full shadow-[0_16px_42px_rgba(139,44,255,.22)]"
            initial={reduceMotion ? false : { rotate: -24, scale: 0.92 }}
            style={{ background: donutGradient }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="grid h-[68%] w-[68%] place-items-center rounded-full border border-white/[.08] bg-[#0b0712] text-center shadow-[inset_0_1px_0_rgba(255,255,255,.08)]">
              <div>
                <p className="text-[clamp(20px,6vw,26px)] font-black leading-none">
                  {formatMoney(totals.spendTotal)}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#d9c8ff]/62">
                  Total Spend
                </p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-2.5">
            {categoryTotals.map((category, index) => {
              const barWidth = totals.spendTotal
                ? Math.max(category.percentage, 5)
                : 4

              return (
              <motion.div
                className="rounded-2xl border border-white/[.06] bg-white/[.035] p-2.5"
                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                key={category.id}
                animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                transition={{
                  delay: reduceMotion ? 0 : 0.08 + index * 0.045,
                  duration: 0.32,
                }}
              >
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-bold text-[#efe8ff]">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full shadow-[0_0_18px_currentColor]"
                      style={{ background: category.color, color: category.color }}
                    />
                    <span className="truncate">{category.label}</span>
                  </span>
                  <span className="text-right text-[13px] font-black">
                    {formatMoney(category.total)}
                  </span>
                  <span className="w-10 text-right text-[13px] font-bold text-[#d9c8ff]/66">
                    {category.percentage}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
                  <motion.span
                    animate={reduceMotion ? undefined : { width: `${barWidth}%` }}
                    className="block h-full rounded-full"
                    initial={reduceMotion ? false : { width: 0 }}
                    style={{ background: `linear-gradient(90deg,${category.color},#f6a1ff)` }}
                    transition={{ delay: 0.14 + index * 0.04, duration: 0.48 }}
                  />
                </div>
              </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

function TransactionsView({
  categoryFilter,
  familyMembers,
  filteredTransactions,
  handleDeleteTransaction,
  memberFilter,
  period,
  setCategoryFilter,
  setMemberFilter,
  setPeriod,
  totals,
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Ledger"
        title="Transactions"
        value={formatMoney(totals.balance)}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <PeriodSelect period={period} setPeriod={setPeriod} compact />
        <FilterSelect
          label="Category"
          options={[
            { value: 'all', label: 'All Categories' },
            ...categoryConfig.map(category => ({
              value: category.id,
              label: category.label,
            })),
          ]}
          value={categoryFilter}
          onChange={setCategoryFilter}
        />
        <FilterSelect
          label="Member"
          options={[
            { value: 'all', label: 'All Members' },
            ...familyMembers.map(member => ({ value: member, label: member })),
          ]}
          value={memberFilter}
          onChange={setMemberFilter}
        />
      </div>

      <div className="space-y-3">
        {filteredTransactions.length === 0 && (
          <EmptyState title="No matching entries" />
        )}

        {filteredTransactions.map(transaction => (
          <TransactionRow
            handleDeleteTransaction={handleDeleteTransaction}
            key={transaction.id}
            transaction={transaction}
          />
        ))}
      </div>
    </div>
  )
}

function TransactionRow({ handleDeleteTransaction, transaction }) {
  const isIncome = transaction.type === 'income'
  const isCard = transaction.type === 'card'
  const category = getCategory(transaction.category)
  const Icon = isIncome ? TbPigMoney : isCard ? FiCreditCard : category.icon

  return (
    <article className="flex items-center gap-3 rounded-[20px] border border-[#f8f3e8]/10 bg-[#f8f3e8]/[.045] p-3.5">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl"
        style={{
          background: isIncome
            ? 'linear-gradient(135deg,#2dd4bf,#0f766e)'
            : `linear-gradient(135deg,${category.color},#12231d)`,
        }}
      >
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold">{transaction.title}</p>
        <p className="mt-1 text-xs font-semibold text-[#c7d6ce]/52">
          {transaction.member} / {transaction.date}
        </p>
      </div>
      <div className="text-right">
        <p
          className={`font-black ${
            isIncome ? 'text-[#2dd4bf]' : isCard ? 'text-[#facc15]' : 'text-[#f8f3e8]'
          }`}
        >
          {isIncome ? '+' : '-'}
          {formatMoney(transaction.amount)}
        </p>
        <button
          onClick={() => handleDeleteTransaction(transaction)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#c7d6ce]/44"
        >
          <FiTrash2 />
          Delete
        </button>
      </div>
    </article>
  )
}

function ReportsView({ categoryTotals, memberTotals, period, setPeriod, totals }) {
  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Reports"
        title="Family cash flow"
        value={formatMoney(totals.balance)}
      />

      <PeriodSelect period={period} setPeriod={setPeriod} />

      <div className="grid grid-cols-2 gap-3">
        <MiniStat label="Income" value={formatMoney(totals.income)} />
        <MiniStat label="Total Spend" value={formatMoney(totals.spendTotal)} />
        <MiniStat label="Card Spend" value={formatMoney(totals.cardSpend)} />
        <MiniStat label="Card Payments" value={formatMoney(totals.cardPayments)} />
        <MiniStat label="Outstanding" value={formatMoney(totals.cardOutstanding)} />
      </div>

      <ReportPanel title="Category Split">
        {categoryTotals.map(category => (
          <ReportBar
            key={category.id}
            color={category.color}
            label={category.label}
            max={totals.spendTotal}
            value={category.total}
          />
        ))}
      </ReportPanel>

      <ReportPanel title="Family Members">
        {memberTotals.map(item => (
          <ReportBar
            key={item.member}
            color="#21d1b5"
            label={item.member}
            max={Math.max(...memberTotals.map(member => member.total), 1)}
            value={item.total}
          />
        ))}
      </ReportPanel>
    </div>
  )
}

function SettingsView({
  auth,
  familyMembers,
  handleAddMember,
  handleInstallApp,
  handleLogout,
  installHelpOpen,
  installPromptAvailable,
  isInstalled,
  memberForm,
  memberInvite,
  resetData,
  setMemberForm,
  setSettings,
  settings,
  syncStatus,
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        eyebrow="Controls"
        title="Settings"
        value="AED"
      />

      <section className="rounded-[22px] border border-white/12 bg-[linear-gradient(145deg,rgba(48,9,82,.72),rgba(17,8,29,.88))] p-4">
        <p className="text-sm font-black uppercase text-[#d9c8ff]/60">
          Family Account
        </p>
        <h3 className="mt-1 text-lg font-black">{auth.family?.name || 'Family Guy'}</h3>
        <p className="mt-1 text-xs font-semibold text-[#d9c8ff]/62">
          Signed in as {auth.user?.email}
        </p>
        {syncStatus && (
          <p className="mt-3 rounded-full border border-white/10 bg-white/[.055] px-3 py-2 text-xs font-bold text-[#d9c8ff]/72">
            {syncStatus}
          </p>
        )}
        <button
          className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[.055] px-4 py-3 text-sm font-black text-white/86"
          onClick={handleLogout}
          type="button"
        >
          Logout
        </button>
      </section>

      {auth.user?.role === 'owner' && (
        <section className="rounded-[22px] border border-white/12 bg-[#f8f3e8]/[.045] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black">Add Family Member</h3>
              <p className="mt-1 text-xs font-semibold text-[#d9c8ff]/62">
                Create a login that opens this same family database.
              </p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[.055] px-3 py-1 text-xs font-black">
              {Math.max(familyMembers.length - 1, 0)}
            </span>
          </div>

          <form className="mt-4 space-y-3" onSubmit={handleAddMember}>
            <label className="block">
              <span className="text-sm font-bold text-[#c7d6ce]/70">Mail ID</span>
              <input
                className={`${modalFieldClass} text-sm font-bold`}
                onChange={event =>
                  setMemberForm(current => ({ ...current, email: event.target.value }))
                }
                placeholder="member@email.com"
                type="email"
                value={memberForm.email}
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-[#c7d6ce]/70">Password</span>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  className={`${modalFieldClass} text-sm font-bold`}
                  onChange={event =>
                    setMemberForm(current => ({ ...current, password: event.target.value }))
                  }
                  type="text"
                  value={memberForm.password}
                />
                <button
                  className="mt-2 rounded-2xl border border-white/10 bg-white/[.055] px-3 text-xs font-black"
                  onClick={() =>
                    setMemberForm(current => ({
                      ...current,
                      password: createMemberPassword(),
                    }))
                  }
                  type="button"
                >
                  New
                </button>
              </div>
            </label>
            <button
              className="w-full rounded-2xl bg-[linear-gradient(135deg,#8b2cff,#f02ca6)] py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(151,48,255,.28)]"
              type="submit"
            >
              Add Family Member
            </button>
          </form>

          {memberInvite?.email && (
            <div className="mt-3 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs font-bold text-emerald-100">
              Login created for {memberInvite.email}. Password: {memberInvite.password}
            </div>
          )}
          {memberInvite?.error && (
            <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3 text-xs font-bold text-rose-100">
              {memberInvite.error}
            </div>
          )}
        </section>
      )}

      <div className="rounded-[22px] border border-[#f8f3e8]/12 bg-[#f8f3e8]/[.045] p-4">
        <label className="block">
          <span className="text-sm font-bold text-[#c7d6ce]/70">Opening Balance</span>
          <input
            className={`${modalFieldClass} text-lg font-black`}
            inputMode="decimal"
            min="0"
            onChange={event =>
              setSettings(current => ({
                ...current,
                openingBalance: parseAmount(event.target.value),
              }))
            }
            pattern="[0-9]*[.,]?[0-9]*"
            type="text"
            value={settings.openingBalance}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold text-[#c7d6ce]/70">Monthly Saving Target</span>
          <input
            className={`${modalFieldClass} text-lg font-black`}
            inputMode="decimal"
            min="0"
            onChange={event =>
              setSettings(current => ({
                ...current,
                monthlyTarget: parseAmount(event.target.value),
              }))
            }
            pattern="[0-9]*[.,]?[0-9]*"
            type="text"
            value={settings.monthlyTarget}
          />
        </label>
      </div>

      <section className="rounded-[22px] border border-white/12 bg-[linear-gradient(145deg,rgba(48,9,82,.72),rgba(17,8,29,.88))] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#8e22ff,#ec2b9d)] text-xl shadow-[0_12px_28px_rgba(142,34,255,.3)]">
            <FiDownload />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-black">Install Family Guy</h3>
            <p className="mt-1 text-xs font-semibold text-[#d9c8ff]/62">
              Add the tracker to iOS or Android home screen.
            </p>
          </div>
        </div>

        <button
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#8b2cff,#f02ca6)] px-4 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(151,48,255,.28)] disabled:opacity-60"
          disabled={isInstalled}
          onClick={handleInstallApp}
          type="button"
        >
          <FiDownload />
          {isInstalled
            ? 'App Installed'
            : installPromptAvailable
              ? 'Install App'
              : 'Install on iOS / Android'}
        </button>

        {installHelpOpen && !installPromptAvailable && !isInstalled && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[.045] p-3 text-xs font-semibold leading-relaxed text-[#d9c8ff]/76">
            Android Chrome: open browser menu and choose Install app. iPhone:
            tap Share, then Add to Home Screen.
          </div>
        )}
      </section>

      <button
        onClick={resetData}
        className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-rose-300/18 bg-rose-500/10 px-4 py-4 text-sm font-black text-rose-100"
      >
        <FiRefreshCcw />
        Clear All Data
      </button>
    </div>
  )
}

function TransactionModal({
  cards,
  closeTransactionModal,
  familyMembers,
  form,
  handleAddTransaction,
  setForm,
  type,
}) {
  const isIncome = type === 'income'
  const isCard = type === 'card'
  const showAccountSelector = cards.length > 0
  const amountInputRef = useRef(null)

  useEffect(() => {
    const focusTimer = window.setTimeout(() => {
      amountInputRef.current?.focus()
      amountInputRef.current?.select()
    }, 80)

    return () => window.clearTimeout(focusTimer)
  }, [type])

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/70 px-3 pb-3 backdrop-blur-sm">
      <form
        onSubmit={handleAddTransaction}
        className="mx-auto w-full max-w-[430px] rounded-[28px] border border-white/12 bg-[linear-gradient(155deg,#2a0847_0%,#170624_52%,#08030f_100%)] p-5 shadow-[0_24px_80px_rgba(139,44,255,.24)]"
      >
        <ModalHeader
          close={closeTransactionModal}
          title={`Add ${isIncome ? 'Income' : isCard ? 'Credit Card Spend' : 'Expense'}`}
        />

        <label className="mt-4 block">
          <span className="text-sm font-bold text-[#c7d6ce]/70">Amount</span>
          <input
            autoFocus
            className={`${modalFieldClass} text-2xl font-black`}
            inputMode="decimal"
            min="0"
            onChange={event =>
              setForm(current => ({ ...current, amount: event.target.value }))
            }
            pattern="[0-9]*[.,]?[0-9]*"
            placeholder="AED 0"
            ref={amountInputRef}
            type="text"
            value={form.amount}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-sm font-bold text-[#c7d6ce]/70">Title</span>
          <input
            className={`${modalFieldClass} text-base font-bold`}
            onChange={event =>
              setForm(current => ({ ...current, title: event.target.value }))
            }
            placeholder={isIncome ? 'Salary, business, rent' : 'Groceries, rent, fuel'}
            type="text"
            value={form.title}
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-bold text-[#c7d6ce]/70">Category</span>
            <select
              className={modalSelectClass}
              onChange={event =>
                setForm(current =>
                  isIncome
                    ? { ...current, incomeCategory: event.target.value }
                    : { ...current, category: event.target.value },
                )
              }
              value={isIncome ? form.incomeCategory : form.category}
            >
              {(isIncome ? incomeCategories : categoryConfig).map(category => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-[#c7d6ce]/70">Family</span>
            <select
              className={modalSelectClass}
              onChange={event =>
                setForm(current => ({ ...current, member: event.target.value }))
              }
              value={form.member}
            >
              {familyMembers.map(member => (
                <option key={member} value={member}>
                  {member}
                </option>
              ))}
            </select>
          </label>
        </div>

        {showAccountSelector && (
          <label className="mt-4 block">
            <span className="text-sm font-bold text-[#c7d6ce]/70">
              {isCard ? 'Card' : 'Account'}
            </span>
            <select
              className={modalSelectClass}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  accountId: event.target.value,
                  cardId: event.target.value === 'cash' ? current.cardId : event.target.value,
                }))
              }
              value={isCard ? form.cardId || cards[0]?.id || '' : form.accountId}
            >
              {!isCard && <option value="cash">Cash / Bank</option>}
              {cards.map(card => (
                <option key={card.id} value={card.id}>
                  {card.name}
                </option>
              ))}
            </select>
            {!isCard && form.accountId !== 'cash' && (
              <span className="mt-2 block text-xs font-semibold text-[#d9c8ff]/60">
                {isIncome
                  ? 'This will reduce the selected card outstanding.'
                  : 'This will record spend on the selected card.'}
              </span>
            )}
          </label>
        )}

        <label className="mt-4 block">
          <span className="text-sm font-bold text-[#c7d6ce]/70">Date</span>
          <input
            className={`${modalFieldClass} text-base font-bold`}
            onChange={event =>
              setForm(current => ({ ...current, date: event.target.value }))
            }
            type="date"
            value={form.date}
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            className="rounded-2xl border border-[#f8f3e8]/10 bg-[#f8f3e8]/[.05] py-3 font-black"
            onClick={closeTransactionModal}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-2xl bg-[linear-gradient(135deg,#8b2cff,#f02ca6)] py-3 font-black text-white shadow-[0_14px_30px_rgba(151,48,255,.28)]"
            type="submit"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function CardModal({
  cardForm,
  cards,
  close,
  handleAddCard,
  onAddIncome,
  onAddSpend,
  setCardForm,
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-black/70 px-3 pb-3 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-[430px] rounded-[28px] border border-white/12 bg-[linear-gradient(155deg,#2a0847_0%,#170624_52%,#08030f_100%)] p-5 shadow-[0_24px_80px_rgba(139,44,255,.24)]">
        <ModalHeader close={close} title="Credit Cards" />

        <div className="mt-4 space-y-3">
          {cards.length === 0 && (
            <div className="rounded-[20px] border border-dashed border-[#f8f3e8]/14 bg-[#f8f3e8]/[.035] p-4">
              <p className="font-black">No credit cards yet</p>
              <p className="mt-1 text-sm font-semibold text-[#c7d6ce]/60">
                Add a card to track AED outstanding and card spend.
              </p>
            </div>
          )}

          {cards.map(card => {
            const usage = card.limit
              ? Math.min(100, Math.round((card.balance / card.limit) * 100))
              : 0

            return (
              <article
                className="rounded-[20px] border border-[#f8f3e8]/10 bg-[#f8f3e8]/[.045] p-4"
                key={card.id}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-black">{card.name}</p>
                    <p className="mt-1 text-xs font-bold text-[#c7d6ce]/52">
                      {usage}% limit used
                    </p>
                  </div>
                  <p className="font-black">{formatMoney(card.balance)}</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f8f3e8]/10">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${usage}%`,
                      background: `linear-gradient(90deg,${card.color},#facc15)`,
                    }}
                  />
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            aria-label="Add credit card income"
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-3 text-sm font-black text-emerald-100 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={cards.length === 0}
            onClick={onAddIncome}
            type="button"
          >
            <FiArrowDownLeft />
            Card Income
          </button>
          <button
            aria-label="Add credit card expense"
            className="flex items-center justify-center gap-2 rounded-2xl border border-pink-300/20 bg-pink-400/10 px-3 py-3 text-sm font-black text-pink-100 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={cards.length === 0}
            onClick={onAddSpend}
            type="button"
          >
            <FiArrowUpRight />
            Card Expense
          </button>
        </div>

        <form onSubmit={handleAddCard} className="mt-5 rounded-[20px] bg-black/20 p-3">
          <p className="mb-3 text-sm font-black text-[#f8f3e8]/74">Add New Card</p>
          <input
            className={`${modalFieldClass} text-sm font-bold`}
            onChange={event =>
              setCardForm(current => ({ ...current, name: event.target.value }))
            }
            placeholder="Card name"
            type="text"
            value={cardForm.name}
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              className={`${modalFieldClass} text-sm font-bold`}
              inputMode="decimal"
              onChange={event =>
                setCardForm(current => ({ ...current, limit: event.target.value }))
              }
              placeholder="AED limit"
              pattern="[0-9]*[.,]?[0-9]*"
              type="text"
              value={cardForm.limit}
            />
            <input
              className={`${modalFieldClass} text-sm font-bold`}
              inputMode="decimal"
              onChange={event =>
                setCardForm(current => ({
                  ...current,
                  balance: event.target.value,
                }))
              }
              placeholder="AED balance"
              pattern="[0-9]*[.,]?[0-9]*"
              type="text"
              value={cardForm.balance}
            />
          </div>
          <button
            className="mt-3 w-full rounded-2xl bg-[#f8f3e8] py-3 text-sm font-black text-[#07100d]"
            type="submit"
          >
            Add Card
          </button>
        </form>
      </div>
    </div>
  )
}

function ModalHeader({ close, title }) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-xl font-black">{title}</h3>
      <button
        aria-label="Close"
        className="grid h-10 w-10 place-items-center rounded-full bg-[#f8f3e8]/[.07] text-xl"
        onClick={close}
        type="button"
      >
        <FiX />
      </button>
    </div>
  )
}

function BottomNav({ activeTab, setActiveTab }) {
  const reduceMotion = useReducedMotion()
  const items = [
    { id: 'home', label: 'Home', icon: FiHome },
    { id: 'transactions', label: 'Transactions', icon: FiList },
    { id: 'reports', label: 'Reports', icon: FiPieChart },
    { id: 'settings', label: 'Settings', icon: FiSettings },
  ]

  return (
    <motion.nav
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[430px] px-5 pb-[max(10px,env(safe-area-inset-bottom))]"
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative overflow-hidden rounded-[26px] border border-white/[.16] bg-[linear-gradient(135deg,rgba(255,255,255,.15),rgba(86,28,131,.16)_42%,rgba(8,5,18,.42))] p-2 shadow-[0_-14px_44px_rgba(0,0,0,.42),inset_0_1px_0_rgba(255,255,255,.16)] backdrop-blur-2xl saturate-[1.4]">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-white/45" />
        <div className="pointer-events-none absolute -left-16 -top-20 h-32 w-32 rounded-full bg-[#8b2cff]/28 blur-3xl" />
        <div className="pointer-events-none absolute -right-14 -bottom-20 h-32 w-32 rounded-full bg-[#f02ca6]/18 blur-3xl" />
        <div className="relative grid grid-cols-4 gap-1">
          {items.map(item => {
            const Icon = item.icon
            const active = activeTab === item.id

            return (
              <motion.button
                className={`grid min-h-[58px] place-items-center gap-0.5 rounded-[20px] px-1 py-1.5 text-[11px] font-bold transition ${
                  active
                    ? 'bg-[linear-gradient(135deg,rgba(139,44,255,.95),rgba(240,44,166,.9))] text-white shadow-[0_12px_28px_rgba(151,48,255,.38),inset_0_1px_0_rgba(255,255,255,.26)]'
                    : 'text-white/[.64] hover:bg-white/[.055]'
                }`}
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                whileTap={{ scale: 0.94 }}
              >
                <Icon className="text-[23px]" />
                <span>{item.label}</span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.nav>
  )
}

function PeriodSelect({ compact = false, period, setPeriod }) {
  return (
    <label
      className={`relative inline-flex shrink-0 items-center rounded-full border border-white/10 bg-white/[.045] font-bold text-white/88 ${
        compact ? 'h-10 text-[13px]' : 'h-11 text-[14px]'
      }`}
    >
      <select
        aria-label="Period"
        className="h-full appearance-none rounded-full bg-transparent py-0 pl-4 pr-8 outline-none"
        onChange={event => setPeriod(event.target.value)}
        value={period}
      >
        {periods.map(item => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <FiChevronDown className="pointer-events-none absolute right-3 text-sm text-white/55" />
    </label>
  )
}

function FilterSelect({ label, onChange, options, value }) {
  return (
    <label className="relative inline-flex h-11 shrink-0 items-center rounded-full border border-[#f8f3e8]/10 bg-[#f8f3e8]/[.045] text-sm font-bold">
      <select
        aria-label={label}
        className="h-full appearance-none rounded-full bg-transparent py-0 pl-4 pr-9 outline-none"
        onChange={event => onChange(event.target.value)}
        value={value}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FiChevronDown className="pointer-events-none absolute right-3 text-[#c7d6ce]/66" />
    </label>
  )
}

function SectionTitle({ eyebrow, title, value }) {
  return (
    <div className="rounded-[24px] border border-[#f8f3e8]/10 bg-[#f8f3e8]/[.045] p-5">
      <p className="text-sm font-black uppercase text-[#2dd4bf]">{eyebrow}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <h2 className="text-[28px] font-black leading-none">{title}</h2>
        <p className="text-right text-xl font-black">{value}</p>
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <article className="rounded-[20px] border border-[#f8f3e8]/10 bg-[#f8f3e8]/[.045] p-4">
      <p className="text-xs font-bold text-[#c7d6ce]/52">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </article>
  )
}

function ReportPanel({ children, title }) {
  return (
    <section className="rounded-[22px] border border-[#f8f3e8]/12 bg-[#f8f3e8]/[.045] p-4">
      <h3 className="mb-4 text-lg font-black">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function ReportBar({ color, label, max, value }) {
  const width = max ? Math.max(4, Math.round((value / max) * 100)) : 4

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-bold text-[#c7d6ce]/76">{label}</span>
        <span className="font-black">{formatMoney(value)}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#f8f3e8]/10">
        <span
          className="block h-full rounded-full"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg,${color},#facc15)`,
          }}
        />
      </div>
    </div>
  )
}

function EmptyState({ title }) {
  return (
    <div className="grid min-h-[180px] place-items-center rounded-[22px] border border-dashed border-[#f8f3e8]/12 bg-[#f8f3e8]/[.035] text-center">
      <div>
        <FiEdit3 className="mx-auto text-3xl text-[#c7d6ce]/36" />
        <p className="mt-3 text-sm font-black text-[#c7d6ce]/64">{title}</p>
      </div>
    </div>
  )
}
