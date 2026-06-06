import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "./Button";

export function FileDropzone({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pickFile = (files: FileList | null) => {
    const file = files?.item(0);
    if (file) onFile(file);
  };

  return (
    <div
      className={`dropzone ${dragging ? "is-dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        pickFile(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".replay"
        onChange={(event) => pickFile(event.currentTarget.files)}
        hidden
      />
      <Upload size={34} />
      <div>
        <h2>Select a replay file</h2>
        <p>Choose or drag in a .replay file. It opens locally and stays on this device.</p>
      </div>
      <Button variant="primary" onClick={() => inputRef.current?.click()}>
        Choose replay
      </Button>
    </div>
  );
}
