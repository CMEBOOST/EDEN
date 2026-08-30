import { useEffect, useMemo } from "react";
import { avatarSrc, AVATAR_PRESETS, PRESET_OPTIONS } from "../lib/avatar";

// controlled: value = string|null (preset key / "/uploads/..." / null), file = File|null
function AvatarPicker({ value, file, role, onChangeValue, onChangeFile }) {
  const filePreview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file]
  );
  useEffect(
    () => () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    },
    [filePreview]
  );

  const previewSrc = filePreview ?? avatarSrc({ avatar_url: value, role });

  return (
    <div className="flex items-center gap-4">
      <img
        src={previewSrc}
        alt=""
        className="w-16 h-16 rounded-full object-cover border border-gray-200"
      />
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {PRESET_OPTIONS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              title={label}
              onClick={() => {
                onChangeFile(null);
                onChangeValue(key);
              }}
              className={`border rounded-full p-0.5 ${
                !file && value === key
                  ? "border-blue-500"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              <img
                src={AVATAR_PRESETS[key]}
                alt={label}
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          <label className="text-blue-600 hover:underline cursor-pointer">
            อัปโหลดรูป
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) onChangeFile(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => {
              onChangeFile(null);
              onChangeValue(null);
            }}
            className="text-gray-500 hover:underline"
          >
            ใช้ค่าเริ่มต้น
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarPicker;
