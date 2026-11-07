/** @jsxImportSource @gpuix/react */
import { useState } from "react";
import { FileUpload, type UploadFunction } from "../src/file-upload.js";

const fakeUpload: UploadFunction = (file, onProgress) =>
  new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      if (file.name.includes("err")) {
        reject("simulated failure");
        return;
      }
      onProgress(0.5);
      setTimeout(() => {
        onProgress(1);
        resolve();
      }, 200);
    }, 200);
  });

export const FileUploadExample = () => {
  const [files, setFiles] = useState([
    { id: "a", name: "report.pdf" },
    { id: "b", name: "err-notes.txt" },
  ]);

  return (
    <div style={{ maxWidth: 420 }}>
      <FileUpload
        upload={fakeUpload}
        files={files}
        onRemoveFile={(id) =>
          setFiles((current) => current.filter((file) => file.id !== id))
        }
      />
    </div>
  );
};
