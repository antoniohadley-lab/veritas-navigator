import { NextRequest, NextResponse } from 'next/server'
import { NavigationEngine } from '@/lib/navigation/NavigationEngine'

const engine = new NavigationEngine()

export async function GET(
  req: NextRequest,
  { params }: { params: { trackInstanceId: string } }
) {
  const state = await engine.getNavigationState(params.trackInstanceId)
  return NextResponse.json(state)
}
