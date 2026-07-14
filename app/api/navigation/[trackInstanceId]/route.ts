import { NextRequest, NextResponse } from 'next/server'
import { NavigationEngine } from '@/lib/navigation/NavigationEngine'

const engine = new NavigationEngine()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackInstanceId: string }> }
) {
  const { trackInstanceId } = await params
  const state = await engine.getNavigationState(trackInstanceId)
  return NextResponse.json(state)
}
