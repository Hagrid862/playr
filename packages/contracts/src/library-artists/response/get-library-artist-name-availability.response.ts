import { z } from "zod";
import { createApiResponseSchema } from "../../api";

export const GetLibraryArtistNameAvailabilityResponseSchema =
  createApiResponseSchema(
    z.object({
      available: z.boolean(),
    }),
  );

export type GetLibraryArtistNameAvailabilityResponse = z.infer<
  typeof GetLibraryArtistNameAvailabilityResponseSchema
>;
