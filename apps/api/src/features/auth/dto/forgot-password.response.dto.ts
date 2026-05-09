import {createZodDto} from "nestjs-zod";
import { ForgotPasswordResponseSchema } from '@repo/contracts';

export class ForgotPasswordResponseDto extends createZodDto(ForgotPasswordResponseSchema) {}