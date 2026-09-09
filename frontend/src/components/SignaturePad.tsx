import { useCallback, useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Botao } from './ui';

interface Props {
  /** Chamado sempre que o traço muda: recebe a data URL PNG ou null se vazio. */
  onMudar: (dataUrl: string | null) => void;
  desabilitado?: boolean;
  altura?: number;
}

/**
 * Captura de assinatura manuscrita (dedo no celular ou mouse no desktop).
 *
 * O canvas precisa de largura/altura em pixels reais; por isso medimos o
 * contêiner e redimensionamos junto com a tela. Redimensionar limpa o traço,
 * então avisamos o pai para invalidar a assinatura em andamento.
 */
export function SignaturePad({ onMudar, desabilitado = false, altura = 180 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<SignatureCanvas>(null);
  const [largura, setLargura] = useState(0);
  const [temTraco, setTemTraco] = useState(false);

  // Largura já aplicada ao canvas. Fica em ref (e não em estado) porque é lida
  // dentro do observer para decidir se houve redimensionamento de verdade.
  const larguraAtualRef = useRef(0);

  useEffect(() => {
    const elemento = containerRef.current;
    if (!elemento) return;

    const observador = new ResizeObserver(([entrada]) => {
      const nova = Math.floor(entrada.contentRect.width);
      const anterior = larguraAtualRef.current;
      if (nova === anterior) return;

      larguraAtualRef.current = nova;
      setLargura(nova);

      // Redimensionar o canvas (rotação de tela) apaga o traço já desenhado;
      // avisamos o pai para não enviar uma assinatura que sumiu da tela.
      if (anterior !== 0) {
        padRef.current?.clear();
        setTemTraco(false);
        onMudar(null);
      }
    });

    observador.observe(elemento);
    return () => observador.disconnect();
  }, [onMudar]);

  const aoFinalizarTraco = useCallback(() => {
    const pad = padRef.current;
    if (!pad || pad.isEmpty()) {
      setTemTraco(false);
      onMudar(null);
      return;
    }
    setTemTraco(true);
    onMudar(pad.toDataURL('image/png'));
  }, [onMudar]);

  const limpar = useCallback(() => {
    padRef.current?.clear();
    setTemTraco(false);
    onMudar(null);
  }, [onMudar]);

  return (
    <div>
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-lg border-2 border-dashed bg-white
          ${desabilitado ? 'border-slate-200 opacity-60' : 'border-slate-300'}`}
        style={{ height: altura }}
      >
        {largura > 0 && (
          <SignatureCanvas
            ref={padRef}
            penColor="#1e293b"
            onEnd={aoFinalizarTraco}
            canvasProps={{
              width: largura,
              height: altura,
              className: 'canvas-assinatura block',
              style: desabilitado ? { pointerEvents: 'none' } : undefined,
            }}
          />
        )}
        {!temTraco && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-slate-400">Assine aqui com o dedo ou o mouse</span>
          </div>
        )}
        {/* Linha de base, como em um documento impresso. */}
        <div className="pointer-events-none absolute inset-x-6 bottom-6 border-b border-slate-200" />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {temTraco ? 'Assinatura capturada.' : 'Nenhum traço ainda.'}
        </p>
        <Botao type="button" variante="secundario" onClick={limpar} disabled={desabilitado || !temTraco}>
          Limpar
        </Botao>
      </div>
    </div>
  );
}
