/**
 * POST /api/upload
 *
 * Accepts multipart form data, hashes the file buffer (SHA-256),
 * uploads to Supabase Storage, creates a CaseDocument row,
 * and writes a VerificationEvent to the immutable ledger.
 *
 * Required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Required Supabase Storage bucket: case-documents (create in Supabase dashboard)
 *
 * Form fields:
 *   file         File      required
 *   caseId       string    required
 *   uploadedBy   string    required  (user id or actor id)
 *   description  string    optional
 *   exhibitLabel string    optional  ("Exhibit A", etc.)
 *
 * Response:
 *   { documentId, fileHash, filename, storageUri }
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sha256 } from '@/lib/hash'

const BUCKET = 'case-documents'

async function uploadToSupabase(
  buffer: Buffer,
  storagePath: string,
  mimeType: string
): Promise<string> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  const uploadUrl = `${supabaseUrl}/storage/v1/object/${BUCKET}/${storagePath}`
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': mimeType,
    },
    body: new Uint8Array(buffer),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase Storage upload failed (${res.status}): ${body}`)
  }

  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const file = formData.get('file') as File | null
    const caseId = formData.get('caseId') as string | null
    const uploadedBy = formData.get('uploadedBy') as string | null
    const description = formData.get('description') as string | null
    const exhibitLabel = formData.get('exhibitLabel') as string | null

    if (!file || !caseId || !uploadedBy) {
      return NextResponse.json(
        { error: 'file, caseId, and uploadedBy are required' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileHash = sha256(buffer)
    const storagePath = `${caseId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const storageUri = await uploadToSupabase(buffer, storagePath, file.type || 'application/octet-stream')

    const doc = await prisma.caseDocument.create({
      data: {
        caseId,
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        storageUri,
        fileHash,
        uploadedBy,
        description: description ?? undefined,
        exhibitLabel: exhibitLabel ?? undefined,
      },
    })

    await prisma.verificationEvent.create({
      data: {
        caseId,
        actorId: uploadedBy,
        roleType: 'litigant',
        eventType: 'document_uploaded',
        payloadType: 'document',
        payloadRef: doc.id,
        evidenceUri: storageUri,
        evidenceHash: fileHash,
        notes: description ?? undefined,
      },
    })

    return NextResponse.json({
      documentId: doc.id,
      fileHash,
      filename: file.name,
      storageUri,
    })
  } catch (err) {
    console.error('[/api/upload] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
