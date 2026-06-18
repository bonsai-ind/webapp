import type { DeviceAccess } from "./device-access";
import { primaryButtonClass, secondaryButtonClass } from "../ui/forms";

export function DeviceControls({
  access,
  deviceId,
  onShare,
}: {
  access: DeviceAccess;
  deviceId: string;
  onShare: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {access.canTalk(deviceId) && (
        <button type="button" className={secondaryButtonClass}>
          Talk
        </button>
      )}
      {access.canShare(deviceId) && (
        <button type="button" onClick={onShare} className={`px-5 ${primaryButtonClass}`}>
          Share with nanny
        </button>
      )}
    </div>
  );
}
