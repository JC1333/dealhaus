'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import DashboardWorkspace from '../components/workspaces/DashboardWorkspace'
import DealsWorkspace from '../components/workspaces/DealsWorkspace'
import ConversationsWorkspace from '../components/workspaces/ConversationsWorkspace'
import IngestionWorkspace from '../components/workspaces/IngestionWorkspace'
import RevenueWorkspace from '../components/workspaces/RevenueWorkspace'
import ExecutiveCommandCenter from '../components/dashboard/ExecutiveCommandCenter'
import AuthPanel from '../components/auth/AuthPanel'
import SellerOnboarding from '../components/seller/SellerOnboarding'
import WorkflowEngine from "../components/workflows/WorkflowEngine";
import AppSidebar from '../components/AppSidebar'
import WorkspaceRouter from "../components/WorkspaceRouter";
import PublicLaunchHome from '../components/PublicLaunchHome'
import BuyerInquiriesWorkspace from "@/app/components/workspaces/BuyerInquiriesWorkspace";

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authFullName, setAuthFullName] = useState('')
  const [inventory, setInventory] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [activeWorkspace, setActiveWorkspace] = useState('global')

  const [sellerName, setSellerName] = useState('')
  const [sellerEmail, setSellerEmail] = useState('')
  const [itemTitle, setItemTitle] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [sellerCity, setSellerCity] = useState('')
  const [sellerState, setSellerState] = useState('')
  const [sellerZip, setSellerZip] = useState('')
  const [sellerSubmissions, setSellerSubmissions] = useState<any[]>([])
  const [sellerLeadCount, setSellerLeadCount] = useState(0)
  const [queueCount, setQueueCount] = useState(0)
  const [activeDealCount, setActiveDealCount] = useState(0)
  const [conversationCount, setConversationCount] = useState(0)
  const [closedDealCount, setClosedDealCount] = useState(0)
  const [projectedCommission, setProjectedCommission] = useState(0)
  const [activeDealValue, setActiveDealValue] = useState(0)
  const [closedCommission, setClosedCommission] = useState(0)
  const [totalPipelineCommission, setTotalPipelineCommission] = useState(0)
  const [sellerOnboardingForm, setSellerOnboardingForm] = useState({
  seller_name: '',
  seller_email: '',
  seller_phone: '',
  item_title: '',
  item_description: '',
  asking_price: '',
  city: '',
  state: '',
  zip: '',
  agreement_accepted: false,
})
  const demoImages = [
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1484101403633-562f891dc89a?q=80&w=1200&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1200&auto=format&fit=crop',
  ]

  const scannerDeals = [
    {
      title: 'RH Cloud Couch',
      marketplace: 'Facebook Marketplace',
      asking_price: 1800,
      estimated_value: 4200,
      ai_score: 96,
      spread: 2400,
      status: 'High Opportunity',
    },
    {
      title: 'Luxury Teak Patio Set',
      marketplace: 'OfferUp',
      asking_price: 900,
      estimated_value: 2600,
      ai_score: 91,
      spread: 1700,
      status: 'AI Flagged',
    },
    {
      title: 'Restoration Hardware Dining Table',
      marketplace: 'Craigslist',
      asking_price: 1200,
      estimated_value: 3900,
      ai_score: 94,
      spread: 2700,
      status: 'Premium Arbitrage',
    },
  ]
  useEffect(() => {
  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      setIsAdmin(profile?.is_admin === true)
    } else {
      setIsAdmin(false)
    }

    setAuthLoading(false)
  }

  loadUser()

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    const currentUser = session?.user ?? null

    setUser(currentUser)

    if (currentUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUser.id)
        .single()

      setIsAdmin(profile?.is_admin === true)
    } else {
      setIsAdmin(false)
    }
  })

  return () => {
    subscription.unsubscribe()
  }
}, [])

  const handleAuthSubmit = async () => {
    if (!authEmail || !authPassword) {
      alert('Please enter email and password')
      return
    }

    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      })

      if (error) {
        alert(error.message)
        return
      }

      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: authFullName,
          role: 'buyer',
        })
      }

      alert('Account created. Check your email if confirmation is required.')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })

    if (error) {
      alert(error.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

const loadSellerSubmissions = async () => {
  const { data, error } = await supabase
    .from('seller_onboarding')
    .select('*')
    .order('created_at', { ascending: false })

  if (!error && data) {
    setSellerSubmissions(data)
  }
}
const loadDashboardMetrics = async () => {
  const { data: sellerLeads } = await supabase
    .from('seller_leads')
    .select('id')

  const { data: queueItems } = await supabase
    .from('seller_onboarding')
    .select('id')

  const { data: activeDeals } = await supabase
  .from('inventory')
  .select('id, status, price')

  const { data: conversations } = await supabase
    .from('buyer_conversations')
    .select('id')

  const closedDeals =
  activeDeals?.filter((deal) => deal.status === 'closed') || []

const closedCommissionTotal = closedDeals.reduce((total, deal: any) => {
  const price = Number(deal.price || 0)
  return total + price * 0.1
}, 0)

  const activeOnlyDeals =
  activeDeals?.filter((deal) => deal.status === 'active') || []

const projectedCommissionTotal = activeOnlyDeals.reduce((total, deal: any) => {
  const price = Number(deal.price || deal.ai_listing_price || 0)
  return total + price * 0.1
}, 0)
const activeDealValueTotal = activeOnlyDeals.reduce((total, deal: any) => {
  const price = Number(deal.price || 0)
  return total + price
}, 0)
  setSellerLeadCount(sellerLeads?.length || 0)
  setQueueCount(queueItems?.length || 0)
  setActiveDealCount(activeOnlyDeals.length)
  setProjectedCommission(projectedCommissionTotal)
  setActiveDealValue(activeDealValueTotal)
  setTotalPipelineCommission(
  projectedCommissionTotal + closedCommissionTotal
)
  setConversationCount(conversations?.length || 0)
  setClosedDealCount(closedDeals.length)
  setClosedCommission(closedCommissionTotal)
}
useEffect(() => {
  loadInventory()
  loadActivity()
  loadSellerSubmissions()
  loadDashboardMetrics()
}, [])
  async function loadInventory() {
    const { data } = await supabase
      .from('inventory')
      .select('*')
      .order('id', { ascending: false })

    setInventory(data || [])
  }

  async function loadActivity() {
    const { data } = await supabase
      .from('ai_activity')
      .select('*')
      .order('id', { ascending: false })

    setActivity(data || [])
  }

  async function generateListing() {
    if (!itemTitle) return

    setLoading(true)

    try {
      const response = await fetch('/api/generate-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: itemTitle,
        }),
      })

      const ai = await response.json()
      console.log('AI RESPONSE:', ai)

      const randomImage =
        demoImages[
          Math.floor(Math.random() * demoImages.length)
        ]

     const { error: inventoryError } = await supabase
  .from('inventory')
  .insert([
    {
      title: ai.title,
      description: ai.description,
      category: ai.category,
      condition: ai.condition,
      ai_score: ai.ai_score,
      featured: ai.featured,
      price: Number(askingPrice || ai.price || 0),
      profit_score: Math.floor(
        70 + Math.random() * 30
      ),

      demand_level: [
        'High Demand',
        'Trending',
        'Premium Buyer Interest',
      ][Math.floor(Math.random() * 3)],
      close_probability: `${Math.floor(
        75 + Math.random() * 20
      )}%`,
      seller_name: sellerName,
seller_email: sellerEmail,
seller_city: sellerCity,
seller_state: sellerState,
seller_zip: sellerZip,
asking_price: askingPrice,
      image: randomImage,
      status: 'active',
    },
  ])

if (inventoryError) {
  console.log('INVENTORY ERROR:', inventoryError)
}

      const { error: activityError } = await supabase
  .from('ai_activity')
  .insert([
    {
      activity: `Seller Acquisition Agent onboarded ${itemTitle}`,
    },
    {
      activity: `Pricing Intelligence Agent evaluated ${itemTitle}`,
    },
    {
      activity: `Buyer Match Agent searching buyers for ${itemTitle}`,
    },
  ])

if (activityError) {
  console.log('ACTIVITY ERROR:', activityError)
}

      await loadInventory()
      await loadActivity()

      setSellerName('')
      setSellerEmail('')
      setItemTitle('')
      setAskingPrice('')
    } catch (error) {
  console.log('FULL ERROR:', error)
}

    setLoading(false)
  }

  const totalPipelineValue = inventory.reduce(
    (acc, item) => acc + Number(item.price || 0),
    0
  )

  const projectedCommissionEstimate = Math.floor(totalPipelineValue * 0.15);

  const pipeline = [
    {
      stage: 'New Leads',
      deals: inventory.slice(0, 3),
    },
    {
      stage: 'Negotiating',
      deals: inventory.slice(3, 6),
    },
    {
      stage: 'Pending Pickup',
      deals: inventory.slice(6, 9),
    },
    {
      stage: 'Closed Deals',
      deals: [],
    },
  ]
const generateAiRelistListing = async (submission: any) => {
  const relistPrice = Math.round(Number(submission.asking_price || 0) * 1.25)

  const aiTitle = `Premium ${submission.item_title} - DealHaus Verified`

  const aiDescription = `${submission.item_description}

This item has been reviewed by DealHaus AI as a strong local marketplace opportunity. Buyer interest may be available based on category, price, condition, and resale demand.

DealHaus helps coordinate serious buyer interest and seller communication for a smoother local transaction.`

  const { error: updateError } = await supabase
    .from('seller_onboarding')
    .update({
      ai_listing_title: aiTitle,
      ai_listing_description: aiDescription,
      ai_listing_price: relistPrice,
      relist_status: 'generated',
      buyer_match_status: 'ready',
    })
    .eq('id', submission.id)

  if (updateError) {
    alert(updateError.message)
    return
  }

  const { error: inventoryError } = await supabase
    .from('inventory')
    .insert({
      title: aiTitle,
      description: aiDescription,
      price: relistPrice,
      status: 'active',
      image: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop',
      seller_name: submission.seller_name,
      seller_email: submission.seller_email,
      seller_city: submission.city,
      seller_state: submission.state,
      seller_zip: submission.zip,
      asking_price: Number(submission.asking_price || 0),
      estimated_market_value: relistPrice,
      arbitrage_spread: relistPrice - Number(submission.asking_price || 0),
      projected_commission: Math.round(relistPrice * 0.15),
      commission_rate: 15,
      ai_priority: 'high',
      ai_confidence: 88,
      buyer_demand: 'medium',
      active_buyers: 6,
      estimated_days_to_sell: 7,
      seller_status: 'approved',
      outreach_sent: true,
      ai_followup_due: 'scheduled',
      close_probability: 72,
    })

  if (inventoryError) {
    alert(inventoryError.message)
    return
  }

  alert('AI relist listing generated and added to Active Deals')

  loadSellerSubmissions()
  loadInventory()
}
  const submitSellerOnboarding = async () => {
  if (!user) {
    alert('Please log in first')
    return
  }

  if (!sellerOnboardingForm.agreement_accepted) {
    alert('Please accept the commission agreement')
    return
  }

  const { error } = await supabase
    .from('seller_onboarding')
    .insert({
      user_id: user.id,
      seller_name: sellerOnboardingForm.seller_name,
      seller_email: sellerOnboardingForm.seller_email,
      seller_phone: sellerOnboardingForm.seller_phone,
      item_title: sellerOnboardingForm.item_title,
      item_description: sellerOnboardingForm.item_description,
      asking_price: Number(sellerOnboardingForm.asking_price || 0),
      city: sellerOnboardingForm.city,
      state: sellerOnboardingForm.state,
      zip: sellerOnboardingForm.zip,
      agreement_accepted: sellerOnboardingForm.agreement_accepted,
      commission_rate: 15,
      status: 'submitted',
    })

  if (error) {
  alert(`Seller onboarding error: ${error.message}`)
  console.error(error)
  return
}

  alert('Seller item submitted to DealHaus AI')

  setSellerOnboardingForm({
    seller_name: '',
    seller_email: '',
    seller_phone: '',
    item_title: '',
    item_description: '',
    asking_price: '',
    city: '',
    state: '',
    zip: '',
    agreement_accepted: false,
  })
}
if (authLoading) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      Loading...
    </div>
  )
}

if (!user) {
  return (
    <AuthPanel
      email={authEmail}
      setEmail={setAuthEmail}
      password={authPassword}
      setPassword={setAuthPassword}
      fullName={authFullName}
      setFullName={setAuthFullName}
      authMode={authMode}
      setAuthMode={setAuthMode}
      onSubmit={handleAuthSubmit}
    />
  )
}
if (user && isAdmin === false) {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md rounded-3xl border border-red-900 bg-red-950/20 p-8 text-center">
        <p className="text-red-400 text-sm font-bold uppercase">
          Access Denied
        </p>

        <h1 className="mt-3 text-3xl font-black">
          Admin access required
        </h1>

        <p className="mt-4 text-zinc-400">
          This area is restricted to approved DealHaus administrators.
        </p>
        <button
  type="button"
  onClick={() => alert("Logout clicked")}
  className="mt-6 rounded-xl bg-red-500 px-5 py-3 font-bold text-white hover:bg-red-400"
>
  Sign Out
</button>
      </div>
    </main>
  )
}

  return (
    <main className="min-h-screen bg-black text-white">
      <WorkflowEngine />
      <div className="flex justify-end p-4">
  <button
    type="button"
    onClick={async () => {
      await supabase.auth.signOut()
      window.location.href = "/admin"
    }}
    className="rounded-xl border border-red-500 px-4 py-2 font-bold text-red-400 hover:bg-red-500 hover:text-white"
  >
    Logout
  </button>
</div>
      <div className="flex flex-col lg:flex-row">

       <AppSidebar
  activeWorkspace={activeWorkspace}
  setActiveWorkspace={setActiveWorkspace}
/>

        <div className="flex-1 p-4 sm:p-6 lg:p-10">
          {activeWorkspace === 'dashboard' ? (
           <DashboardWorkspace
  sellerLeadCount={sellerLeadCount}
  queueCount={queueCount}
  activeDealCount={activeDealCount}
  conversationCount={conversationCount}
  closedDealCount={closedDealCount}
  projectedCommission={projectedCommission}
  activeDealValue={activeDealValue}
  closedCommission={closedCommission}
  totalPipelineCommission={totalPipelineCommission}
/>
          ) : activeWorkspace === 'deals' ? (
            <DealsWorkspace />
          ) : activeWorkspace === 'conversations' ? (
            <ConversationsWorkspace />
          ) : activeWorkspace === 'revenue' ? (
            <RevenueWorkspace />
          ) : activeWorkspace === 'ingestion' ? (
            <IngestionWorkspace
  sellerSubmissions={sellerSubmissions}
  onGenerateListing={generateAiRelistListing}
  onRefreshSubmissions={loadSellerSubmissions}
/>
) : activeWorkspace === "buyerInquiries" ? (
  <BuyerInquiriesWorkspace />
          ) : (
            <div className="space-y-6">
              <PublicLaunchHome
  activeDealCount={activeDealCount}
  projectedCommission={projectedCommission}
  setActiveWorkspace={setActiveWorkspace}
/>
    
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-4">
                <h3 className="text-2xl font-semibold mb-6">
                  Latest Active Listings
                </h3>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {inventory.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="bg-black border border-zinc-800 rounded-2xl overflow-hidden"
                    >
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=1200&auto=format&fit=crop'}
                        alt={item.title}
                        className="h-80 w-full object-cover"
                      />

                      <div className="p-4">
                        <h4 className="font-semibold text-base">
                          {item.title}
                        </h4>

                        <p className="text-green-400 font-bold mt-2">
                          ${Number(item.price || item.asking_price || 0).toLocaleString()}
                        </p>

                        <p className="text-zinc-400 text-sm mt-2">
                          {item.seller_city || 'Location pending'} {item.seller_state || ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}