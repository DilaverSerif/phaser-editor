export function UnsavedChangesDialog({
  message,
  onSave,
  onDiscard,
  onCancel,
}: {
  message: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onCancel}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p>{message}</p>
        <div className="btn-row">
          <button type="button" className="btn primary" onClick={onSave}>
            Kaydet
          </button>
          <button type="button" className="btn" onClick={onDiscard}>
            Kaydetme
          </button>
          <button type="button" className="btn" onClick={onCancel}>
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
