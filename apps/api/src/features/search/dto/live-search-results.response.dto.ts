import { createZodDto } from "nestjs-zod";
import { LiveSearchResultsSchema } from "@repo/contracts";

export class LiveSearchResultsResponseDto extends createZodDto(LiveSearchResultsSchema) {}
