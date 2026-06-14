import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GameState,
  Weather,
  Snack,
  Seat,
  Customer,
  Story,
  StoryBranch,
  InterruptionEvent,
  InterruptionOption,
  LedgerRecord,
  StoryRecord,
  ReputationHistory,
  Renovation,
  RegularCustomer,
  RegularEvent,
  SeatTier,
} from '@/types'
import { STORIES } from '@/data/stories'
import { initSnacks } from '@/data/snacks'
import { initSeats } from '@/data/seats'
import { initRenovations, getUpgradeCost } from '@/data/renovations'
import { INTERRUPTIONS } from '@/data/interruptions'
import { generateRandomCustomers, REGULAR_CUSTOMERS, regularToCustomer } from '@/data/customers'
import { calcSettlement } from '@/utils/settlement'

const WEATHERS: Weather[] = ['晴', '晴', '晴', '云', '云', '雨', '雪']

function randomWeather(): Weather {
  return WEATHERS[Math.floor(Math.random() * WEATHERS.length)]
}

function pickRandomStories(count: number): Story[] {
  const pool = [...STORIES]
  const result: Story[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(idx, 1)[0])
  }
  return result
}

function uid(): string {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const initialState: GameState = {
  day: 1,
  phase: 'day',
  gold: 200,
  reputation: 30,
  weather: '晴',
  snacks: initSnacks(),
  seats: initSeats(),
  renovations: initRenovations(),
  customers: [],
  currentStory: null,
  currentBranch: null,
  storyProgress: 0,
  availableStories: [],
  interruptions: INTERRUPTIONS,
  currentInterruption: null,
  performanceActive: false,
  ledger: [],
  storyHistory: [],
  reputationHistory: [],
  lastStoryDay: {},
  storyScores: {},
  isSettlement: false,
  lastSettlement: null,
  regularCustomers: REGULAR_CUSTOMERS.map((r) => ({ ...r })),
  regularEvents: [],
  currentSupportMessage: null,
  currentProvokeMessage: null,
}

interface GameActions {
  buySnack: (snackId: string, qty: number) => void
  moveSeat: (seatId: number, x: number, y: number) => void
  upgradeRenovation: (renoId: string) => void
  switchToNight: () => void
  selectStory: (storyId: string, branchId: string) => void
  startPerformance: () => void
  tickPerformance: () => void
  handleInterruption: (option: InterruptionOption) => void
  doSettlement: () => void
  nextDay: () => void
  resetGame: () => void
  addLedgerRecord: (type: LedgerRecord['type'], category: string, amount: number, note: string) => void
  modifyRegularAffinity: (regularId: string, delta: number, reason: string) => void
  modifyRegularGrudge: (regularId: string, delta: number, reason: string) => void
  clearSupportMessage: () => void
  clearProvokeMessage: () => void
}

export const useGameStore = create<GameState & GameActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      buySnack: (snackId: string, qty: number) => {
        const state = get()
        const snack = state.snacks.find((s) => s.id === snackId)
        if (!snack) return
        const totalCost = snack.cost * qty
        if (state.gold < totalCost) return
        const newStock = Math.min(snack.maxStock, snack.stock + qty)
        const actualQty = newStock - snack.stock
        if (actualQty <= 0) return
        const actualCost = snack.cost * actualQty

        set((s) => ({
          gold: s.gold - actualCost,
          snacks: s.snacks.map((x) =>
            x.id === snackId ? { ...x, stock: newStock } : x
          ),
        }))
        get().addLedgerRecord('支出', '茶点采购', actualCost, `采购${snack.name} x${actualQty}`)
      },

      moveSeat: (seatId: number, x: number, y: number) => {
        set((s) => ({
          seats: s.seats.map((seat) =>
            seat.id === seatId ? { ...seat, x, y } : seat
          ),
        }))
      },

      upgradeRenovation: (renoId: string) => {
        const state = get()
        const reno = state.renovations.find((r) => r.id === renoId)
        if (!reno || reno.level >= reno.maxLevel) return
        const cost = getUpgradeCost(reno)
        if (state.gold < cost) return

        const repGain = reno.bonusReputation

        set((s) => ({
          gold: s.gold - cost,
          reputation: Math.min(100, s.reputation + repGain),
          renovations: s.renovations.map((r) =>
            r.id === renoId ? { ...r, level: r.level + 1 } : r
          ),
          reputationHistory: [
            ...s.reputationHistory,
            {
              day: s.day,
              value: Math.min(100, s.reputation + repGain),
              delta: repGain,
              reason: `装修升级：${reno.name}`,
            },
          ],
        }))
        get().addLedgerRecord('支出', '装修升级', cost, `升级${reno.name}至${reno.level + 1}级`)
      },

      switchToNight: () => {
        const state = get()
        const weather = state.weather
        let customerCount = 6
        if (weather === '雨') customerCount = Math.max(2, customerCount - 3)
        if (weather === '雪') customerCount = Math.max(2, customerCount - 4)
        if (weather === '云') customerCount = Math.max(3, customerCount - 1)
        if (state.reputation > 50) customerCount += 2
        if (state.reputation > 80) customerCount += 2

        const allCustomers: Customer[] = []
        const updatedRegulars = [...state.regularCustomers]

        for (let i = 0; i < updatedRegulars.length; i++) {
          const r = updatedRegulars[i]
          const netAffinity = r.affinity - r.grudge
          let visitChance = 0.3
          if (netAffinity >= 30) visitChance = 0.6
          if (netAffinity >= 60) visitChance = 0.85
          if (netAffinity < 0) visitChance = 0.15
          if (netAffinity <= -30) visitChance = 0.05

          if (Math.random() < visitChance) {
            allCustomers.push(regularToCustomer(r))
            updatedRegulars[i] = {
              ...r,
              visitCount: r.visitCount + 1,
              lastVisitDay: state.day,
            }

            if (netAffinity >= 30) {
              const bringCount = Math.min(r.bringAbility, Math.floor(netAffinity / 25))
              for (let j = 0; j < bringCount; j++) {
                const tpl = state.regularCustomers.find((x) => x.id === r.id)
                const sameType = generateRandomCustomers(1).map((c) => ({
                  ...c,
                  type: r.type,
                  preferenceTags: [...r.preferenceTags.slice(0, 3)],
                  name: `${r.name}的朋友${['甲', '乙', '丙'][j]}`,
                }))
                allCustomers.push(...sameType)
              }
            }
          }
        }

        const remainingCount = Math.max(0, customerCount - allCustomers.length)
        if (remainingCount > 0) {
          allCustomers.push(...generateRandomCustomers(remainingCount))
        }

        allCustomers.sort((a, b) => {
          const aScore = (a.isRegular ? 10 : 0) + a.socialInfluence
          const bScore = (b.isRegular ? 10 : 0) + b.socialInfluence
          return bScore - aScore
        })

        const customers = allCustomers
        const seats = [...state.seats].map((s) => ({ ...s, occupied: false }))
        const sortedSeats = [...seats].sort((a, b) => {
          const order: Record<SeatTier, number> = { 贵宾: 0, 雅座: 1, 普通: 2 }
          return order[a.tier] - order[b.tier]
        })
        for (let i = 0; i < Math.min(customers.length, sortedSeats.length); i++) {
          const seat = sortedSeats[i]
          customers[i].seatId = seat.id
          const idx = seats.findIndex((s) => s.id === seat.id)
          if (idx >= 0) seats[idx].occupied = true
        }

        const availableStories = pickRandomStories(3)

        set({
          phase: 'night',
          customers,
          seats,
          availableStories,
          currentStory: null,
          currentBranch: null,
          storyProgress: 0,
          performanceActive: false,
          currentInterruption: null,
          regularCustomers: updatedRegulars,
          currentSupportMessage: null,
          currentProvokeMessage: null,
        })
      },

      selectStory: (storyId: string, branchId: string) => {
        const state = get()
        const story = state.availableStories.find((s) => s.id === storyId)
        const branch = story?.branches.find((b) => b.id === branchId)
        if (!story || !branch) return

        const newRegulars = state.regularCustomers.map((r) => {
          const presentCustomer = state.customers.find(
            (c) => c.isRegular && c.regularId === r.id
          )
          if (!presentCustomer) return r

          const tagMatch = branch.tags.some((t) => r.preferenceTags.includes(t))
          let affinityDelta = 0
          let grudgeDelta = 0

          if (tagMatch) {
            affinityDelta = 3 + Math.floor(Math.random() * 3)
          } else {
            const netAffinity = r.affinity - r.grudge
            if (netAffinity < -10) {
              grudgeDelta = 2 + Math.floor(Math.random() * 2)
            } else {
              affinityDelta = -1
            }
          }

          const newAffinity = Math.max(0, Math.min(100, r.affinity + affinityDelta))
          const newGrudge = Math.max(0, Math.min(100, r.grudge + grudgeDelta))

          if (affinityDelta !== 0 || grudgeDelta !== 0) {
            const event: RegularEvent = {
              id: uid(),
              regularId: r.id,
              day: state.day,
              type: affinityDelta > 0 ? 'affinity_up' : affinityDelta < 0 ? 'affinity_down' : grudgeDelta > 0 ? 'grudge_up' : 'grudge_down',
              amount: Math.abs(affinityDelta || grudgeDelta),
              reason: tagMatch ? `故事「${branch.title}」合其口味` : `故事「${branch.title}」不合心意`,
            }
            set((s) => ({ regularEvents: [...s.regularEvents, event] }))
          }

          return { ...r, affinity: newAffinity, grudge: newGrudge }
        })

        set({
          currentStory: story,
          currentBranch: branch,
          storyProgress: 0,
          regularCustomers: newRegulars,
        })
      },

      startPerformance: () => {
        const state = get()
        if (!state.currentStory || !state.currentBranch) return
        set({ performanceActive: true, storyProgress: 0 })
      },

      tickPerformance: () => {
        const state = get()
        if (!state.performanceActive) return

        const newProgress = Math.min(100, state.storyProgress + 4)
        let supportMsg: string | null = null
        let provokeMsg: string | null = null
        let goldBonus = 0
        let repBonus = 0
        let extraInterruption: InterruptionEvent | null = null

        const regularsPresent = state.regularCustomers.filter((r) =>
          state.customers.some((c) => c.isRegular && c.regularId === r.id && c.seatId !== null)
        )

        for (const r of regularsPresent) {
          const netAffinity = r.affinity - r.grudge

          if (netAffinity >= 40 && !state.currentSupportMessage && Math.random() < 0.04) {
            const supportMessages: Record<string, string[]> = {
              书生: [`${r.name}抚掌赞叹：「妙哉！此段说得极好！」`, `${r.name}摇头晃脑：「听君一席话，胜读十年书！」`],
              商贾: [`${r.name}哈哈一笑：「说得好！掌柜的，打赏！」`, `${r.name}连连点头：「精彩精彩，实在精彩！」`],
              江湖人: [`${r.name}拍案而起：「好！好一个快意恩仇！」`, `${r.name}大声叫好：「痛快！说得痛快！」`],
              妇人: [`${r.name}掩嘴轻笑：「说得真是动人~」`, `${r.name}连连拭泪：「太感人了...」`],
              官员: [`${r.name}捻须微笑：「嗯，颇有见地。」`, `${r.name}微微颔首：「说得不错。」`],
              平民: [`${r.name}咧嘴直笑：「好听！太好听了！」`, `${r.name}大声叫好：「好！好！」`],
            }
            const msgs = supportMessages[r.type] || supportMessages.平民
            supportMsg = msgs[Math.floor(Math.random() * msgs.length)]
            goldBonus += 5 + Math.floor(Math.random() * 10)
            repBonus += 1
            break
          }

          if (netAffinity <= -20 && !state.currentProvokeMessage && !state.currentInterruption && Math.random() < 0.05) {
            const provokeMessages: Record<string, InterruptionEvent> = {
              书生: {
                id: `provoke-${r.id}`,
                customerType: r.type,
                content: `${r.name}冷笑一声：「哼，这般漏洞百出的故事，也敢拿出来说？」`,
                options: [
                  { text: '虚心请教：「还望先生赐教」', satisfactionEffect: 5, reputationEffect: 1, goldEffect: 0 },
                  { text: '「不爱听请便」', satisfactionEffect: -15, reputationEffect: -3, goldEffect: 0 },
                  { text: '奉茶赔罪：「是小的才疏学浅」', satisfactionEffect: 10, reputationEffect: 0, goldEffect: -5 },
                ],
              },
              商贾: {
                id: `provoke-${r.id}`,
                customerType: r.type,
                content: `${r.name}敲着桌子：「这茶钱花得不值！说的什么玩意儿！」`,
                options: [
                  { text: '退还茶钱：「客官消消气」', satisfactionEffect: 8, reputationEffect: 1, goldEffect: -15 },
                  { text: '「嫌贵就别来」', satisfactionEffect: -20, reputationEffect: -5, goldEffect: 0 },
                  { text: '加送点心：「小的一点心意」', satisfactionEffect: 12, reputationEffect: 0, goldEffect: -8 },
                ],
              },
              江湖人: {
                id: `provoke-${r.id}`,
                customerType: r.type,
                content: `${r.name}一拍桌子：「这江湖之事说得狗屁不通！简直笑掉大牙！」`,
                options: [
                  { text: '抱拳请教：「英雄说得是，愿闻其详」', satisfactionEffect: 10, reputationEffect: 2, goldEffect: 0 },
                  { text: '「不懂就别瞎说」', satisfactionEffect: -25, reputationEffect: -4, goldEffect: 0 },
                  { text: '敬酒赔罪：「是小的失言」', satisfactionEffect: 8, reputationEffect: 0, goldEffect: -10 },
                ],
              },
            }
            extraInterruption = provokeMessages[r.type] || provokeMessages.书生
            break
          }
        }

        if (extraInterruption) {
          set({
            currentInterruption: extraInterruption,
            storyProgress: newProgress,
            currentProvokeMessage: '挑刺事件发生！',
          })
          return
        }

        if (!state.currentInterruption && !supportMsg && Math.random() < 0.18 && state.storyProgress > 10 && state.storyProgress < 90) {
          const seatedCustomers = state.customers.filter((c) => c.seatId !== null)
          if (seatedCustomers.length > 0) {
            const c = seatedCustomers[Math.floor(Math.random() * seatedCustomers.length)]
            const matching = state.interruptions.filter((i) => i.customerType === c.type)
            const pool = matching.length > 0 ? matching : state.interruptions
            const ev = pool[Math.floor(Math.random() * pool.length)]
            set({ currentInterruption: ev, storyProgress: newProgress })
            return
          }
        }

        const customers = state.customers.map((c) => {
          if (c.seatId === null) return c
          let delta = Math.random() < 0.7 ? 1 : -1
          if (state.currentStory && state.currentBranch) {
            const match = state.currentBranch.tags.some((t) => c.preferenceTags.includes(t))
            if (match) delta += 1
          }
          if (c.isRegular) {
            const r = state.regularCustomers.find((x) => x.id === c.regularId)
            if (r) {
              const net = r.affinity - r.grudge
              if (net >= 40) delta += 1
              if (net <= -20) delta -= 1
            }
          }
          if (supportMsg) delta += 2
          return { ...c, satisfaction: Math.max(0, Math.min(100, c.satisfaction + delta)) }
        })

        if (goldBonus > 0) {
          get().addLedgerRecord('收入', '熟客打赏', goldBonus, supportMsg?.slice(0, 20) || '熟客打赏')
        }
        if (repBonus !== 0) {
          set((s) => ({
            reputation: Math.max(0, Math.min(100, s.reputation + repBonus)),
            reputationHistory: [
              ...s.reputationHistory,
              {
                day: s.day,
                value: Math.max(0, Math.min(100, s.reputation + repBonus)),
                delta: repBonus,
                reason: '熟客撑场',
              },
            ],
          }))
        }

        if (newProgress >= 100) {
          set({
            performanceActive: false,
            storyProgress: 100,
            customers,
            gold: state.gold + goldBonus,
            currentSupportMessage: supportMsg,
          })
          setTimeout(() => get().doSettlement(), 600)
        } else {
          set({
            storyProgress: newProgress,
            customers,
            gold: state.gold + goldBonus,
            currentSupportMessage: supportMsg,
          })
        }
      },

      handleInterruption: (option: InterruptionOption) => {
        const state = get()
        if (!state.currentInterruption) return

        const interruptionType = state.currentInterruption.customerType

        const customers = state.customers.map((c) => ({
          ...c,
          satisfaction: Math.max(0, Math.min(100, c.satisfaction + option.satisfactionEffect)),
        }))

        const newRegulars = state.regularCustomers.map((r) => {
          const presentCustomer = state.customers.find(
            (c) => c.isRegular && c.regularId === r.id
          )
          if (!presentCustomer) return r

          let affinityDelta = 0
          let grudgeDelta = 0

          if (r.type === interruptionType) {
            if (option.satisfactionEffect > 5) {
              affinityDelta = 5 + Math.floor(Math.random() * 4)
            } else if (option.satisfactionEffect < -5) {
              grudgeDelta = 4 + Math.floor(Math.random() * 4)
              affinityDelta = -2
            } else {
              affinityDelta = 1
            }
          } else {
            if (option.satisfactionEffect > 5) {
              affinityDelta = 1
            } else if (option.satisfactionEffect < -10) {
              grudgeDelta = 1
            }
          }

          const newAffinity = Math.max(0, Math.min(100, r.affinity + affinityDelta))
          const newGrudge = Math.max(0, Math.min(100, r.grudge + grudgeDelta))

          if (affinityDelta !== 0 || grudgeDelta !== 0) {
            const event: RegularEvent = {
              id: uid(),
              regularId: r.id,
              day: state.day,
              type: affinityDelta > 0 ? 'affinity_up' : affinityDelta < 0 ? 'affinity_down' : grudgeDelta > 0 ? 'grudge_up' : 'grudge_down',
              amount: Math.abs(affinityDelta || grudgeDelta),
              reason: `插话应对：${option.text.slice(0, 15)}`,
            }
            set((s) => ({ regularEvents: [...s.regularEvents, event] }))
          }

          return { ...r, affinity: newAffinity, grudge: newGrudge }
        })

        const newReputation = Math.max(0, Math.min(100, state.reputation + option.reputationEffect))

        set({
          currentInterruption: null,
          customers,
          gold: state.gold + option.goldEffect,
          reputation: newReputation,
          regularCustomers: newRegulars,
        })

        if (option.goldEffect !== 0) {
          get().addLedgerRecord(
            option.goldEffect > 0 ? '收入' : '支出',
            '插话应对',
            Math.abs(option.goldEffect),
            option.text.slice(0, 20)
          )
        }

        if (option.reputationEffect !== 0) {
          set((s) => ({
            reputationHistory: [
              ...s.reputationHistory,
              {
                day: s.day,
                value: newReputation,
                delta: option.reputationEffect,
                reason: option.reputationEffect > 0 ? '插话应对得当' : '插话处理失当',
              },
            ],
          }))
        }
      },

      doSettlement: () => {
        const state = get()
        if (!state.currentStory || !state.currentBranch) return

        const newRegulars = state.regularCustomers.map((r) => {
          const presentCustomer = state.customers.find(
            (c) => c.isRegular && c.regularId === r.id
          )
          if (!presentCustomer || presentCustomer.seatId === null) return r

          const seat = state.seats.find((s) => s.id === presentCustomer.seatId)
          let seatAffinityBonus = 0
          if (seat) {
            if (seat.tier === '贵宾') seatAffinityBonus = 5
            else if (seat.tier === '雅座') seatAffinityBonus = 2
          }

          const satBonus = presentCustomer.satisfaction > 70 ? 3 : presentCustomer.satisfaction < 30 ? -3 : 0

          const newAffinity = Math.max(0, Math.min(100, r.affinity + seatAffinityBonus + satBonus))
          const newGrudge = Math.max(0, Math.min(100, r.grudge + (satBonus < 0 ? Math.abs(satBonus) : 0)))

          if (seatAffinityBonus !== 0 || satBonus !== 0) {
            const event: RegularEvent = {
              id: uid(),
              regularId: r.id,
              day: state.day,
              type: (seatAffinityBonus + satBonus) > 0 ? 'affinity_up' : 'affinity_down',
              amount: Math.abs(seatAffinityBonus + satBonus),
              reason: seatAffinityBonus > 0 ? `安排${seat?.tier}座` : satBonus > 0 ? '本次体验愉快' : satBonus < 0 ? '本次体验不佳' : '普通体验',
            }
            set((s) => ({ regularEvents: [...s.regularEvents, event] }))
          }

          return { ...r, affinity: newAffinity, grudge: newGrudge }
        })

        const result = calcSettlement(
          state.day,
          state.currentStory,
          state.currentBranch,
          state.customers,
          state.seats,
          state.renovations,
          state.storyHistory,
          state.lastStoryDay,
          state.storyScores,
          state.reputation,
          state.snacks,
          newRegulars
        )

        const storyRecord: StoryRecord = {
          day: state.day,
          storyId: state.currentStory.id,
          branchId: state.currentBranch.id,
          audienceCount: result.audienceCount,
          earnings: result.totalEarnings,
          avgSatisfaction: result.avgSatisfaction,
        }

        const newStoryScores = { ...state.storyScores }
        if (!newStoryScores[state.currentStory.id]) {
          newStoryScores[state.currentStory.id] = []
        }
        newStoryScores[state.currentStory.id] = [
          ...newStoryScores[state.currentStory.id],
          result.avgSatisfaction,
        ].slice(-10)

        const newRep = Math.max(0, Math.min(100, state.reputation + result.reputationDelta))

        const repHistory: ReputationHistory = {
          day: state.day,
          value: newRep,
          delta: result.reputationDelta,
          reason: result.reputationDelta >= 0 ? '说书好评' : '差评影响',
        }

        set((s) => ({
          isSettlement: true,
          lastSettlement: result,
          gold: s.gold + result.totalEarnings,
          reputation: newRep,
          storyHistory: [...s.storyHistory, storyRecord],
          lastStoryDay: { ...s.lastStoryDay, [state.currentStory!.id]: state.day },
          storyScores: newStoryScores,
          reputationHistory: [...s.reputationHistory, repHistory],
          regularCustomers: newRegulars,
        }))

        get().addLedgerRecord('收入', '基础门票', result.baseEarnings, '晚场门票')
        if (result.tasteMatchBonus > 0)
          get().addLedgerRecord('收入', '口味匹配', result.tasteMatchBonus, '故事对味')
        if (result.seatViewBonus > 0)
          get().addLedgerRecord('收入', '视野加成', result.seatViewBonus, '座位优良')
        if (result.storyHeatBonus > 0)
          get().addLedgerRecord('收入', '热度加成', result.storyHeatBonus, '故事热门')
        if (result.serialExpectBonus > 0)
          get().addLedgerRecord('收入', '连载期待', result.serialExpectBonus, '观众期待')
        if (result.regularSupportBonus > 0)
          get().addLedgerRecord('收入', '熟客加成', result.regularSupportBonus, '熟客捧场')
        if (result.regularProvokePenalty > 0)
          get().addLedgerRecord('支出', '熟客挑刺损失', result.regularProvokePenalty, '熟客不满')
        if (result.tips > 0)
          get().addLedgerRecord('收入', '客人打赏', result.tips, '客人满意打赏')
        if (result.snackRevenue > 0)
          get().addLedgerRecord('收入', '茶点售卖', result.snackRevenue, '消费茶点')
        if (result.badReviewPenalty > 0)
          get().addLedgerRecord('支出', '差评损失', result.badReviewPenalty, '客人不满索赔')
      },

      nextDay: () => {
        set((s) => ({
          day: s.day + 1,
          phase: 'day',
          weather: randomWeather(),
          customers: [],
          currentStory: null,
          currentBranch: null,
          storyProgress: 0,
          availableStories: [],
          performanceActive: false,
          currentInterruption: null,
          isSettlement: false,
          currentSupportMessage: null,
          currentProvokeMessage: null,
          seats: s.seats.map((seat) => ({ ...seat, occupied: false })),
        }))
      },

      resetGame: () => {
        set({
          ...initialState,
          weather: randomWeather(),
          regularCustomers: REGULAR_CUSTOMERS.map((r) => ({ ...r })),
          regularEvents: [],
        })
      },

      addLedgerRecord: (type, category, amount, note) => {
        set((s) => ({
          ledger: [
            ...s.ledger,
            {
              day: s.day,
              id: uid(),
              type,
              category,
              amount,
              note,
              timestamp: Date.now(),
            },
          ],
        }))
      },

      modifyRegularAffinity: (regularId: string, delta: number, reason: string) => {
        set((s) => {
          const newRegulars = s.regularCustomers.map((r) => {
            if (r.id !== regularId) return r
            return { ...r, affinity: Math.max(0, Math.min(100, r.affinity + delta)) }
          })
          const event: RegularEvent = {
            id: uid(),
            regularId,
            day: s.day,
            type: delta > 0 ? 'affinity_up' : 'affinity_down',
            amount: Math.abs(delta),
            reason,
          }
          return { regularCustomers: newRegulars, regularEvents: [...s.regularEvents, event] }
        })
      },

      modifyRegularGrudge: (regularId: string, delta: number, reason: string) => {
        set((s) => {
          const newRegulars = s.regularCustomers.map((r) => {
            if (r.id !== regularId) return r
            return { ...r, grudge: Math.max(0, Math.min(100, r.grudge + delta)) }
          })
          const event: RegularEvent = {
            id: uid(),
            regularId,
            day: s.day,
            type: delta > 0 ? 'grudge_up' : 'grudge_down',
            amount: Math.abs(delta),
            reason,
          }
          return { regularCustomers: newRegulars, regularEvents: [...s.regularEvents, event] }
        })
      },

      clearSupportMessage: () => set({ currentSupportMessage: null }),
      clearProvokeMessage: () => set({ currentProvokeMessage: null }),
    }),
    {
      name: 'teahouse-storyteller-save',
      partialize: (s) => ({
        day: s.day,
        gold: s.gold,
        reputation: s.reputation,
        snacks: s.snacks,
        seats: s.seats,
        renovations: s.renovations,
        ledger: s.ledger,
        storyHistory: s.storyHistory,
        reputationHistory: s.reputationHistory,
        lastStoryDay: s.lastStoryDay,
        storyScores: s.storyScores,
        regularCustomers: s.regularCustomers,
        regularEvents: s.regularEvents,
      }),
    }
  )
)
