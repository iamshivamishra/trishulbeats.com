import type { IBeat, IUser } from "@/types";

type PublicBeatPayload = Omit<IBeat, "audioFullUrl" | "stemsUrl" | "storageKeys">;

export function toPublicBeatPayload(beat: IBeat): PublicBeatPayload {
  const { audioFullUrl: _audioFullUrl, stemsUrl: _stemsUrl, storageKeys: _storageKeys, ...safeBeat } = beat;
  return JSON.parse(JSON.stringify(safeBeat)) as PublicBeatPayload;
}

export function toPublicBeatForUi(
  beat: IBeat,
  producer?: Pick<IUser, "displayName" | "name" | "username"> | null
): IBeat {
  const sanitized = {
    ...beat,
    audioFullUrl: "",
    stemsUrl: undefined,
    storageKeys: undefined,
    producerName: producer?.displayName || producer?.name || "Unknown Producer",
    producerUsername: producer?.username,
  };
  return JSON.parse(JSON.stringify(sanitized)) as IBeat;
}