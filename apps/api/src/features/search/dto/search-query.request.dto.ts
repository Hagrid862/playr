import { createZodDto } from "nestjs-zod";
import { SearchQuerySchema } from "@repo/contracts";

export class SearchQueryRequestDto extends createZodDto(SearchQuerySchema) {}
