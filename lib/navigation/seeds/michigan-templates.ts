import { prisma } from '@/lib/prisma'

async function seed() {

  // Civil Procedure — General
  await prisma.proceduralTrackTemplate.create({
    data: {
      trackType: 'MUNICIPAL_DISPUTE',
      matterSubtype: 'GENERAL_CIVIL',
      displayName: 'Michigan General Civil Procedure',
      jurisdiction: 'MICHIGAN',
      stages: {
        create: [
          {
            stageName: 'Filing',
            stageOrder: 1,
            controllingSource: 'MCR 2.101-2.113',
            controllingUrl: 'https://courts.michigan.gov/rules/pages/court-rules.aspx',
            deadlineLogic: 'Statute of limitations applies — varies by claim type',
            uncertaintyNote: 'Limitations period cannot be determined without claim type',
            requiredDocuments: {
              create: [
                { documentName: 'Complaint', isRequired: true, sourceReference: 'MCR 2.111' },
                { documentName: 'Summons', isRequired: true, sourceReference: 'MCR 2.102' },
                { documentName: 'Civil Case Filing Fee', isRequired: true }
              ]
            }
          },
          {
            stageName: 'Service of Process',
            stageOrder: 2,
            controllingSource: 'MCR 2.103-2.106',
            deadlineDays: 91,
            deadlineFromEvent: 'FROM_FILING_DATE',
            deadlineLogic: '91 days from filing (MCR 2.102(D))',
            requiredDocuments: {
              create: [
                { documentName: 'Proof of Service', isRequired: true, sourceReference: 'MCR 2.104' }
              ]
            }
          },
          {
            stageName: 'Response Period',
            stageOrder: 3,
            controllingSource: 'MCR 2.108',
            deadlineDays: 21,
            deadlineFromEvent: 'FROM_SERVICE_DATE',
            deadlineLogic: '21 days from service (28 if served by mail)',
            uncertaintyNote: 'Service method affects deadline — confirm how service was made',
            requiredDocuments: {
              create: [
                { documentName: 'Answer or Motion', isRequired: true, sourceReference: 'MCR 2.110' }
              ]
            }
          },
          {
            stageName: 'Motion Practice',
            stageOrder: 4,
            controllingSource: 'MCR 2.116, MCR 2.119',
            deadlineLogic: '21 days notice required before hearing (MCR 2.119)',
            requiredDocuments: {
              create: [
                { documentName: 'Motion', isRequired: true },
                { documentName: 'Brief in Support', isRequired: false },
                { documentName: 'Proof of Service on opposing party', isRequired: true }
              ]
            }
          },
          {
            stageName: 'Trial',
            stageOrder: 5,
            controllingSource: 'MCR 2.501-2.525',
            deadlineLogic: 'Per court scheduling order',
            uncertaintyNote: 'Scheduling order required to populate deadlines',
            requiredDocuments: {
              create: [
                { documentName: 'Exhibit List', isRequired: true },
                { documentName: 'Witness List', isRequired: true },
                { documentName: 'All exhibits organized and labeled', isRequired: true }
              ]
            }
          }
        ]
      }
    }
  })

  // Summary Possession — Eviction
  await prisma.proceduralTrackTemplate.create({
    data: {
      trackType: 'HOUSING_FORECLOSURE_EVICTION',
      matterSubtype: 'SUMMARY_POSSESSION',
      displayName: 'Michigan Summary Possession (Eviction)',
      stages: {
        create: [
          {
            stageName: 'Notice to Quit',
            stageOrder: 1,
            controllingSource: 'MCL 600.5714-5716',
            deadlineDays: 7,
            deadlineFromEvent: 'FROM_FILING_DATE',
            deadlineLogic: '7 days for non-payment; 30 days for termination of tenancy',
            uncertaintyNote: 'Deadline depends on reason for eviction — confirm basis',
            requiredDocuments: {
              create: [
                { documentName: 'Written Notice to Quit', isRequired: true, sourceReference: 'MCL 600.5714' }
              ]
            }
          },
          {
            stageName: 'Complaint Filing',
            stageOrder: 2,
            controllingSource: 'MCR 4.201',
            deadlineLogic: 'After notice period expires',
            requiredDocuments: {
              create: [
                { documentName: 'Complaint for Possession (DC 100a)', isRequired: true },
                { documentName: 'Filing fee', isRequired: true }
              ]
            }
          },
          {
            stageName: 'Service of Summons',
            stageOrder: 3,
            controllingSource: 'MCR 4.201(C)',
            deadlineDays: 3,
            deadlineFromEvent: 'FROM_HEARING_DATE',
            deadlineLogic: 'At least 3 days before hearing',
            requiredDocuments: {
              create: [
                { documentName: 'Summons and Complaint — served on tenant', isRequired: true }
              ]
            }
          },
          {
            stageName: 'Hearing',
            stageOrder: 4,
            controllingSource: 'MCR 4.201(G)',
            deadlineLogic: 'Set by court — typically within 10 days of filing',
            requiredDocuments: {
              create: [
                { documentName: 'Lease agreement', isRequired: true },
                { documentName: 'Notices served', isRequired: true },
                { documentName: 'Payment records', isRequired: true }
              ]
            }
          },
          {
            stageName: 'Appeal',
            stageOrder: 5,
            isOptional: true,
            controllingSource: 'MCR 4.201(N)',
            deadlineDays: 10,
            deadlineFromEvent: 'FROM_JUDGMENT_DATE',
            deadlineLogic: '10 days from judgment',
            requiredDocuments: {
              create: [
                { documentName: 'Claim of Appeal', isRequired: true },
                { documentName: 'Appeal bond', isRequired: true }
              ]
            }
          }
        ]
      }
    }
  })

  // Family Court — Custody Modification
  await prisma.proceduralTrackTemplate.create({
    data: {
      trackType: 'FAMILY_CUSTODY_SUPPORT',
      matterSubtype: 'CUSTODY_MODIFICATION',
      displayName: 'Michigan Custody Modification',
      stages: {
        create: [
          {
            stageName: 'Motion to Modify',
            stageOrder: 1,
            controllingSource: 'MCL 722.27, MCR 3.210',
            deadlineLogic: 'No fixed deadline — must show proper cause or change of circumstances',
            uncertaintyNote: 'Proper cause/change of circumstances is a legal standard — STAND surfaces the rule, does not apply it',
            requiredDocuments: {
              create: [
                { documentName: 'Motion to Modify Custody', isRequired: true },
                { documentName: 'Supporting Affidavit', isRequired: true, sourceReference: 'MCR 3.210' }
              ]
            }
          },
          {
            stageName: 'Response Period',
            stageOrder: 2,
            controllingSource: 'MCR 2.108',
            deadlineDays: 21,
            deadlineFromEvent: 'FROM_SERVICE_DATE',
            deadlineLogic: '21 days from service',
            requiredDocuments: {
              create: [
                { documentName: 'Response/Answer', isRequired: false }
              ]
            }
          },
          {
            stageName: 'FOC Investigation',
            stageOrder: 3,
            isOptional: true,
            controllingSource: 'MCL 552.505',
            deadlineLogic: 'Per court order — varies by county',
            uncertaintyNote: 'Whether FOC investigation is ordered is judicial discretion',
            requiredDocuments: {
              create: [
                { documentName: 'FOC Questionnaire', isRequired: true }
              ]
            }
          },
          {
            stageName: 'De Novo Objection',
            stageOrder: 4,
            isOptional: true,
            controllingSource: 'MCR 3.215(E)(4)',
            deadlineDays: 21,
            deadlineFromEvent: 'FROM_FOC_REPORT_DATE',
            deadlineLogic: '21 days from FOC report to file objection',
            requiredDocuments: {
              create: [
                { documentName: 'Objection to FOC Recommendation', isRequired: true }
              ]
            }
          },
          {
            stageName: 'Hearing',
            stageOrder: 5,
            controllingSource: 'MCR 3.210(C)',
            deadlineLogic: 'Per scheduling order',
            requiredDocuments: {
              create: [
                { documentName: 'Evidence list', isRequired: true },
                { documentName: 'Witness list', isRequired: true }
              ]
            }
          }
        ]
      }
    }
  })

  console.log('Michigan procedural templates seeded.')
}

seed().catch(console.error).finally(() => prisma.$disconnect())
