import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type JobStatus = 'idle' | 'pending' | 'running' | 'done' | 'failed';

export function useAdsImportJob() {
  const { user } = useAuth();
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(async (id: string) => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('shopee_ads_import_jobs' as any)
        .select('status, result, error')
        .eq('id', id)
        .single();
      
      if (fetchErr || !data) return;
      
      const jobData = data as any;
      const newStatus = jobData.status as JobStatus;
      setStatus(newStatus);
      
      if (newStatus === 'done') {
        setResult(jobData.result);
        stopPolling();
        toast.success('Dados de Ads importados com sucesso!');
      } else if (newStatus === 'failed') {
        setError(jobData.error || 'Erro desconhecido');
        stopPolling();
        toast.error(jobData.error || 'Falha ao importar dados de Ads.');
      }
    } catch {
      // ignore polling errors
    }
  }, [stopPolling]);

  const startJob = useCallback(async () => {
    if (!user) return;
    
    setStatus('pending');
    setError(null);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('shopee-ads', {
        headers: { Authorization: `Bearer ${session.session?.access_token}` },
        body: { mode: 'job' },
      });

      if (res.error) {
        setStatus('failed');
        setError(res.error?.message || 'Erro ao criar job');
        toast.error(res.error?.message || 'Erro ao iniciar importação');
        return;
      }

      const newJobId = res.data?.job_id;
      if (!newJobId) {
        setStatus('failed');
        setError('Sem job_id na resposta');
        return;
      }

      setJobId(newJobId);

      // Start polling every 3 seconds
      stopPolling();
      pollRef.current = setInterval(() => poll(newJobId), 3000);
      // Also poll immediately after a brief delay
      setTimeout(() => poll(newJobId), 1500);
    } catch (err: any) {
      setStatus('failed');
      setError(err?.message || 'Erro ao iniciar importação');
      toast.error('Erro ao iniciar importação de Ads.');
    }
  }, [user, stopPolling, poll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const reset = useCallback(() => {
    stopPolling();
    setJobId(null);
    setStatus('idle');
    setError(null);
    setResult(null);
  }, [stopPolling]);

  return {
    jobId,
    status,
    error,
    result,
    isImporting: status === 'pending' || status === 'running',
    startJob,
    reset,
  };
}
