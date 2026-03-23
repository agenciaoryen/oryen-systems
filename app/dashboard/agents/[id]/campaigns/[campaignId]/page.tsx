// app/dashboard/agents/[id]/campaigns/[campaignId]/page.tsx
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/AuthContext'
import { useCampaign, useAgent } from '@/lib/agents'
import type { Language } from '@/lib/agents/types'
import { Loader2, Target } from 'lucide-react'
import BDRCampaignDetail from '@/app/dashboard/components/agents/bdr/BDRCampaignDetail'
import HunterCampaignDetail from './HunterCampaignDetail'

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()

  const agentId = params.id as string
  const campaignId = params.campaignId as string

  const { agent, loading: agentLoading } = useAgent(agentId)
  const { campaign, runs, loading: campaignLoading, refresh } = useCampaign(campaignId)

  const lang = ((user as any)?.language as Language) || 'es'
  const loading = agentLoading || campaignLoading

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!campaign || !agent) {
    return (
      <div className="min-h-[calc(100vh-100px)] flex items-center justify-center">
        <div className="text-center">
          <Target size={48} className="mx-auto text-gray-600 mb-4" />
          <p className="text-gray-400">Campanha não encontrada</p>
          <button
            onClick={() => router.push(`/dashboard/agents/${agentId}`)}
            className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  const slug = agent.solution_slug

  // ─── Roteia para o componente correto ───
  if (slug === 'bdr_prospector') {
    return (
      <BDRCampaignDetail
        campaign={campaign}
        runs={runs}
        agentId={agentId}
        lang={lang}
        user={user}
        refresh={refresh}
      />
    )
  }

  // Default: Hunter e outros agentes usam o componente original
  return (
    <HunterCampaignDetail
      campaign={campaign}
      runs={runs}
      agentId={agentId}
      lang={lang}
      user={user}
      refresh={refresh}
    />
  )
}