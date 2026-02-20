import { z } from "zod";
import { StreamAudioQualitySchema } from "../streaming-quality";

export const GetTrackStreamQualitiesResponseSchema = z.object({
  data: z.array(StreamAudioQualitySchema),
});

export type GetTrackStreamQualitiesResponse = z.infer<
  typeof GetTrackStreamQualitiesResponseSchema
>;
