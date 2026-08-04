import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SyncOutboxEvent } from '@cacambaflow/types';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticação do App Mobile
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 403 });

    // 2. Extrair eventos do payload
    const body = await req.json();
    const events: SyncOutboxEvent[] = body.events || [];

    const processedIds: string[] = [];
    const failedIds: { id: string; reason: string }[] = [];

    // 3. Processar cada evento (Poderia ser em uma RPC do Supabase para transação, mas faremos simples no Node por enquanto)
    for (const event of events) {
      try {
        // Checar idempotência
        const { data: alreadyProcessed } = await supabase
          .from('processed_events')
          .select('event_id')
          .eq('event_id', event.event_id)
          .eq('tenant_id', profile.tenant_id)
          .single();

        if (alreadyProcessed) {
          processedIds.push(event.event_id);
          continue; // Já processado, ignora
        }

        // Processamento baseado no tipo
        if (event.aggregate_type === 'job') {
          const payload = event.payload as any;

          if (event.event_type === 'EVIDENCE_UPLOAD') {
            // O binário já foi enviado ao Storage pelo Mobile antes de chamar o sync
            const { error: evidenceError } = await supabase.from('evidences').insert({
              tenant_id: profile.tenant_id,
              job_id: event.aggregate_id,
              evidence_type: payload.evidence_type,
              storage_path: payload.storage_path,
              mime_type: payload.mime_type,
              file_size: payload.file_size,
              captured_at_device: payload.captured_at_device,
              latitude: payload.lat,
              longitude: payload.lng,
              status: 'UPLOAD_OK'
            });
            if (evidenceError) throw evidenceError;

          } else {
            // Atualização de Status Normal
            const novoStatus = payload.status;
            const lat = payload.lat;
            const lng = payload.lng;

            const updateData: any = { status: novoStatus };
            
            if (novoStatus === 'EM_ROTA') updateData.started_at = event.occurred_at_device;
            if (novoStatus === 'NO_LOCAL') updateData.arrived_at = event.occurred_at_device;
            if (novoStatus === 'CONCLUIDO' || novoStatus === 'CONCLUIDO_LOCAL') updateData.completed_at = event.occurred_at_device;
            if (novoStatus === 'FALHADO') updateData.failed_at = event.occurred_at_device;

            const { error: updateError } = await supabase
              .from('jobs')
              .update(updateData)
              .eq('id', event.aggregate_id)
              .eq('tenant_id', profile.tenant_id);

            if (updateError) throw updateError;

            // Registrar o histórico
            await supabase.from('job_status_events').insert({
              tenant_id: profile.tenant_id,
              job_id: event.aggregate_id,
              event_id: event.event_id,
              to_status: novoStatus,
              source: 'MOBILE',
              actor_user_id: user.id,
              device_id: event.device_id,
              occurred_at_device: event.occurred_at_device,
              latitude: lat,
              longitude: lng,
              metadata: payload.metadata || null
            });
          }
        } else if (event.aggregate_type === 'location') {
          // Processamento do Lote de Localização GPS (Telemetria Background)
          const payload = event.payload as any;
          const { error: locError } = await supabase.from('driver_locations').insert({
            tenant_id: profile.tenant_id,
            driver_id: event.aggregate_id,
            latitude: payload.lat,
            longitude: payload.lng,
            accuracy: payload.accuracy,
            speed: payload.speed,
            heading: payload.heading,
            device_timestamp: payload.device_timestamp,
          });

          if (locError) throw locError;
        }

        // Gravar sucesso na idempotência
        await supabase.from('processed_events').insert({
          event_id: event.event_id,
          tenant_id: profile.tenant_id,
          device_id: event.device_id,
          result: 'OK'
        });

        processedIds.push(event.event_id);

      } catch (err: any) {
        failedIds.push({ id: event.event_id, reason: err.message });
      }
    }

    return NextResponse.json({ processed: processedIds, failed: failedIds });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
