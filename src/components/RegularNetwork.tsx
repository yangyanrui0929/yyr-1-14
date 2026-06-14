import { useState } from 'react'
import { Users, Heart, Skull, UserPlus, History, X, ChevronRight } from 'lucide-react'
import { useGameStore } from '@/store/useGameStore'
import { getRelationshipLevel, getRelationshipColor } from '@/data/customers'
import type { RegularCustomer, RegularEvent } from '@/types'

function RegularCard({ regular, onClick }: { regular: RegularCustomer; onClick: () => void }) {
  const level = getRelationshipLevel(regular.affinity, regular.grudge)
  const color = getRelationshipColor(level)
  const netAffinity = regular.affinity - regular.grudge
  const isPresent = useGameStore.getState().customers.some(
    (c) => c.isRegular && c.regularId === regular.id
  )

  return (
    <div
      onClick={onClick}
      className={`card-ancient cursor-pointer hover:-translate-y-1 transition-all border-2 ${
        isPresent ? 'border-gold ring-2 ring-gold/30' : 'border-sandal/30 hover:border-gold'
      }`}
    >
      <div className="flex items-start gap-3 mb-2">
        <div className="text-4xl">{regular.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="font-brush text-lg text-ink flex items-center gap-1">
            {regular.name}
            {isPresent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold border border-gold/40">
                在场
              </span>
            )}
          </div>
          <div className="text-xs text-ink-light">{regular.title}</div>
          <div className={`text-sm font-semibold ${color} mt-0.5`}>{level}</div>
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <Heart className="w-3 h-3 text-tea flex-shrink-0" />
          <div className="flex-1 h-1.5 bg-paper-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-tea rounded-full transition-all"
              style={{ width: `${regular.affinity}%` }}
            />
          </div>
          <span className="text-tea font-semibold w-8 text-right">{regular.affinity}</span>
        </div>
        <div className="flex items-center gap-2">
          <Skull className="w-3 h-3 text-cinnabar flex-shrink-0" />
          <div className="flex-1 h-1.5 bg-paper-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-cinnabar rounded-full transition-all"
              style={{ width: `${regular.grudge}%` }}
            />
          </div>
          <span className="text-cinnabar font-semibold w-8 text-right">{regular.grudge}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-sandal/20 text-[10px] text-ink-light">
        <span className="flex items-center gap-1">
          <UserPlus className="w-3 h-3" /> 带客{' '}
          <span className="font-semibold text-ink">{regular.bringAbility}</span>
        </span>
        <span>来访 {regular.visitCount} 次</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  )
}

function RegularDetail({
  regular,
  events,
  onClose,
}: {
  regular: RegularCustomer
  events: RegularEvent[]
  onClose: () => void
}) {
  const level = getRelationshipLevel(regular.affinity, regular.grudge)
  const color = getRelationshipColor(level)
  const regularEvents = events.filter((e) => e.regularId === regular.id).slice(-10).reverse()

  return (
    <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4 animate-unroll">
      <div className="scroll-panel max-w-md w-full animate-unroll max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className="text-5xl">{regular.emoji}</div>
            <div>
              <div className="font-brush text-2xl text-ink">{regular.name}</div>
              <div className="text-sm text-ink-light">{regular.title} · {regular.type}</div>
              <div className={`text-base font-semibold ${color} mt-1`}>{level}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-paper-dark text-ink-light"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-ink leading-relaxed mb-4 p-3 bg-paper-dark/40 rounded-lg border border-sandal/20">
          {regular.background}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="card-ancient p-3 text-center">
            <Heart className="w-5 h-5 text-tea mx-auto mb-1" />
            <div className="font-brush text-2xl text-tea">{regular.affinity}</div>
            <div className="text-xs text-ink-light">好感度</div>
          </div>
          <div className="card-ancient p-3 text-center">
            <Skull className="w-5 h-5 text-cinnabar mx-auto mb-1" />
            <div className="font-brush text-2xl text-cinnabar">{regular.grudge}</div>
            <div className="text-xs text-ink-light">旧怨值</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          <div className="p-2 bg-paper-dark/30 rounded-lg">
            <div className="text-lg font-semibold text-ink">{regular.bringAbility}</div>
            <div className="text-[10px] text-ink-light">带客能力</div>
          </div>
          <div className="p-2 bg-paper-dark/30 rounded-lg">
            <div className="text-lg font-semibold text-ink">{regular.visitCount}</div>
            <div className="text-[10px] text-ink-light">累计来访</div>
          </div>
          <div className="p-2 bg-paper-dark/30 rounded-lg">
            <div className="text-lg font-semibold text-ink">
              {regular.lastVisitDay > 0 ? `第${regular.lastVisitDay}天` : '-'}
            </div>
            <div className="text-[10px] text-ink-light">最近来访</div>
          </div>
        </div>

        <div className="divider-ancient text-sm font-brush mb-3">喜好标签</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {regular.preferenceTags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 rounded bg-tea-light/30 text-tea border border-tea/30"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="divider-ancient text-sm font-brush mb-3 flex items-center gap-1">
          <History className="w-4 h-4" /> 最近关系变化
        </div>
        {regularEvents.length === 0 ? (
          <div className="text-center text-sm text-ink-light py-4">暂无记录</div>
        ) : (
          <div className="space-y-1.5">
            {regularEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-2 px-3 bg-paper-dark/30 rounded-lg text-xs"
              >
                <span className="text-ink-light">第{e.day}天 · {e.reason}</span>
                <span
                  className={`font-semibold ${
                    e.type === 'affinity_up' || e.type === 'grudge_down'
                      ? 'text-tea'
                      : 'text-cinnabar'
                  }`}
                >
                  {e.type === 'affinity_up' || e.type === 'grudge_down' ? '+' : '-'}
                  {e.amount}
                  {e.type.includes('affinity') ? '好感' : '旧怨'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function RegularNetwork() {
  const { regularCustomers, regularEvents, day } = useGameStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = selectedId
    ? regularCustomers.find((r) => r.id === selectedId) || null
    : null

  const sorted = [...regularCustomers].sort((a, b) => {
    const aNet = a.affinity - a.grudge
    const bNet = b.affinity - b.grudge
    return bNet - aNet
  })

  const presentCount = regularCustomers.filter((r) =>
    useGameStore.getState().customers.some(
      (c) => c.isRegular && c.regularId === r.id && c.seatId !== null
    )
  ).length

  return (
    <div className="scroll-panel">
      <h2 className="text-2xl font-brush text-sandal mb-2 flex items-center gap-2">
        <Users className="w-6 h-6" /> 熟客关系网
      </h2>
      <p className="text-sm text-ink-light mb-4">
        维护好与常客的关系，好感高的熟客会主动撑场带朋友来，关系差的会带头挑刺砸场子。
      </p>

      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-ink-light">
          共 <span className="font-semibold text-ink">{regularCustomers.length}</span> 位熟客
        </span>
        <span className="text-ink-light">
          今日在场 <span className="font-semibold text-gold">{presentCount}</span> 位
        </span>
        <span className="text-ink-light">
          当前第 <span className="font-semibold text-ink">{day}</span> 天
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((r) => (
          <RegularCard key={r.id} regular={r} onClick={() => setSelectedId(r.id)} />
        ))}
      </div>

      {selected && (
        <RegularDetail
          regular={selected}
          events={regularEvents}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
