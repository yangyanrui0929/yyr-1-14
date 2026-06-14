import type { CustomerTemplate, Customer, RegularCustomer, RelationshipLevel } from '@/types'

export const CUSTOMER_TEMPLATES: CustomerTemplate[] = [
  {
    type: '书生',
    name: '书生',
    preferenceTags: ['爱情', '才子佳人', '历史', '婉约', '诗词'],
    generosity: 3,
    patience: 5,
    baseWealth: 30,
    socialInfluence: 3,
    emoji: '📚',
  },
  {
    type: '商贾',
    name: '商人',
    preferenceTags: ['历史', '谋略', '世情', '讽刺'],
    generosity: 5,
    patience: 3,
    baseWealth: 100,
    socialInfluence: 4,
    emoji: '💰',
  },
  {
    type: '妇人',
    name: '夫人',
    preferenceTags: ['爱情', '婉约', '神怪', '才子佳人'],
    generosity: 4,
    patience: 4,
    baseWealth: 50,
    socialInfluence: 3,
    emoji: '👩',
  },
  {
    type: '江湖人',
    name: '侠客',
    preferenceTags: ['武侠', '热血', '江湖', '冒险', '义气'],
    generosity: 2,
    patience: 2,
    baseWealth: 20,
    socialInfluence: 5,
    emoji: '⚔️',
  },
  {
    type: '官员',
    name: '大人',
    preferenceTags: ['历史', '谋略', '官场', '世情'],
    generosity: 5,
    patience: 3,
    baseWealth: 150,
    socialInfluence: 5,
    emoji: '🎩',
  },
  {
    type: '平民',
    name: '百姓',
    preferenceTags: ['神怪', '悬疑', '热血', '冒险', '励志'],
    generosity: 2,
    patience: 4,
    baseWealth: 15,
    socialInfluence: 2,
    emoji: '👤',
  },
]

export const REGULAR_CUSTOMERS: RegularCustomer[] = [
  {
    id: 'reg-scholar-1',
    type: '书生',
    name: '柳慕白',
    title: '落第才子',
    preferenceTags: ['爱情', '才子佳人', '婉约', '诗词'],
    generosity: 3,
    patience: 6,
    baseWealth: 40,
    socialInfluence: 4,
    emoji: '📖',
    affinity: 30,
    grudge: 0,
    bringAbility: 2,
    visitCount: 0,
    lastVisitDay: 0,
    background: '屡试不第的寒门书生，最爱听才子佳人缠绵悱恻的故事，常以诗会友。',
  },
  {
    id: 'reg-scholar-2',
    type: '书生',
    name: '苏文渊',
    title: '太学监生',
    preferenceTags: ['历史', '谋略', '官场'],
    generosity: 4,
    patience: 4,
    baseWealth: 80,
    socialInfluence: 5,
    emoji: '🎓',
    affinity: 20,
    grudge: 0,
    bringAbility: 3,
    visitCount: 0,
    lastVisitDay: 0,
    background: '出身官宦世家的太学生，好读史论政，品评古今人物得失。',
  },
  {
    id: 'reg-merchant-1',
    type: '商贾',
    name: '金满堂',
    title: '绸缎庄老板',
    preferenceTags: ['历史', '谋略', '世情', '讽刺'],
    generosity: 6,
    patience: 3,
    baseWealth: 200,
    socialInfluence: 5,
    emoji: '🏦',
    affinity: 25,
    grudge: 0,
    bringAbility: 4,
    visitCount: 0,
    lastVisitDay: 0,
    background: '城中最大绸缎庄的掌柜，为人精明圆滑，最爱听商场博弈、人情世故的故事。',
  },
  {
    id: 'reg-merchant-2',
    type: '商贾',
    name: '钱多多',
    title: '钱庄掌柜',
    preferenceTags: ['世情', '讽刺', '谋略'],
    generosity: 4,
    patience: 4,
    baseWealth: 300,
    socialInfluence: 4,
    emoji: '💎',
    affinity: 15,
    grudge: 10,
    bringAbility: 3,
    visitCount: 0,
    lastVisitDay: 0,
    background: '经营钱庄多年，为人悭吝，据说从前因说书人讽刺过他而怀恨在心。',
  },
  {
    id: 'reg-swordsman-1',
    type: '江湖人',
    name: '楚云帆',
    title: '独行剑客',
    preferenceTags: ['武侠', '热血', '江湖', '义气'],
    generosity: 3,
    patience: 3,
    baseWealth: 30,
    socialInfluence: 6,
    emoji: '🗡️',
    affinity: 35,
    grudge: 0,
    bringAbility: 3,
    visitCount: 0,
    lastVisitDay: 0,
    background: '江湖上有名的独行剑客，剑法超群，最喜听侠义故事，愿为朋友两肋插刀。',
  },
  {
    id: 'reg-swordsman-2',
    type: '江湖人',
    name: '铁无双',
    title: '镖局总镖头',
    preferenceTags: ['武侠', '冒险', '江湖'],
    generosity: 4,
    patience: 2,
    baseWealth: 60,
    socialInfluence: 5,
    emoji: '🛡️',
    affinity: 20,
    grudge: 5,
    bringAbility: 4,
    visitCount: 0,
    lastVisitDay: 0,
    background: '威远镖局总镖头，性格暴躁，曾因说书人说错江湖典故而大闹一场。',
  },
]

export function getRelationshipLevel(affinity: number, grudge: number): RelationshipLevel {
  const net = affinity - grudge
  if (net >= 80) return '莫逆'
  if (net >= 60) return '挚友'
  if (net >= 30) return '友善'
  if (net >= 0) return '普通'
  if (net >= -30) return '冷淡'
  if (net >= -60) return '交恶'
  return '仇敌'
}

export function getRelationshipColor(level: RelationshipLevel): string {
  switch (level) {
    case '莫逆': return 'text-purple-600'
    case '挚友': return 'text-teal-600'
    case '友善': return 'text-tea'
    case '普通': return 'text-ink'
    case '冷淡': return 'text-ink-light'
    case '交恶': return 'text-orange-600'
    case '仇敌': return 'text-cinnabar'
  }
}

export function generateRandomCustomers(count: number): Customer[] {
  const result: Customer[] = []
  for (let i = 0; i < count; i++) {
    const tpl = CUSTOMER_TEMPLATES[Math.floor(Math.random() * CUSTOMER_TEMPLATES.length)]
    result.push({
      id: `c-${Date.now()}-${i}`,
      type: tpl.type,
      name: `${tpl.name}${['甲', '乙', '丙', '丁', '戊', '己'][i % 6]}`,
      preferenceTags: [...tpl.preferenceTags],
      generosity: tpl.generosity + Math.floor(Math.random() * 2) - 1,
      patience: tpl.patience + Math.floor(Math.random() * 2) - 1,
      wealth: tpl.baseWealth + Math.floor(Math.random() * tpl.baseWealth * 0.5),
      socialInfluence: tpl.socialInfluence,
      seatId: null,
      satisfaction: 50,
      emoji: tpl.emoji,
    })
  }
  return result
}

export function regularToCustomer(regular: RegularCustomer): Customer {
  return {
    id: `c-reg-${regular.id}-${Date.now()}`,
    type: regular.type,
    name: regular.name,
    preferenceTags: [...regular.preferenceTags],
    generosity: regular.generosity,
    patience: regular.patience,
    wealth: regular.baseWealth + Math.floor(Math.random() * regular.baseWealth * 0.3),
    socialInfluence: regular.socialInfluence,
    seatId: null,
    satisfaction: 50 + Math.floor(regular.affinity / 10) - Math.floor(regular.grudge / 10),
    emoji: regular.emoji,
    isRegular: true,
    regularId: regular.id,
  }
}
