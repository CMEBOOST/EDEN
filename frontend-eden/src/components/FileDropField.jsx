import { useEffect, useMemo, useState } from "react";

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// value = File | null, onChange(File | null)
function FileDropField({
  value,
  onChange,
  accept = "image/*,application/pdf",
}) {
  const [dragOver, setDragOver] = useState(false);

  const isImage = value?.type?.startsWith("image/");
  const preview = useMemo(
    () => (isImage ? URL.createObjectURL(value) : null),
    [value, isImage]
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  function handleFiles(files) {
    if (files && files[0]) onChange(files[0]);
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-3">
        {isImage && preview ? (
          <img
            src={preview}
            alt=""
            className="w-12 h-12 object-cover rounded border border-gray-200"
          />
        ) : (
          <div className="w-12 h-12 flex items-center justify-center rounded bg-red-50 text-red-500 text-xl">
            📄
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-800 truncate">{value.name}</p>
          <p className="text-xs text-gray-400">{humanSize(value.size)}</p>
        </div>
        <label className="text-xs text-blue-600 hover:underline cursor-pointer">
          เปลี่ยน
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-gray-400 hover:text-red-600 text-lg leading-none px-1"
          aria-label="ลบไฟล์"
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center gap-1 border border-dashed rounded-lg py-6 px-4 cursor-pointer text-center transition-colors ${
        dragOver
          ? "border-blue-400 bg-blue-50"
          : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
      }`}
    >
      <span className="text-2xl">⬆️</span>
      <span className="text-sm text-gray-600">
        คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวาง
      </span>
      <span className="text-xs text-gray-400">
        PDF หรือ รูปภาพ · ไม่เกิน 10 MB
      </span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}

export default FileDropField;
