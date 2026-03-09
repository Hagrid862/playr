import { z } from "zod";

export const GetTrackStreamQualitiesParamsSchema = z.object({
  id: z.uuid(),
});

export type GetTrackStreamQualitiesParams = z.infer<
  typeof GetTrackStreamQualitiesParamsSchema
>;
