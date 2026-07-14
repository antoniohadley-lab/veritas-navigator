import { prisma } from '@/lib/prisma'
import { NavigationState, UPL_BOUNDARY_NOTE } from './types'

export class NavigationEngine {

  // Instantiate a procedural track for a real matter
  async instantiateTrack(
    caseId: string,
    issueTrackId: string,
    templateId: string
  ) {
    const template = await prisma.proceduralTrackTemplate.findUnique({
      where: { id: templateId },
      include: { stages: { orderBy: { stageOrder: 'asc' } } }
    })
    if (!template) throw new Error('Template not found')

    const firstStage = template.stages[0]

    const trackInstance = await prisma.matterTrackInstance.create({
      data: {
        caseId,
        issueTrackId,
        templateId,
        currentStageId: firstStage?.id,
        stageInstances: {
          create: template.stages.map(stage => ({
            stageTemplateId: stage.id,
            status: stage.stageOrder === 1 ? 'IN_PROGRESS' : 'NOT_STARTED',
            deadlineDate: stage.deadlineDays
              ? this.calculateDeadline(stage.deadlineDays, stage.deadlineFromEvent)
              : undefined
          }))
        }
      }
    })

    await this.generateNextActions(trackInstance.id)
    return trackInstance
  }

  // Get current navigation state for a track
  async getNavigationState(trackInstanceId: string): Promise<NavigationState> {
    const instance = await prisma.matterTrackInstance.findUnique({
      where: { id: trackInstanceId },
      include: {
        template: true,
        stageInstances: {
          include: { stageTemplate: { include: { requiredDocuments: true } } },
          orderBy: { stageTemplate: { stageOrder: 'asc' } }
        },
        missingInfoFlags: { where: { resolved: false } },
        nextActions: { where: { completedAt: null }, orderBy: { priority: 'asc' } }
      }
    })

    if (!instance) throw new Error('Track instance not found')

    const currentStage = instance.stageInstances.find(
      s => s.status === 'IN_PROGRESS'
    )

    return {
      trackInstanceId,
      currentStageName: currentStage?.stageTemplate.stageName ?? 'Unknown',
      currentStageOrder: currentStage?.stageTemplate.stageOrder ?? 0,
      status: instance.status,
      nextActions: instance.nextActions.map(a => ({
        actionText: a.actionText,
        sourceReference: a.sourceReference ?? undefined,
        priority: a.priority
      })),
      missingInfoFlags: instance.missingInfoFlags.map(f => ({
        question: f.question,
        whyItMatters: f.whyItMatters
      })),
      deadlines: instance.stageInstances
        .filter(s => s.deadlineDate || s.stageTemplate.deadlineLogic)
        .map(s => ({
          description: s.stageTemplate.stageName,
          dueDate: s.deadlineDate ?? undefined,
          deadlineDays: s.stageTemplate.deadlineDays ?? undefined,
          fromEvent: s.stageTemplate.deadlineFromEvent ?? undefined,
          isUncertain: !!s.stageTemplate.uncertaintyNote,
          sourceReference: s.stageTemplate.controllingSource
        })),
      uplNote: UPL_BOUNDARY_NOTE
    }
  }

  // Advance to next stage
  async advanceStage(trackInstanceId: string) {
    const instance = await prisma.matterTrackInstance.findUnique({
      where: { id: trackInstanceId },
      include: {
        stageInstances: {
          include: { stageTemplate: true },
          orderBy: { stageTemplate: { stageOrder: 'asc' } }
        }
      }
    })
    if (!instance) throw new Error('Not found')

    const current = instance.stageInstances.find(s => s.status === 'IN_PROGRESS')
    const next = instance.stageInstances.find(
      s => s.stageTemplate.stageOrder === (current?.stageTemplate.stageOrder ?? 0) + 1
    )

    if (current) {
      await prisma.matterStageInstance.update({
        where: { id: current.id },
        data: { status: 'COMPLETED', completedAt: new Date() }
      })
    }

    if (next) {
      await prisma.matterStageInstance.update({
        where: { id: next.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() }
      })
      await prisma.matterTrackInstance.update({
        where: { id: trackInstanceId },
        data: { currentStageId: next.stageTemplateId }
      })
    } else {
      await prisma.matterTrackInstance.update({
        where: { id: trackInstanceId },
        data: { status: 'COMPLETED' }
      })
    }

    await this.generateNextActions(trackInstanceId)
  }

  // Flag missing information
  async flagMissingInfo(
    trackInstanceId: string,
    question: string,
    whyItMatters: string
  ) {
    return prisma.missingInfoFlag.create({
      data: { trackInstanceId, question, whyItMatters }
    })
  }

  // Mark uncertainty — cannot determine path
  async markUncertain(trackInstanceId: string, reason: string) {
    await prisma.matterTrackInstance.update({
      where: { id: trackInstanceId },
      data: { status: 'UNCERTAIN' }
    })
    await this.flagMissingInfo(trackInstanceId, reason,
      'STAND cannot determine the procedural path without this information.')
  }

  private async generateNextActions(trackInstanceId: string) {
    const instance = await prisma.matterTrackInstance.findUnique({
      where: { id: trackInstanceId },
      include: {
        stageInstances: {
          where: { status: 'IN_PROGRESS' },
          include: {
            stageTemplate: {
              include: { requiredDocuments: true }
            }
          }
        }
      }
    })

    const current = instance?.stageInstances[0]
    if (!current) return

    await prisma.nextAction.deleteMany({ where: { trackInstanceId, completedAt: null } })

    const actions: {
      trackInstanceId: string
      actionText: string
      sourceReference?: string
      priority: number
    }[] = current.stageTemplate.requiredDocuments.map((doc, i) => ({
      trackInstanceId,
      actionText: `Prepare: ${doc.documentName}`,
      sourceReference: doc.sourceReference ?? undefined,
      priority: i + 1
    }))

    if (current.stageTemplate.deadlineLogic) {
      actions.unshift({
        trackInstanceId,
        actionText: `Deadline rule: ${current.stageTemplate.deadlineLogic}`,
        sourceReference: current.stageTemplate.controllingSource,
        priority: 0
      })
    }

    if (actions.length > 0) {
      await prisma.nextAction.createMany({ data: actions })
    }
  }

  private calculateDeadline(days: number, fromEvent?: string | null): Date | undefined {
    if (!fromEvent || fromEvent === 'UNKNOWN') return undefined
    if (fromEvent === 'FROM_FILING_DATE') {
      const d = new Date()
      d.setDate(d.getDate() + days)
      return d
    }
    return undefined
  }
}
