import { NextRequest, NextResponse } from 'next/server'
import { NavigationEngine } from '@/lib/navigation/NavigationEngine'

const engine = new NavigationEngine()

export async function POST(req: NextRequest) {
  const { trackInstanceId } = await req.json()
  await engine.advanceStage(trackInstanceId)
  const state = await engine.getNavigationState(trackInstanceId)
  return NextResponse.json(state)
}
