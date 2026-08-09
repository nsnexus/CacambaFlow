const WHATSAPP_NUMBER = '5594991081351';
const WHATSAPP_MESSAGE = 'Olá! Quero saber mais sobre o CaçambaFlow.';

export function WhatsAppButton() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-float"
      aria-label="Fale conosco no WhatsApp"
    >
      <svg viewBox="0 0 24 24" width="28" height="28" fill="#fff" aria-hidden="true">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        <path d="M12.004 2.003c-5.514 0-9.996 4.482-9.996 9.997 0 1.763.462 3.486 1.34 5.003L2 22l5.117-1.334a9.96 9.96 0 0 0 4.886 1.246h.004c5.514 0 9.996-4.483 9.996-9.997 0-2.67-1.04-5.182-2.929-7.07a9.935 9.935 0 0 0-7.07-2.842zm5.855 15.849a8.284 8.284 0 0 1-5.856 2.425h-.003a8.28 8.28 0 0 1-4.223-1.155l-.303-.18-3.037.792.811-2.96-.198-.304a8.264 8.264 0 0 1-1.267-4.42c0-4.575 3.723-8.297 8.3-8.297a8.244 8.244 0 0 1 5.87 2.432 8.234 8.234 0 0 1 2.428 5.868 8.281 8.281 0 0 1-2.522 5.799z" />
      </svg>

      <style>{`
        .whatsapp-float {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 40;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #25D366;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.35);
          transition: transform 150ms ease, box-shadow 150ms ease;
        }
        .whatsapp-float:hover {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }
      `}</style>
    </a>
  );
}
