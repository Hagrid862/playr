import {createZodDto} from "nestjs-zod";
import { RecoverPasswordResponseSchema } from '@repo/contracts';


export class RecoverPasswordResponseDto extends createZodDto(RecoverPasswordResponseSchema) {}