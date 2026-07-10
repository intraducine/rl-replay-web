import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "./Button";

export function FileDropzone({ onFile, disabled = false }: { onFile: (file: File) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pickFile = (files: FileList | null) => {
    const file = files?.item(0);
    if (file && !disabled) onFile(file);
  };

  return (
    <div
      className={`dropzone ${dragging ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}
      aria-busy={disabled}
      onDragOver={(event) => {
        event.preventDefault();
        if (disabled) return;
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (disabled) return;
        pickFile(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".replay"
        disabled={disabled}
        onChange={(event) => pickFile(event.currentTarget.files)}
        hidden
      />
      <Upload size={34} />
      <div>
        <h2>Select a replay file</h2>
        <p>Choose or drag in a .replay file.</p>
      </div>
      <Button variant="primary" tooltip="Choose a .replay file from this device" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {disabled ? "Opening replay…" : "Choose replay"}
      </Button>
    </div>
  );
}
