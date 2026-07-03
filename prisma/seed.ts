/**
 * Prisma seed — initial RuleSource data.
 * Run after migration: npx prisma db seed
 * These entries mirror SEED_RULES in lib/rule-store.ts.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.ruleSource.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'seed-001',
        jurisdiction: 'michigan',
        topic: 'eviction notice period nonpayment',
        sourceType: 'statute',
        exactText:
          'If a tenant fails to pay the rent when due and the landlord desires to terminate the tenancy, the landlord may demand payment of the rent and give notice in writing that if the rent is not paid within 7 days after the notice is given, the lease or rental agreement is terminated.',
        sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-134',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
      {
        id: 'seed-002',
        jurisdiction: 'michigan',
        topic: 'eviction notice period holdover month to month',
        sourceType: 'statute',
        exactText:
          'To terminate a month-to-month tenancy or a tenancy at will, the landlord shall give the tenant written notice 30 days or 1 rental period, whichever is greater, before termination of the tenancy.',
        sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-134',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
      {
        id: 'seed-003',
        jurisdiction: 'michigan',
        topic: 'foia state local response window',
        sourceType: 'statute',
        exactText:
          'Within 5 business days after receiving a written request for a public record, a public body shall grant or deny the request, unless the request includes a demand for records not subject to disclosure under this act.',
        sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-15-235',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
      {
        id: 'seed-004',
        jurisdiction: 'michigan',
        topic: 'foia extension period',
        sourceType: 'statute',
        exactText:
          'A public body may extend the period to grant or deny a request by up to 10 business days by notifying the requesting person in writing within the original 5 business day period and stating the specific reasons for the extension.',
        sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-15-235',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
      {
        id: 'seed-005',
        jurisdiction: 'federal',
        topic: 'foia federal response window',
        sourceType: 'statute',
        exactText:
          'Each agency, upon any request for records made under paragraph (1), (2), or (3) of this subsection, shall determine within 20 days (excepting Saturdays, Sundays, and legal public holidays) after the receipt of any such request whether to comply with such request.',
        sourceUrl: 'https://www.law.cornell.edu/uscode/text/5/552',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
      {
        id: 'seed-006',
        jurisdiction: 'federal',
        topic: 'fdcpa debt validation window',
        sourceType: 'statute',
        exactText:
          "If the consumer notifies the debt collector in writing within the thirty-day period described in subsection (a) that the debt, or any portion thereof, is disputed, or that the consumer requests the name and address of the original creditor, the debt collector shall cease collection of the debt.",
        sourceUrl: 'https://www.law.cornell.edu/uscode/text/15/1692g',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
      {
        id: 'seed-007',
        jurisdiction: 'michigan',
        topic: 'surplus foreclosure proceeds',
        sourceType: 'statute',
        exactText:
          "If the amount received at the foreclosure sale exceeds the amount of the debt, together with interest, costs, and expenses of the sale, the excess shall be paid to the mortgagor, or the mortgagor's assigns, heirs, or legal representatives.",
        sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-600-3252',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
      {
        id: 'seed-008',
        jurisdiction: 'michigan',
        topic: 'child custody domicile change notice',
        sourceType: 'statute',
        exactText:
          "A parent of a child whose custody is governed by court order shall not change the legal residence of the child to a location that is more than 100 miles from the child's legal residence at the time of the commencement of the action in which the order is issued without the consent of the other parent or a court order.",
        sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-722-31',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
      {
        id: 'seed-009',
        jurisdiction: 'michigan',
        topic: 'security deposit return deadline',
        sourceType: 'statute',
        exactText:
          "Within 30 days after termination of the tenancy and receipt of the tenant's forwarding address, the landlord shall deliver to the tenant the full security deposit or, if an amount is withheld, an itemized list of any damages claimed and an explanation of the reason for the deduction.",
        sourceUrl: 'https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-554-609',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
      {
        id: 'seed-010',
        jurisdiction: 'michigan',
        topic: 'eviction summons response period',
        sourceType: 'court_rule',
        exactText:
          'A defendant in a summary proceeding for possession of premises must appear and defend at the hearing scheduled in the summons. The summons must specify a hearing date that is no sooner than 5 days and no later than 10 days after service.',
        sourceUrl:
          'https://courts.michigan.gov/siteassets/rules-instructions-administrative-orders/michigan-court-rules/court-rules-book-ch-4-responsive-html5.htm#4.201',
        lastVerifiedDate: new Date('2026-06-01'),
        staleAfterDays: 45,
      },
    ],
  });

  console.log('RuleSource seed complete — 10 Michigan entries inserted.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
